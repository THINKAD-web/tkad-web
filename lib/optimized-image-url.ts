/**
 * CDN 이미지 URL 최적화 — next/image 와 함께 사용.
 * Cloudinary: f_auto,q_auto,w_*
 * Bunny (*.b-cdn.net): width + quality 쿼리
 */

const CLOUDINARY_HOST = /(^|\.)res\.cloudinary\.com$/i;
const BUNNY_CDN = /\.b-cdn\.net$/i;

export type OptimizeImageOptions = {
  width?: number;
  quality?: number;
  /** 썸네일 등 — Cloudinary f_webp 강제 */
  forceWebp?: boolean;
};

export function optimizeImageUrl(
  url: string | null | undefined,
  opts: OptimizeImageOptions = {},
): string | null {
  const raw = url?.trim();
  if (!raw) return null;

  const width = opts.width ?? 800;
  const quality = opts.quality ?? 80;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();

    if (CLOUDINARY_HOST.test(host) || host.endsWith("cloudinary.com")) {
      const parts = parsed.pathname.split("/upload/");
      if (parts.length === 2) {
        const format = opts.forceWebp ? "f_webp" : "f_auto";
        const transform = `${format},q_auto,w_${width}`;
        if (!parts[1]!.startsWith("f_") && !parts[1]!.startsWith("c_")) {
          parsed.pathname = `${parts[0]}/upload/${transform}/${parts[1]}`;
          return parsed.toString();
        }
      }
      return raw;
    }

    if (BUNNY_CDN.test(host)) {
      parsed.searchParams.set("width", String(width));
      parsed.searchParams.set("quality", String(quality));
      parsed.searchParams.set("format", "webp");
      return parsed.toString();
    }
  } catch {
    return raw;
  }

  return raw;
}

/** 썸네일·카드용 (WebP는 next/image formats 설정으로 처리) */
export function optimizeThumbnailUrl(url: string | null | undefined): string | null {
  return optimizeImageUrl(url, { width: 800, quality: 80, forceWebp: true });
}

export function optimizeHeroMarqueeUrl(url: string | null | undefined): string | null {
  return optimizeImageUrl(url, { width: 480, quality: 75 });
}
