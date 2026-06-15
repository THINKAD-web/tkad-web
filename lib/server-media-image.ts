/**
 * 서버(jsPDF/pptxgenjs)에서 매체 이미지를 data URL 로 가져온다.
 *
 * 우선순위:
 * 1) Bunny Storage API 직접 (CDN·자기 자신 /api/bunny-media 우회)
 * 2) 절대 URL fetch (/api/bunny-media → siteUrl, Bunny CDN 등)
 * 3) 원본 절대 CDN URL 재시도
 */
import { isBunnyStorageConfigured } from "@/lib/bunny-storage";
import { siteUrl } from "@/lib/seo";
import {
  bunnyObjectPathFromPublicUrl,
  isCloudinaryMediaUrl,
  isBunnyMediaUrl,
  resolvePublicMediaImageUrl,
} from "@/lib/optimized-image-url";

type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function sniffImageMime(buf: Buffer): ImageMime | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buf.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return null;
}

function bufferToDataUrl(buf: Buffer, contentTypeHint?: string | null): string | null {
  if (buf.length === 0) return null;
  const sniffed = sniffImageMime(buf);
  const hinted =
    contentTypeHint?.split(";")[0]?.trim().startsWith("image/")
      ? (contentTypeHint.split(";")[0]!.trim() as ImageMime)
      : null;
  const mime = sniffed ?? hinted;
  if (!mime) return null;
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function fetchFromBunnyStorage(objectPath: string): Promise<string | null> {
  if (!isBunnyStorageConfigured()) return null;
  const zone = process.env.BUNNY_STORAGE_ZONE!.trim();
  const key = process.env.BUNNY_STORAGE_API_KEY!.trim();
  const host =
    process.env.BUNNY_STORAGE_HOST?.trim() || "https://storage.bunnycdn.com";
  const base = host.replace(/\/+$/, "");
  const fetchUrl = `${base}/${encodeURIComponent(zone)}/${objectPath}`;

  try {
    const res = await fetch(fetchUrl, {
      headers: { AccessKey: key },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return bufferToDataUrl(buf, res.headers.get("content-type"));
  } catch {
    return null;
  }
}

function bunnyPathFromInput(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.startsWith("/api/bunny-media/")) {
    return decodeURIComponent(trimmed.slice("/api/bunny-media/".length));
  }
  return bunnyObjectPathFromPublicUrl(trimmed);
}

async function fetchAsDataUrl(
  url: string,
  headers?: Record<string, string>,
): Promise<string | null> {
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return bufferToDataUrl(buf, res.headers.get("content-type"));
  } catch {
    return null;
  }
}

/** 매체 이미지 URL → data URL (서버 임베드용). 실패 시 null. */
export async function fetchMediaImageDataUrl(
  url: string | null | undefined,
): Promise<string | null> {
  const raw = url?.trim();
  if (!raw || isCloudinaryMediaUrl(raw)) return null;

  // 1) Bunny Storage API (가장 안정 — 핫링크·Vercel 자기호출 우회)
  const storagePath = bunnyPathFromInput(raw);
  if (storagePath) {
    const fromStorage = await fetchFromBunnyStorage(storagePath);
    if (fromStorage) return fromStorage;
  }

  // 2) 표시용 해석 URL (Bunny → /api/bunny-media/... 상대경로 가능)
  const resolved = resolvePublicMediaImageUrl(raw);
  if (resolved) {
    const target = resolved.startsWith("/")
      ? `${siteUrl.replace(/\/$/, "")}${resolved}`
      : resolved;
    const d = await fetchAsDataUrl(target);
    if (d) return d;
  }

  // 3) 원본 절대 URL 직접 (Bunny pull zone 등)
  if (/^https?:\/\//i.test(raw)) {
    const d = await fetchAsDataUrl(raw);
    if (d) return d;
  }

  // 4) 상대 프록시만 넘어온 경우 (클라이언트 payload)
  if (raw.startsWith("/api/bunny-media/")) {
    const d = await fetchAsDataUrl(`${siteUrl.replace(/\/$/, "")}${raw}`);
    if (d) return d;
  }

  return null;
}

export { isBunnyMediaUrl };
