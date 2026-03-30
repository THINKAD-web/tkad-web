import type { MediaItem } from "@/lib/media-data";

export type MediaSizeTier = "small" | "medium" | "large";
export type ResolutionBucket = "hd" | "fhd" | "fourk";
export type OperatingHoursBucket = "24h" | "day" | "night";

export type MediaAdvancedFilterState = {
  priceMin: number;
  priceMax: number;
  footMin: number;
  footMax: number;
  visibilityMin: number;
  visibilityMax: number;
  sizeTier: "all" | MediaSizeTier;
  resolutionPick: Partial<Record<ResolutionBucket, boolean>>;
  hoursBucket: "all" | OperatingHoursBucket;
  installYearMin: number;
  installYearMax: number;
  advertiserQuery: string;
};

function parseM2FromSize(size: string | undefined): number | null {
  if (!size) return null;
  const m2 = size.match(/([\d,]+(?:\.\d+)?)\s*㎡/);
  if (m2) return Number(m2[1].replace(/,/g, ""));
  return null;
}

function parseMetersProduct(size: string | undefined): number | null {
  if (!size) return null;
  const re =
    /(\d+(?:\.\d+)?)\s*m\s*[×x]\s*(\d+(?:\.\d+)?)\s*m/i;
  const m = size.match(re);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a * b;
}

function maxPixelsFromResolution(res: string | undefined): number | null {
  if (!res) return null;
  const norm = res.replace(/,/g, "");
  const pairs = [...norm.matchAll(/(\d{3,5})\s*[×x]\s*(\d{3,5})/gi)];
  let best = 0;
  for (const p of pairs) {
    const a = Number(p[1]);
    const b = Number(p[2]);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      best = Math.max(best, a, b);
    }
  }
  return best > 0 ? best : null;
}

/** Heuristic physical / pixel tier for filter chips. */
export function inferMediaSizeTier(m: MediaItem): MediaSizeTier | null {
  const s = (m.size ?? "").toLowerCase();
  if (/대형|xlarge|루프|타워|최대|거대|외벽/.test(s) && !/소형/.test(s)) {
    return "large";
  }
  if (/소형|small|did 멀티|스크린 도어|스크린도어/.test(s)) return "small";
  if (/중형|medium/.test(s)) return "medium";

  const m2 = parseM2FromSize(m.size);
  if (m2 != null) {
    if (m2 < 40) return "small";
    if (m2 < 200) return "medium";
    return "large";
  }

  const prod = parseMetersProduct(m.size);
  if (prod != null) {
    if (prod < 40) return "small";
    if (prod < 200) return "medium";
    return "large";
  }

  const px = maxPixelsFromResolution(m.resolution);
  if (px != null) {
    if (px < 1600) return "small";
    if (px < 3200) return "medium";
    return "large";
  }

  return null;
}

export function inferResolutionBuckets(m: MediaItem): ResolutionBucket[] {
  const t = `${m.resolution ?? ""} ${m.features ?? ""}`.toLowerCase();
  const out = new Set<ResolutionBucket>();
  if (/\b4k\b|2160|3840|uhd|8k|6k|4k\s*기반/.test(t)) out.add("fourk");
  if (/1080|1920|fhd|full\s*hd|fullhd/.test(t)) out.add("fhd");
  if (/\b720\b|1280|1366|\bhd\b/.test(t)) out.add("hd");
  if (out.size === 0 && /고해상도|high\s*res/.test(t)) out.add("fhd");
  return [...out];
}

export function inferOperatingHoursBucket(
  m: MediaItem,
): OperatingHoursBucket | null {
  const t = `${m.operatingHours ?? ""} ${m.operatingHoursEn ?? ""}`.toLowerCase();
  if (
    /야간\s*조명|night\s*lighting|인쇄\s*\+|print\s*\+/.test(t) &&
    !/(24:00|24시|midnight|06:00.*24|6:00.*midnight|연중|year-round)/.test(t)
  ) {
    return "night";
  }
  if (
    /24:00|24시|midnight|연중|year-round|06:00.–24|6:00\s*a\.m\.–midnight|00\s*–\s*24/.test(
      t,
    )
  ) {
    return "24h";
  }
  if (
    /첫차|막차|first.–last|first\s*train|station\s*hours|역\s*운영|항공편|flight/.test(
      t,
    )
  ) {
    return "day";
  }
  if (/상시|always|24\s*h/i.test(t) && !/야간\s*조명|night\s*lighting/.test(t)) {
    return "24h";
  }
  return null;
}

