/**
 * 서버(jsPDF)에서 매체 이미지를 data URL 로 가져온다.
 *
 * 문제 배경: `resolvePublicMediaImageUrl` 은 BunnyCDN 이미지를 same-origin
 * 상대경로(`/api/bunny-media/...`)로 바꾼다. 브라우저에선 동작하지만 서버에서
 * 상대경로 `fetch()` 는 실패한다 → PDF 에 사진이 비는 원인.
 *
 * 해결: 상대경로는 `siteUrl` 을 붙여 절대화하고, 그래도 실패하면 원본 CDN URL
 * 로 직접 시도한다.
 */
import { siteUrl } from "@/lib/seo";
import {
  isCloudinaryMediaUrl,
  isBunnyMediaUrl,
  resolvePublicMediaImageUrl,
} from "@/lib/optimized-image-url";

async function fetchAsDataUrl(
  url: string,
  headers?: Record<string, string>,
): Promise<string | null> {
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "image/jpeg")
      .split(";")[0]!
      .trim();
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return null;
    return `data:${ct};base64,${buf.toString("base64")}`;
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

  // 1) 표시용 해석 URL (Bunny → /api/bunny-media/... 상대경로 가능)
  const resolved = resolvePublicMediaImageUrl(raw);
  if (resolved) {
    const target = resolved.startsWith("/") ? `${siteUrl}${resolved}` : resolved;
    const d = await fetchAsDataUrl(target);
    if (d) return d;
  }

  // 2) 원본이 절대 URL 이면 직접 시도 (Bunny pull zone 등)
  if (/^https?:\/\//i.test(raw) && raw !== resolved) {
    const d = await fetchAsDataUrl(raw);
    if (d) return d;
  }

  return null;
}

export { isBunnyMediaUrl };
