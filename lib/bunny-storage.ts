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

  const normalizedPath = opts.path.replace(/^\/+/, "");
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

