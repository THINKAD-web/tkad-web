import type { MediaItem } from "@/lib/media-data";
import { typeLabels } from "@/lib/media-data";
import {
  buildMediaPageTitle,
  formatMediaSeoMonthlyPriceLabel,
} from "@/lib/media-seo";
import { mediaPriceOnInquiryLabel } from "@/lib/media-price-format";
import { isBunnyMediaUrl } from "@/lib/optimized-image-url";
import { ogImageUrl, siteUrl } from "@/lib/seo";

const DEFAULT_MEDIA_OG_IMAGE = ogImageUrl("/opengraph-image");

type MediaWithOptionalThumb = MediaItem & {
  thumbnailUrl?: string | null;
  images?: string[] | null;
};

function pickRawMediaImageUrl(media: MediaWithOptionalThumb): string | null {
  const thumb = media.thumbnailUrl?.trim();
  if (thumb) return thumb;
  const first = media.images?.[0]?.trim() ?? media.sampleImages?.[0]?.trim();
  if (first) return first;
  return null;
}

/**
 * OG/Twitter용 절대 이미지 URL.
 * - Bunny CDN(https://…b-cdn.net)은 원본 URL 그대로
 * - 상대경로(/…, /api/bunny-media/…)는 siteUrl 기준 절대경로
 */
export function resolveMediaOgImageUrl(media: MediaItem): string {
  const raw = pickRawMediaImageUrl(media as MediaWithOptionalThumb);
  if (!raw) return DEFAULT_MEDIA_OG_IMAGE;

  if (/^https?:\/\//i.test(raw)) {
    if (isBunnyMediaUrl(raw) || !raw.includes("/api/bunny-media/")) {
      return raw;
    }
  }

  const origin = siteUrl.replace(/\/$/, "");
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw}`;
}

export function buildMediaOgTitle(media: MediaItem, locale: string): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  return buildMediaPageTitle(media, locale, isKo ? "옥외광고" : "OOH pricing");
}

export function buildMediaOgDescription(media: MediaItem, locale: string): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const region = media.region || media.city || "";
  const tl = typeLabels[media.type];
  const typeStr = tl ? (isKo ? tl.ko : tl.en) : media.type || "";
  const address = isKo
    ? media.location
    : media.locationEn || media.location || "";
  const pricePart =
    formatMediaSeoMonthlyPriceLabel(media, locale) ||
    mediaPriceOnInquiryLabel(locale);

  const parts = [region, typeStr, isKo ? "광고 매체" : "OOH media", address, pricePart]
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.join(" · ");
}

export function buildMediaOgShortDescription(
  media: MediaItem,
  locale: string,
): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const region = media.region || media.city || "";
  const tl = typeLabels[media.type];
  const typeStr = tl ? (isKo ? tl.ko : tl.en) : media.type || "";
  return `${region} ${typeStr} ${isKo ? "광고 매체" : "OOH media"}`.trim();
}
