/**
 * @deprecated Prefer `fetchActiveMediaPackages` / package detail API.
 * Resolves legacy `data/packages.ts` editorial packs against catalog `mediaIds`.
 * Public listing SSOT is DB/seed (`lib/media-package-db.ts`).
 */
import {
  MEDIA_PACKAGES,
  type MediaPackageDefinition,
  type PackageIndustryBadge,
  getMediaPackageBySlug,
} from "@/data/packages";
import type { MediaItem } from "@/lib/media-data";
import {
  resolveMonthlyImpressions,
  resolveMonthlyListPriceWon,
} from "@/lib/media-metrics";
import { formatMediaPriceWonWithSymbol } from "@/lib/media-price-format";

export type ResolvedMediaPackage = MediaPackageDefinition & {
  media: MediaItem[];
  missingIds: string[];
  mediaCount: number;
  totalMonthlyImpressions: number;
  priceRangeWon: { min: number; max: number };
  priceRangeLabelKo: string;
  priceRangeLabelEn: string;
  reachLabelKo: string;
  reachLabelEn: string;
};

function monthlyImpressionsForMedia(m: MediaItem): number {
  return resolveMonthlyImpressions(m);
}

/** 패키지 가격 범위 — 목록 SSOT와 동일 월환산 (cheapest display × 기간 배수). */
function monthlyPriceWonForMedia(m: MediaItem): number {
  return resolveMonthlyListPriceWon(m);
}

function formatReachCompact(n: number, isKo: boolean): string {
  if (n <= 0) return isKo ? "문의" : "On request";
  if (n >= 100_000_000) {
    const v = (n / 100_000_000).toFixed(1).replace(/\.0$/, "");
    return isKo ? `월 약 ${v}억 노출` : `~${v}00M imp./mo`;
  }
  if (n >= 10_000) {
    const v = Math.round(n / 10_000);
    return isKo ? `월 약 ${v.toLocaleString("ko-KR")}만 노출` : `~${(n / 1_000_000).toFixed(1)}M imp./mo`;
  }
  return isKo
    ? `월 약 ${n.toLocaleString("ko-KR")} 노출`
    : `~${n.toLocaleString("en-US")} imp./mo`;
}

function formatPriceRangeLabel(min: number, max: number, isKo: boolean): string {
  if (min <= 0 && max <= 0) return isKo ? "맞춤 견적" : "Custom quote";
  if (min === max) {
    return isKo
      ? `월 ${formatMediaPriceWonWithSymbol(min, "ko-KR")}대`
      : `From ${formatMediaPriceWonWithSymbol(min, "en-US")}/mo`;
  }
  return isKo
    ? `월 ${formatMediaPriceWonWithSymbol(min, "ko-KR")} ~ ${formatMediaPriceWonWithSymbol(max, "ko-KR")}`
    : `${formatMediaPriceWonWithSymbol(min, "en-US")} – ${formatMediaPriceWonWithSymbol(max, "en-US")}/mo`;
}

export function resolveMediaPackage(
  pkg: MediaPackageDefinition,
  catalog: MediaItem[],
): ResolvedMediaPackage {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const media: MediaItem[] = [];
  const missingIds: string[] = [];
  for (const id of pkg.mediaIds) {
    const m = byId.get(id);
    if (m) media.push(m);
    else missingIds.push(id);
  }

  const prices = media.map(monthlyPriceWonForMedia).filter((p) => p > 0);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? prices.reduce((a, b) => a + b, 0) : 0;
  const totalMonthlyImpressions = media.reduce(
    (sum, m) => sum + monthlyImpressionsForMedia(m),
    0,
  );

  return {
    ...pkg,
    media,
    missingIds,
    mediaCount: media.length,
    totalMonthlyImpressions,
    priceRangeWon: { min, max },
    priceRangeLabelKo: formatPriceRangeLabel(min, max, true),
    priceRangeLabelEn: formatPriceRangeLabel(min, max, false),
    reachLabelKo: formatReachCompact(totalMonthlyImpressions, true),
    reachLabelEn: formatReachCompact(totalMonthlyImpressions, false),
  };
}

export function resolveAllMediaPackages(
  catalog: MediaItem[],
): ResolvedMediaPackage[] {
  return [...MEDIA_PACKAGES]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => resolveMediaPackage(p, catalog));
}

export { buildPackageContactHref } from "@/lib/media-package-url";

export { getMediaPackageBySlug, type PackageIndustryBadge };
