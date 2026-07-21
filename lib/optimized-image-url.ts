/**
 * CDN 이미지 URL — 카탈로그/카드/상세 표시용.
 * Bunny Pull Zone: 브라우저 직링크 우선(Strategy A, unoptimized).
 * /api/bunny-media 프록시는 onError fallback·admin·PDF 전용.
 * Cloudinary: 계정 종료로 표시 제외.
 */

import {
  buildBunnyCdnUrl,
  isBunnyStorageConfigured,
} from "@/lib/bunny-storage";

const CLOUDINARY_HOST = /(^|\.)res\.cloudinary\.com$/i;
const BUNNY_CDN = /\.b-cdn\.net$/i;

/**
 * Fix common bad DB/import prefixes (`hthttps://`, duplicated schemes).
 * Returns null when the string cannot be used as a URL.
 */
export function sanitizeMediaImageUrl(
  url: string | null | undefined,
): string | null {
  let raw = url?.trim();
  if (!raw) return null;

  // same-origin Bunny proxy (legacy DB / onError fallback)
  if (raw.startsWith("/api/bunny-media/")) {
    return raw;
  }

  // hthttps:// → https://
  raw = raw.replace(/^ht+(?=https?:\/\/)/i, "");
  // httpshttps:// → https://
  raw = raw.replace(/^(https?:\/\/)(?:https?:\/\/)+/i, "$1");

  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    if (/b-cdn\.net/i.test(raw)) {
      raw = `https://${raw.replace(/^\/+/, "")}`;
    } else if (/^tkad\//i.test(raw.replace(/^\/+/, ""))) {
      const cdnUrl = buildBunnyCdnUrl(raw.replace(/^\/+/, ""));
      if (!cdnUrl) return null;
      raw = cdnUrl;
    } else {
      return null;
    }
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export type OptimizeImageOptions = {
  width?: number;
  quality?: number;
  forceWebp?: boolean;
};

export function isCloudinaryMediaUrl(url: string | null | undefined): boolean {
  const raw = sanitizeMediaImageUrl(url);
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return CLOUDINARY_HOST.test(host) || host.endsWith("cloudinary.com");
  } catch {
    return false;
  }
}

export function isBunnyMediaUrl(url: string | null | undefined): boolean {
  const raw = sanitizeMediaImageUrl(url);
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

/** Bunny CDN URL → 스토리지 존 내 object path (`URL.pathname` — 이미 percent-encoded) */
export function bunnyObjectPathFromPublicUrl(
  url: string | null | undefined,
): string | null {
  const raw = sanitizeMediaImageUrl(url);
  if (!raw || !isBunnyMediaUrl(raw)) return null;
  try {
    const path = new URL(raw).pathname.replace(/^\/+/, "");
    return path || null;
  } catch {
    return null;
  }
}

/**
 * pathname / 프록시 path 세그먼트를 스토리지 키용 유니코드로 복원.
 * 이미 디코딩된 세그먼트는 그대로 둔다 (한글·공백 NFD 포함).
 */
export function decodeBunnyPathSegments(segments: readonly string[]): string[] {
  return segments
    .map((s) => s.trim())
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
}

/** 디코딩된 스토리지 키 세그먼트 → `/api/bunny-media/...` 용 단일 percent-encoding */
export function encodeBunnyProxyPathSegments(
  decodedSegments: readonly string[],
): string {
  return decodedSegments.map((segment) => encodeURIComponent(segment)).join("/");
}

/**
 * Pull Zone 장애 시 Storage API same-origin 프록시 URL (onError fallback 전용).
 * `URL.pathname`은 이미 인코딩되어 있으므로 decode → encode 한 번만 수행해
 * `%25E1...` 이중 인코딩을 막는다. App Router `[...path]` 디코딩과 짝을 맞춤.
 */
export function buildBunnyMediaProxyUrl(
  url: string | null | undefined,
): string | null {
  if (!isBunnyStorageConfigured()) return null;
  const path = bunnyObjectPathFromPublicUrl(url);
  if (!path) return null;
  const decoded = decodeBunnyPathSegments(path.split("/"));
  if (decoded.length === 0) return null;
  return `/api/bunny-media/${encodeBunnyProxyPathSegments(decoded)}`;
}

/** CDN 로드 실패 시 onError에서 호출 — 프록시 fallback URL (없으면 null) */
export function bunnyCdnToProxyFallback(
  currentSrc: string | null | undefined,
): string | null {
  const raw = sanitizeMediaImageUrl(currentSrc);
  if (!raw || isBunnyMediaProxyPath(raw) || !isBunnyMediaUrl(raw)) {
    return null;
  }
  return buildBunnyMediaProxyUrl(raw);
}

/** Same-origin Bunny proxy — bypass `/_next/image` (App Router image handler 미호환) */
export function isBunnyMediaProxyPath(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith("/api/bunny-media/");
}

/** Strategy A: Bunny CDN·프록시는 브라우저 직접 로드 (Vercel 함수·optimizer 미사용) */
export function shouldUseUnoptimizedImage(url: string | null | undefined): boolean {
  const raw = sanitizeMediaImageUrl(url?.trim() ?? null);
  if (!raw) {
    const trimmed = url?.trim() ?? "";
    return isBunnyMediaProxyPath(trimmed);
  }
  return isBunnyMediaProxyPath(raw) || isBunnyMediaUrl(raw);
}

/** 공개 표시용 — Bunny CDN 직링크, Cloudinary 제외 */
export function resolvePublicMediaImageUrl(
  url: string | null | undefined,
): string | null {
  const raw = sanitizeMediaImageUrl(url);
  if (!raw || isCloudinaryMediaUrl(raw)) return null;
  return raw;
}

export type ResolvedCatalogImage = {
  src: string;
  unoptimized: boolean;
};

const CATALOG_CARD_WIDTH = 400;

/** 카탈로그/카드용 src — Bunny CDN 직링크 + unoptimized (Strategy A) */
export function resolveCatalogImageSrc(
  url: string | null | undefined,
  opts?: { width?: number },
): ResolvedCatalogImage | null {
  const cardWidth = opts?.width ?? CATALOG_CARD_WIDTH;
  const trimmed = url?.trim();
  if (!trimmed || isCloudinaryMediaUrl(trimmed)) return null;

  const raw = sanitizeMediaImageUrl(trimmed);
  if (raw) {
    if (isBunnyMediaProxyPath(raw) || isBunnyMediaUrl(raw)) {
      return { src: raw, unoptimized: true };
    }
  } else if (isBunnyMediaProxyPath(trimmed)) {
    return { src: trimmed, unoptimized: true };
  } else if (trimmed.startsWith("/")) {
    return { src: trimmed, unoptimized: false };
  }

  const optimized = optimizeImageUrl(trimmed, {
    width: cardWidth,
    quality: 80,
    forceWebp: true,
  });
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
  const trimmed = url?.trim();
  if (!trimmed || isCloudinaryMediaUrl(trimmed)) return null;

  const cdn = sanitizeMediaImageUrl(trimmed);
  if (cdn && isBunnyMediaUrl(cdn)) return cdn;
  if (isBunnyMediaProxyPath(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;

  return optimizeImageUrl(trimmed, { width: 480, quality: 75 });
}
