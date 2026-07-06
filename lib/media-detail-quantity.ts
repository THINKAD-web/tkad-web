import type { MediaItem, MediaPriceOption } from "@/lib/media-data";
import {
  calculateMediaQuoteByDays,
  calculateMediaQuoteFromOption,
  type MediaQuoteLine,
} from "@/lib/compare-quote";
import {
  getQuantityUnitMode,
  isMobileSingleMedia,
  isQuantitySelectableMedia,
  resolveImpressionsForUnits,
  resolveMediaQuantity,
  resolveMonthlyPriceForUnits,
} from "@/lib/media-quantity";

export type MediaDetailQuoteOpts = {
  units?: number;
  priceOptionIndex?: number;
};

/** 매체 상세 스티키 패널 — 수량·패키지 옵션 반영 견적 */
export function calculateMediaDetailQuote(
  media: MediaItem,
  durationDays: number,
  opts?: MediaDetailQuoteOpts,
): MediaQuoteLine {
  const days = Math.max(1, Math.round(durationDays));
  const mode = getQuantityUnitMode(media);
  const poIdx = opts?.priceOptionIndex ?? 0;

  if (mode === "package" && (media.priceOptions?.length ?? 0) > 0) {
    const opt =
      media.priceOptions?.[poIdx] ?? media.priceOptions?.[0];
    if (opt) return calculateMediaQuoteFromOption(media, opt, days);
  }

  const units = resolveMediaQuantity(media, opts?.units);
  if (isMobileSingleMedia(media) && units > 1) {
    const monthlyWon = resolveMonthlyPriceForUnits(media, units);
    const costWon = Math.round(monthlyWon * (days / 30));
    const monthlyImp = resolveImpressionsForUnits(media, units);
    const impressions = Math.round(monthlyImp * (days / 30));
    const cpm =
      impressions > 0 ? Math.round(costWon / (impressions / 1000)) : null;
    return {
      mediaId: media.id,
      name: media.name,
      costWon,
      impressions,
      cpm,
    };
  }

  return calculateMediaQuoteByDays(media, days);
}

export function shouldShowMediaDetailQuantityControl(
  media: MediaItem,
): boolean {
  return isQuantitySelectableMedia(media);
}

export function buildMediaDetailQuoteHref(
  media: MediaItem,
  opts: {
    priceOptionIndex?: number;
    units?: number;
    period?: string;
  },
): string {
  const q = new URLSearchParams();
  q.set("media", media.id);
  if (opts.priceOptionIndex != null && opts.priceOptionIndex > 0) {
    q.set("po", String(opts.priceOptionIndex));
  }
  if (opts.period) q.set("period", opts.period);
  const u = opts.units ?? resolveMediaQuantity(media);
  if (u > 1) q.set("units", String(u));
  return `/quote?${q.toString()}`;
}

export function buildMediaDetailPlannerHref(
  mediaId: string,
  units?: number,
): string {
  const q = new URLSearchParams();
  q.set("addMedia", mediaId);
  if (units != null && units > 1) q.set("units", String(units));
  return `/planner?${q.toString()}`;
}

export function networkDetailToMediaItem(
  data: {
    catalogId: string;
    name: string;
    nameEn: string | null;
    type: string;
    totalLocations: number;
    minUnits: number;
    pricePerUnit: number | null;
    pricePackage: number | null;
    tiers: { units: number; price: number }[];
    locations?: { unitCount?: number | null }[];
  },
): MediaItem {
  return {
    id: data.catalogId,
    name: data.name,
    nameEn: data.nameEn ?? data.name,
    location: "",
    locationEn: "",
    region: "",
    type: "network",
    price: data.pricePackage ?? data.pricePerUnit ?? 0,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: [],
    catalogSource: "network",
    networkSubtype: data.type,
    networkTotalLocations: data.totalLocations,
    networkMinUnits: data.minUnits,
    networkPricePerUnit: data.pricePerUnit,
    networkPricePackage: data.pricePackage,
    networkPackageTiers: data.tiers,
    networkLocations: (data.locations ?? []).map((l) => ({
      name: "",
      address: "",
      regionMain: "",
      unitCount: l.unitCount ?? 1,
    })),
  };
}

export function selectedPriceOption(
  media: MediaItem,
  priceOptionIndex: number,
): MediaPriceOption | undefined {
  const opts = media.priceOptions ?? [];
  if (opts.length === 0) return undefined;
  const idx = Math.min(Math.max(0, priceOptionIndex), opts.length - 1);
  return opts[idx];
}
