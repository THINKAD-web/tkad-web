/**
 * CDN 이미지 URL — 카탈로그/카드 표시용.
 * Bunny: 브라우저 직접 로드 (Pull Zone이 Vercel IP fetch 차단 → next/image 502 방지)
 * Cloudinary: 계정 종료로 표시 제외
 */

const CLOUDINARY_HOST = /(^|\.)res\.cloudinary\.com$/i;
const BUNNY_CDN = /\.b-cdn\.net$/i;

export type OptimizeImageOptions = {
  width?: number;
  quality?: number;
  forceWebp?: boolean;
};

export function isCloudinaryMediaUrl(url: string | null | undefined): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return CLOUDINARY_HOST.test(host) || host.endsWith("cloudinary.com");
  } catch {
    return false;
  }
}

export function isBunnyMediaUrl(url: string | null | undefined): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  try {
    return BUNNY_CDN.test(new URL(raw).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Bunny만 노출. Cloudinary(삭제됨) 등은 제외. */
export function filterDisplayableMediaImageUrls(
  urls: readonly string[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    const s = typeof u === "string" ? u.trim() : "";
    if (!s || seen.has(s) || !isBunnyMediaUrl(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function getPreferredMediaImageUrl(
  urls: readonly string[],
): string | null {
  return filterDisplayableMediaImageUrls(urls)[0] ?? null;
}

/** Bunny CDN은 next/image optimizer 우회 (서버 fetch 403/502 방지) */
export function shouldUseUnoptimizedImage(url: string | null | undefined): boolean {
  return isBunnyMediaUrl(url);
}

export type ResolvedCatalogImage = {
  src: string;
  unoptimized: boolean;
};

/** 카탈로그/카드용 src — Bunny raw URL + unoptimized, 기타는 transform 후 optimizer */
export function resolveCatalogImageSrc(
  url: string | null | undefined,
): ResolvedCatalogImage | null {
  const raw = url?.trim();
  if (!raw || isCloudinaryMediaUrl(raw)) return null;
  if (isBunnyMediaUrl(raw)) {
    return { src: raw, unoptimized: true };
  }
  const optimized = optimizeImageUrl(raw, { width: 800, quality: 80, forceWebp: true });
  return optimized ? { src: optimized, unoptimized: false } : null;
}

export function optimizeImageUrl(
  url: string | null | undefined,
  opts: OptimizeImageOptions = {},
): string | null {
  const raw = url?.trim();
  if (!raw || isCloudinaryMediaUrl(raw)) return null;

  const width = opts.width ?? 800;
  const quality = opts.quality ?? 80;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();

    if (isBunnyMediaUrl(raw)) {
      return raw;
    }

    if (CLOUDINARY_HOST.test(host) || host.endsWith("cloudinary.com")) {
      return null;
    }
  } catch {
    return raw;
  }

  return raw;
}

export function optimizeThumbnailUrl(url: string | null | undefined): string | null {
  return resolveCatalogImageSrc(url)?.src ?? null;
}

export function optimizeHeroMarqueeUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw || isCloudinaryMediaUrl(raw)) return null;
  if (isBunnyMediaUrl(raw)) return raw;
  return optimizeImageUrl(raw, { width: 480, quality: 75 });
}
