import type { MediaItem } from "@/lib/media-data";
import { estimatedCpmWon } from "@/lib/ai-recommend-metrics";

export {
  MEDIA_ADVANCED_HIGH_PRIORITY_FILTERS,
  MEDIA_ADVANCED_SECONDARY_FILTERS,
} from "@/lib/media-advanced-filters-schema";

export type MediaSizeTier = "small" | "medium" | "large";
export type ResolutionBucket = "hd" | "fhd" | "fourk";
export type OperatingHoursBucket = "24h" | "day" | "night";

/** 고급 필터 — 주 타겟 연령대 (OR) */
export type TargetAgeBucket =
  | "teen"
  | "twenties"
  | "thirties"
  | "forties"
  | "fiftyPlus";

const TARGET_AGE_REGEX: Record<TargetAgeBucket, RegExp> = {
  teen: /10대|10\s*대|teen|청소년|고등학생|중학생/i,
  twenties:
    /20대|20\s*대|20\s*[-~]\s*3|20-30|twenties|mz세대|\bmz\b|밀레니얼|millennial/i,
  thirties: /30대|30\s*대|30\s*[-~]\s*4|30-40/i,
  forties: /40대|40\s*대|40\s*[-~]\s*5|40-50/i,
  fiftyPlus: /50대|50\s*대|60대|시니어|senior|전연령|가족 단위/i,
};

/** 슬라이더 절대 범위 (요구사항 3-3) */
export const ADVANCED_RANGE = {
  visibility: { min: 0, max: 100 },
  impressions: { min: 0, max: 10_000_000 },
  cpm: { min: 0, max: 10_000 },
  reach: { min: 0, max: 1_000_000 },
  frequency: { min: 0, max: 10 },
  dailyFoot: { min: 0, max: 500_000 },
  engagement: { min: 0, max: 1 },
  widthM: { min: 0, max: 120 },
  heightM: { min: 0, max: 80 },
} as const;

/** 해상도 단일 선택 (`resolution` secondary select) */
export type ResolutionFilter = "all" | ResolutionBucket;

export type MediaAdvancedFilterState = {
  catalogKind: "all" | "single" | "network";
  priceMin: number;
  priceMax: number;
  footMin: number;
  footMax: number;
  visibilityMin: number;
  visibilityMax: number;
  impressionsMin: number;
  impressionsMax: number;
  cpmMin: number;
  cpmMax: number;
  reachMin: number;
  reachMax: number;
  frequencyMin: number;
  frequencyMax: number;
  engagementMin: number;
  engagementMax: number;
  widthMinM: number;
  widthMaxM: number;
  heightMinM: number;
  heightMaxM: number;
  sizeTier: "all" | MediaSizeTier;
  resolutionFilter: ResolutionFilter;
  hoursBucket: "all" | OperatingHoursBucket;
  installYearMin: number;
  installYearMax: number;
  advertiserQuery: string;
  targetAgePick: Partial<Record<TargetAgeBucket, boolean>>;
  selectedTags: string[];
  stationQuery: string;
  landmarkQuery: string;
  /** `all` = 미적용 */
  subCategoryFilter: string;
};

function parseM2FromSize(size: string | undefined): number | null {
  if (!size) return null;
  const m2 = size.match(/([\d,]+(?:\.\d+)?)\s*㎡/);
  if (m2) return Number(m2[1].replace(/,/g, ""));
  return null;
}