function effectiveVisibilityScore(m: MediaItem): number | null {
  if (m.catalogSource === "network") return null;
  if (m.visibilityScore == null) return null;
  return m.visibilityScore;
}

function matchesAdvertiserIndustry(m: MediaItem, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const hay = [
    m.advertiserHistory,
    m.advertiserHistoryEn,
    ...(m.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(t);
}

export type CatalogBounds = {
  minPrice: number;
  maxPrice: number;
  minFoot: number;
  maxFoot: number;
  minYear: number;
  maxYear: number;
};

export function computeCatalogBounds(catalog: MediaItem[]): CatalogBounds {
  let minP = Infinity;
  let maxP = 0;
  let minF = Infinity;
  let maxF = 0;
  let minY = Infinity;
  let maxY = 0;
  for (const m of catalog) {
    minP = Math.min(minP, m.price);
    maxP = Math.max(maxP, m.price);
    const f = m.dailyFootTraffic ?? 0;
    minF = Math.min(minF, f);
    maxF = Math.max(maxF, f);
    if (m.installYear != null) {
      minY = Math.min(minY, m.installYear);
      maxY = Math.max(maxY, m.installYear);
    }
  }
  if (!Number.isFinite(minP)) minP = 0;
  if (!Number.isFinite(minF)) minF = 0;
  if (!Number.isFinite(minY)) {
    minY = new Date().getFullYear() - 10;
    maxY = new Date().getFullYear();
  }
  return {
    minPrice: minP,
    maxPrice: Math.max(maxP, minP),
    minFoot: minF,
    maxFoot: Math.max(maxF, minF),
    minYear: minY,
    maxYear: Math.max(maxY, minY),
  };
}

export function defaultAdvancedFilterState(bounds: CatalogBounds): MediaAdvancedFilterState {
  return {
    priceMin: bounds.minPrice,
    priceMax: bounds.maxPrice,
    footMin: bounds.minFoot,
    footMax: bounds.maxFoot,
    visibilityMin: 0,
    visibilityMax: 100,
    sizeTier: "all",
    resolutionPick: {},
    hoursBucket: "all",
    installYearMin: bounds.minYear,
    installYearMax: bounds.maxYear,
    advertiserQuery: "",
  };
}

export function isAdvancedFilterAtDefault(
  f: MediaAdvancedFilterState,
  bounds: CatalogBounds,
): boolean {
  const resActive = Object.values(f.resolutionPick).some(Boolean);
  return (
    f.priceMin <= bounds.minPrice &&
    f.priceMax >= bounds.maxPrice &&
    f.footMin <= bounds.minFoot &&
    f.footMax >= bounds.maxFoot &&
    f.visibilityMin <= 0 &&
    f.visibilityMax >= 100 &&
    f.sizeTier === "all" &&
    !resActive &&
    f.hoursBucket === "all" &&
    f.installYearMin <= bounds.minYear &&
    f.installYearMax >= bounds.maxYear &&
    f.advertiserQuery.trim() === ""
  );
}

export function passesMediaAdvancedFilters(
  m: MediaItem,
  f: MediaAdvancedFilterState,
  bounds: CatalogBounds,
): boolean {
  if (m.price < f.priceMin || m.price > f.priceMax) return false;

  const foot = m.dailyFootTraffic ?? 0;
  if (foot < f.footMin || foot > f.footMax) return false;

  const vis = effectiveVisibilityScore(m);
  if (vis != null) {
    if (vis < f.visibilityMin || vis > f.visibilityMax) return false;
  }

  if (m.catalogSource !== "network") {
    if (f.sizeTier !== "all") {
      const tier = inferMediaSizeTier(m);
      if (tier !== f.sizeTier) return false;
    }

    const selectedRes = (["hd", "fhd", "fourk"] as const).filter(
      (k) => f.resolutionPick[k],
    );
    if (selectedRes.length > 0) {
      const buckets = inferResolutionBuckets(m);
      if (!selectedRes.some((r) => buckets.includes(r))) return false;
    }

    if (f.hoursBucket !== "all") {
      const h = inferOperatingHoursBucket(m);
      if (h != null && h !== f.hoursBucket) return false;
    }

    const yearNarrowed =
      f.installYearMin > bounds.minYear || f.installYearMax < bounds.maxYear;
    if (yearNarrowed) {
      if (m.installYear == null) return false;
      if (m.installYear < f.installYearMin || m.installYear > f.installYearMax) {
        return false;
      }
    }
  }

  if (!matchesAdvertiserIndustry(m, f.advertiserQuery)) return false;

  return true;
}
