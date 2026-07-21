import { assertAsciiBunnyObjectPath } from "@/lib/bunny-upload-path";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

function bunnyStorageBaseUrl(): string {
  // Bunny Storage API default host
  const host =
    process.env.BUNNY_STORAGE_HOST?.trim() || "https://storage.bunnycdn.com";
  return host.replace(/\/+$/, "");
}

export type BunnyStorageConfigStatus = {
  configured: boolean;
  missingEnvVars: string[];
};

export function getBunnyStorageConfigStatus(): BunnyStorageConfigStatus {
  const missingEnvVars: string[] = [];
  if (!process.env.BUNNY_STORAGE_ZONE?.trim()) {
    missingEnvVars.push("BUNNY_STORAGE_ZONE");
  }
  if (!process.env.BUNNY_STORAGE_API_KEY?.trim()) {
    missingEnvVars.push("BUNNY_STORAGE_API_KEY");
  }
  if (!process.env.BUNNY_CDN_BASE_URL?.trim()) {
    missingEnvVars.push("BUNNY_CDN_BASE_URL");
  }
  return {
    configured: missingEnvVars.length === 0,
    missingEnvVars,
  };
}

export function isBunnyStorageConfigured(): boolean {
  return getBunnyStorageConfigStatus().configured;
}

/** Pathname prefix inside BUNNY_CDN_BASE_URL (e.g. `tkad`), excluding leading/trailing slashes. */
function cdnBasePathPrefix(cdnBase: string): string {
  try {
    return new URL(cdnBase).pathname.replace(/^\/+|\/+$/g, "");
  } catch {
    const schemeEnd = cdnBase.indexOf("//");
    if (schemeEnd < 0) return "";
    const pathStart = cdnBase.indexOf("/", schemeEnd + 2);
    if (pathStart < 0) return "";
    return cdnBase.slice(pathStart).replace(/^\/+|\/+$/g, "");
  }
}

function objectPathStartsWithBasePrefix(
  basePathPrefix: string,
  objectPath: string,
): boolean {
  if (!basePathPrefix) return false;
  return (
    objectPath === basePathPrefix ||
    objectPath.startsWith(`${basePathPrefix}/`)
  );
}

/** Pull Zone CDN URL for a storage-zone object path */
export function buildBunnyCdnUrl(objectPath: string): string | null {
  const cdnBase = process.env.BUNNY_CDN_BASE_URL?.trim();
  if (!cdnBase) return null;
  const normalized = objectPath.replace(/^\/+/, "");
  if (!normalized) return null;

  const basePathPrefix = cdnBasePathPrefix(cdnBase);
  if (objectPathStartsWithBasePrefix(basePathPrefix, normalized)) {
    try {
      return `${new URL(cdnBase).origin}/${normalized}`;
    } catch {
      // Non-URL cdnBase — fall through to joinUrl.
    }
  }

  return joinUrl(cdnBase, normalized);
}

export type BunnyUploadResult = {
  publicUrl: string;
  path: string;
};

export async function uploadToBunnyStorage(opts: {
  path: string; // path inside the storage zone
  bytes: ArrayBuffer;
  contentType?: string;
}): Promise<BunnyUploadResult> {
  const zone = process.env.BUNNY_STORAGE_ZONE?.trim();
  const key = process.env.BUNNY_STORAGE_API_KEY?.trim();
  const cdnBase = process.env.BUNNY_CDN_BASE_URL?.trim();
  if (!zone || !key || !cdnBase) {
    throw new Error("BUNNY_STORAGE_NOT_CONFIGURED");
  }

  // 한글 NFD 등 비ASCII 키 차단 — 모든 Bunny PUT이 UUID/ASCII 경로를 거치게
  const normalizedPath = assertAsciiBunnyObjectPath(opts.path);
  const putUrl = `${bunnyStorageBaseUrl()}/${encodeURIComponent(zone)}/${normalizedPath}`;

  const res = await fetch(putUrl, {
    method: "PUT",
    headers: {
      AccessKey: key,
      "Content-Type": opts.contentType || "application/octet-stream",
    },
    body: Buffer.from(opts.bytes),
    // Bunny is an external API; never cache.
    cache: "no-store",
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`BUNNY_UPLOAD_FAILED:${res.status}:${t.slice(0, 200)}`);
  }

  return {
    path: normalizedPath,
    publicUrl: joinUrl(cdnBase, normalizedPath),
  };
}

/** CDN 공개 URL → 스토리지 존 내 경로 (삭제용) */
export function bunnyPathFromPublicUrl(publicUrl: string): string | null {
  const cdnBase = process.env.BUNNY_CDN_BASE_URL?.trim()?.replace(/\/+$/, "");
  if (!cdnBase || !publicUrl.startsWith(cdnBase)) return null;
  const path = publicUrl.slice(cdnBase.length).replace(/^\/+/, "");
  return path || null;
}

/** 매체 `image` + `extractedImages` 에서 고유 URL 목록 */
export function collectMediaImageUrls(
  image: string | null | undefined,
  extractedImages: string[] | null | undefined,
): string[] {
  const urls = new Set<string>();
  const primary = image?.trim();
  if (primary) urls.add(primary);
  for (const raw of extractedImages ?? []) {
    const u = raw?.trim();
    if (u) urls.add(u);
  }
  return [...urls];
}

/** 저장 후 Bunny 에서만 제거할 URL (다른 매체가 쓰는 URL 은 호출 측에서 제외) */
export function bunnyPublicUrlsRemoved(
  previous: string[],
  next: string[],
): string[] {
  const nextSet = new Set(next.map((u) => u.trim()).filter(Boolean));
  return previous.filter((u) => {
    const t = u.trim();
    return t && !nextSet.has(t) && bunnyPathFromPublicUrl(t) != null;
  });
}

/** Bunny CDN 자산 URL 일괄 삭제 (실패 시 로그만, throw 안 함) */
export async function deleteBunnyPublicUrls(urls: string[]): Promise<void> {
  if (!isBunnyStorageConfigured() || urls.length === 0) return;
  for (const url of urls) {
    const path = bunnyPathFromPublicUrl(url);
    if (!path) continue;
    try {
      await deleteFromBunnyStorage(path);
    } catch (e) {
      console.warn("[bunny-storage] delete skipped", { url, path, err: e });
    }
  }
}

export async function deleteFromBunnyStorage(path: string): Promise<void> {
  const zone = process.env.BUNNY_STORAGE_ZONE?.trim();
  const key = process.env.BUNNY_STORAGE_API_KEY?.trim();
  if (!zone || !key) {
    throw new Error("BUNNY_STORAGE_NOT_CONFIGURED");
  }
  const normalizedPath = path.replace(/^\/+/, "");
  const delUrl = `${bunnyStorageBaseUrl()}/${encodeURIComponent(zone)}/${normalizedPath}`;

  const res = await fetch(delUrl, {
    method: "DELETE",
    headers: { AccessKey: key },
    cache: "no-store",
  });

  if (!res.ok && res.status !== 404) {
    const t = await res.text().catch(() => "");
    throw new Error(`BUNNY_DELETE_FAILED:${res.status}:${t.slice(0, 200)}`);
  }
}