function parseMetersProduct(size: string | undefined): number | null {
  if (!size) return null;
  const re = /(\d+(?:\.\d+)?)\s*m\s*[×x]\s*(\d+(?:\.\d+)?)\s*m/i;
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

const RESOLUTION_TIER_RANK: Record<ResolutionBucket, number> = {
  hd: 1,
  fhd: 2,
  fourk: 3,
};

/** 단일 선택 해상도: 해당 등급 이상이면 통과 */
function mediaMeetsMinResolutionTier(
  m: MediaItem,
  minTier: ResolutionBucket,
): boolean {
  const buckets = inferResolutionBuckets(m);
  if (buckets.length === 0) return false;
  const need = RESOLUTION_TIER_RANK[minTier];
  return buckets.some((b) => RESOLUTION_TIER_RANK[b] >= need);
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

export function effectiveImpressions(m: MediaItem): number | null {
  const v = m.impressions ?? m.monthlyFootTraffic;
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v);
  const d = m.dailyFootTraffic ?? 0;
  if (d > 0) return Math.round(d * 30);
  return null;
}

export function effectiveReach(m: MediaItem): number | null {
  const r = m.reach;
  if (typeof r === "number" && Number.isFinite(r) && r > 0) return r;
  return null;
}

export function effectiveFrequency(m: MediaItem): number | null {
  const f = m.frequency;
  if (typeof f === "number" && Number.isFinite(f) && f >= 0) return f;
  return null;
}

export function effectiveEngagement(m: MediaItem): number | null {
  const e = m.engagementRate;
  if (typeof e === "number" && Number.isFinite(e) && e >= 0) return e;
  return null;
}

export function effectiveCpm(m: MediaItem): number | null {
  if (m.cpm != null && Number.isFinite(m.cpm) && m.cpm > 0) return m.cpm;
  return estimatedCpmWon(m);
}

function parseWidthHeightMFromSize(
  size: string | undefined,
): { w: number; h: number } | null {
  if (!size) return null;
  const m = size.match(/(\d+(?:\.\d+)?)\s*m\s*[×x]\s*(\d+(?:\.\d+)?)\s*m/i);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return { w, h };
}

export function effectiveWidthM(m: MediaItem): number | null {
  if (m.widthM != null && Number.isFinite(m.widthM) && m.widthM > 0) {
    return m.widthM;
  }
  return parseWidthHeightMFromSize(m.size)?.w ?? null;
}

export function effectiveHeightM(m: MediaItem): number | null {
  if (m.heightM != null && Number.isFinite(m.heightM) && m.heightM > 0) {
    return m.heightM;
  }
  return parseWidthHeightMFromSize(m.size)?.h ?? null;
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

function rangeNarrowed(
  min: number,
  max: number,
  fullMin: number,
  fullMax: number,
): boolean {
  return min > fullMin || max < fullMax;
}

function passesNumericRange(
  v: number | null,
  min: number,
  max: number,
  fullMin: number,
  fullMax: number,
): boolean {
  if (!rangeNarrowed(min, max, fullMin, fullMax)) return true;
  if (v == null || !Number.isFinite(v)) return false;
  return v >= min && v <= max;
}

function selectedTargetAgeBands(
  pick: Partial<Record<TargetAgeBucket, boolean>>,
): TargetAgeBucket[] {
  return (Object.keys(pick) as TargetAgeBucket[]).filter((k) => pick[k]);
}

function matchesTargetAgeBands(
  m: MediaItem,
  pick: Partial<Record<TargetAgeBucket, boolean>>,
): boolean {
  const bands = selectedTargetAgeBands(pick);
  if (bands.length === 0) return true;
  const t = m.targetAge ?? "";
  if (!t.trim()) return false;
  return bands.some((b) => TARGET_AGE_REGEX[b].test(t));
}

function matchesTags(m: MediaItem, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const tags = m.tags ?? [];
  if (tags.length === 0) return false;
  const lower = tags.map((x) => x.toLowerCase());
  return selected.some((s) => lower.includes(s.toLowerCase()));
}

function matchesStationQuery(m: MediaItem, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const hay = [m.nearbyStations, m.nearbyFacilities, m.nearbyFacilitiesEn]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(t);
}

function matchesLandmarkQuery(m: MediaItem, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const hay = [m.nearbyLandmarks, m.nearbyFacilities, m.nearbyFacilitiesEn]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(t);
}

function matchesSubCategoryFilter(m: MediaItem, filter: string): boolean {
  const t = filter.trim();
  if (!t || t === "all") return true;
  const sc = m.subCategory?.trim();
  if (!sc) return false;
  return sc === t;
}

export type CatalogBounds = {
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
};

export function computeCatalogBounds(catalog: MediaItem[]): CatalogBounds {
  let minP = Infinity;
  let maxP = 0;
  let minY = Infinity;
  let maxY = 0;
  for (const m of catalog) {
    minP = Math.min(minP, m.price);
    maxP = Math.max(maxP, m.price);
    if (m.installYear != null) {
      minY = Math.min(minY, m.installYear);
      maxY = Math.max(maxY, m.installYear);
    }
  }
  if (!Number.isFinite(minP)) minP = 0;
  if (!Number.isFinite(minY)) {
    minY = new Date().getFullYear() - 10;
    maxY = new Date().getFullYear();
  }
  return {
    minPrice: minP,
    maxPrice: Math.max(maxP, minP),
    minYear: minY,
    maxYear: Math.max(maxY, minY),
  };
}

const R = ADVANCED_RANGE;

export function defaultAdvancedFilterState(
  bounds: CatalogBounds,
): MediaAdvancedFilterState {
  return {
    catalogKind: "all",
    priceMin: bounds.minPrice,
    priceMax: bounds.maxPrice,
    footMin: R.dailyFoot.min,
    footMax: R.dailyFoot.max,
    visibilityMin: R.visibility.min,
    visibilityMax: R.visibility.max,
    impressionsMin: R.impressions.min,
    impressionsMax: R.impressions.max,
    cpmMin: R.cpm.min,
    cpmMax: R.cpm.max,
    reachMin: R.reach.min,
    reachMax: R.reach.max,
    frequencyMin: R.frequency.min,
    frequencyMax: R.frequency.max,
    engagementMin: R.engagement.min,
    engagementMax: R.engagement.max,
    widthMinM: R.widthM.min,
    widthMaxM: R.widthM.max,
    heightMinM: R.heightM.min,
    heightMaxM: R.heightM.max,
    sizeTier: "all",
    resolutionFilter: "all",
    hoursBucket: "all",
    installYearMin: bounds.minYear,
    installYearMax: bounds.maxYear,
    advertiserQuery: "",
    targetAgePick: {},
    selectedTags: [],
    stationQuery: "",
    landmarkQuery: "",
    subCategoryFilter: "all",
  };
}

export function isAdvancedFilterAtDefault(
  f: MediaAdvancedFilterState,
  bounds: CatalogBounds,
): boolean {
  const ageActive = selectedTargetAgeBands(f.targetAgePick).length > 0;
  return (
    f.catalogKind === "all" &&
    f.priceMin <= bounds.minPrice &&
    f.priceMax >= bounds.maxPrice &&
    f.footMin <= R.dailyFoot.min &&
    f.footMax >= R.dailyFoot.max &&
    f.visibilityMin <= R.visibility.min &&
    f.visibilityMax >= R.visibility.max &&
    f.impressionsMin <= R.impressions.min &&
    f.impressionsMax >= R.impressions.max &&
    f.cpmMin <= R.cpm.min &&
    f.cpmMax >= R.cpm.max &&
    f.reachMin <= R.reach.min &&
    f.reachMax >= R.reach.max &&
    f.frequencyMin <= R.frequency.min &&
    f.frequencyMax >= R.frequency.max &&
    f.engagementMin <= R.engagement.min &&
    f.engagementMax >= R.engagement.max &&
    f.widthMinM <= R.widthM.min &&
    f.widthMaxM >= R.widthM.max &&
    f.heightMinM <= R.heightM.min &&
    f.heightMaxM >= R.heightM.max &&
    f.sizeTier === "all" &&
    f.resolutionFilter === "all" &&
    f.hoursBucket === "all" &&
    f.installYearMin <= bounds.minYear &&
    f.installYearMax >= bounds.maxYear &&
    f.advertiserQuery.trim() === "" &&
    !ageActive &&
    f.selectedTags.length === 0 &&
    f.stationQuery.trim() === "" &&
    f.landmarkQuery.trim() === "" &&
    (f.subCategoryFilter === "all" || f.subCategoryFilter.trim() === "")
  );
}

export function passesMediaAdvancedFilters(
  m: MediaItem,
  f: MediaAdvancedFilterState,
  bounds: CatalogBounds,
): boolean {
  if (f.catalogKind === "single" && m.catalogSource === "network") return false;
  if (f.catalogKind === "network" && m.catalogSource !== "network") return false;

  if (m.price < f.priceMin || m.price > f.priceMax) return false;

  const foot = m.dailyFootTraffic ?? 0;
  if (
    !passesNumericRange(
      foot,
      f.footMin,
      f.footMax,
      R.dailyFoot.min,
      R.dailyFoot.max,
    )
  ) {
    return false;
  }

  const vis = effectiveVisibilityScore(m);
  if (vis != null) {
    if (
      !passesNumericRange(
        vis,
        f.visibilityMin,
        f.visibilityMax,
        R.visibility.min,
        R.visibility.max,
      )
    ) {
      return false;
    }
  }

  if (
    !passesNumericRange(
      effectiveImpressions(m),
      f.impressionsMin,
      f.impressionsMax,
      R.impressions.min,
      R.impressions.max,
    )
  ) {
    return false;
  }

  if (
    !passesNumericRange(
      effectiveCpm(m),
      f.cpmMin,
      f.cpmMax,
      R.cpm.min,
      R.cpm.max,
    )
  ) {
    return false;
  }

  if (
    !passesNumericRange(
      effectiveReach(m),
      f.reachMin,
      f.reachMax,
      R.reach.min,
      R.reach.max,
    )
  ) {
    return false;
  }

  if (
    !passesNumericRange(
      effectiveFrequency(m),
      f.frequencyMin,
      f.frequencyMax,
      R.frequency.min,
      R.frequency.max,
    )
  ) {
    return false;
  }

  if (
    !passesNumericRange(
      effectiveEngagement(m),
      f.engagementMin,
      f.engagementMax,
      R.engagement.min,
      R.engagement.max,
    )
  ) {
    return false;
  }

  if (
    !passesNumericRange(
      effectiveWidthM(m),
      f.widthMinM,
      f.widthMaxM,
      R.widthM.min,
      R.widthM.max,
    )
  ) {
    return false;
  }

  if (
    !passesNumericRange(
      effectiveHeightM(m),
      f.heightMinM,
      f.heightMaxM,
      R.heightM.min,
      R.heightM.max,
    )
  ) {
    return false;
  }

  if (m.catalogSource !== "network") {
    if (f.sizeTier !== "all") {
      const tier = inferMediaSizeTier(m);
      if (tier !== f.sizeTier) return false;
    }

    if (f.resolutionFilter !== "all") {
      if (!mediaMeetsMinResolutionTier(m, f.resolutionFilter)) return false;
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
  if (!matchesTargetAgeBands(m, f.targetAgePick)) return false;
  if (!matchesTags(m, f.selectedTags)) return false;
  if (!matchesStationQuery(m, f.stationQuery)) return false;
  if (!matchesLandmarkQuery(m, f.landmarkQuery)) return false;
  if (!matchesSubCategoryFilter(m, f.subCategoryFilter)) return false;

  return true;
}
