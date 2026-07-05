/**
 * CDN 이미지 URL — 카탈로그/카드/상세 표시용.
 * Bunny Pull Zone 미설정(403) 시 Storage API 프록시(/api/bunny-media)로 제공.
 * Cloudinary: 계정 종료로 표시 제외.
 */

import { isBunnyStorageConfigured } from "@/lib/bunny-storage";

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

  // same-origin Bunny proxy (already resolved for cards)
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

/** Bunny CDN URL → 스토리지 존 내 object path */
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

/** Pull Zone 장애 시 Storage API same-origin 프록시 URL */
export function buildBunnyMediaProxyUrl(
  url: string | null | undefined,
): string | null {
  if (!isBunnyStorageConfigured()) return null;
  const path = bunnyObjectPathFromPublicUrl(url);
  if (!path) return null;
  const encoded = path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/api/bunny-media/${encoded}`;
}

/** @deprecated Prefer resolveCatalogImageSrc — catalog images use next/image optimizer */
export function shouldUseUnoptimizedImage(_url: string | null | undefined): boolean {
  return false;
}

/** 공개 표시용 — Bunny는 프록시 우선, Cloudinary 제외 */
export function resolvePublicMediaImageUrl(
  url: string | null | undefined,
): string | null {
  const raw = sanitizeMediaImageUrl(url);
  if (!raw || isCloudinaryMediaUrl(raw)) return null;
  if (isBunnyMediaUrl(raw)) {
    return buildBunnyMediaProxyUrl(raw) ?? raw;
  }
  return raw;
}

export type ResolvedCatalogImage = {
  src: string;
  unoptimized: boolean;
};

const CATALOG_CARD_WIDTH = 400;

/** 카탈로그/카드용 src — Bunny는 same-origin 프록시 우선, next/image로 리사이즈 */
export function resolveCatalogImageSrc(
  url: string | null | undefined,
  opts?: { width?: number },
): ResolvedCatalogImage | null {
  const cardWidth = opts?.width ?? CATALOG_CARD_WIDTH;
  const raw = sanitizeMediaImageUrl(url);
  if (!raw || isCloudinaryMediaUrl(raw)) return null;
  if (raw.startsWith("/api/bunny-media/")) {
    return { src: raw, unoptimized: false };
  }
  if (isBunnyMediaUrl(raw)) {
    const src = buildBunnyMediaProxyUrl(raw) ?? raw;
    return { src, unoptimized: false };
  }
  const optimized = optimizeImageUrl(raw, {
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
  const raw = url?.trim();
  if (!raw || isCloudinaryMediaUrl(raw)) return null;
  if (isBunnyMediaUrl(raw)) {
    return buildBunnyMediaProxyUrl(raw) ?? raw;
  }
  return optimizeImageUrl(raw, { width: 480, quality: 75 });
}
