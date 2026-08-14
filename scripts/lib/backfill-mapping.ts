/**
 * PR3 media → media_fact_sheets / media_computed_metrics 매핑 규칙.
 * Production media 컬럼 71개만 사용 (Preview orphan 23 cols 제외).
 */

/** §1-1 옵션 B 확정: PR6+ 실사용 전까지 RAW_COPY 유지, 표준 변환은 별도 PR. */
export const STATIONCODE_MODE = "RAW_COPY" as "STANDARD" | "RAW_COPY";

export const BACKFILL_MODEL_VERSION = "legacy-migration-v1";

/** media SELECT whitelist — production 71 columns only */
export const MEDIA_SELECT_COLUMNS = [
  "id",
  "slug",
  "name",
  "name_en",
  "location",
  "region",
  "region_zone",
  "type",
  "price",
  "price_period",
  "price_options",
  "partial_period_rates",
  "image",
  "width",
  "height",
  "description",
  "sub_category",
  "media_category",
  "media_main_category",
  "media_sub_category",
  "region_main",
  "region_sub",
  "target_category",
  "tags",
  "district",
  "city",
  "coverage_district_codes",
  "latitude",
  "longitude",
  "install_locations",
  "price_note",
  "width_m",
  "height_m",
  "resolution",
  "operating_hours",
  "daily_footfall",
  "weekday_footfall",
  "target_age",
  "impressions",
  "reach",
  "frequency",
  "cpm",
  "engagement_rate",
  "visibility_score",
  "install_year",
  "effect_memo",
  "traffic_pattern",
  "extracted_images",
  "past_advertisers",
  "nearby_facilities",
  "nearby_stations",
  "nearby_landmarks",
  "address_verified",
  "auto_populated_at",
  "availability",
  "instant_booking_enabled",
  "is_active",
  "is_featured",
  "featured_order",
  "is_popular",
  "popular_order",
  "popularity_score",
  "popularity_updated_at",
  "view_count",
  "proposal_url",
  "proposal_file_name",
  "has_proposal",
  "owner_user_id",
  "created_at",
  "updated_at",
] as const;

export type MediaRow = Record<(typeof MEDIA_SELECT_COLUMNS)[number], unknown>;

export type DimensionSource =
  | "MEASURED"
  | "PARSED_FROM_TEXT"
  | "ESTIMATED_MEDIAN"
  | "UNKNOWN";

export type BatchName =
  | "seoul-with-dims"
  | "seoul-missing-dims"
  | "other-regions"
  | "all";

export const BATCH_ORDER: {
  name: BatchName;
  label: string;
  filter: (row: MediaRow) => boolean;
}[] = [
  {
    name: "seoul-with-dims",
    label: "seoul-with-dims",
    filter: (r) =>
      r.region_main === "seoul" && r.width_m != null && r.height_m != null,
  },
  {
    name: "seoul-missing-dims",
    label: "seoul-missing-dims",
    filter: (r) =>
      r.region_main === "seoul" &&
      (r.width_m == null || r.height_m == null),
  },
  {
    name: "other-regions",
    label: "other-regions",
    filter: (r) => r.region_main !== "seoul",
  },
];

const SUBWAY_SUBTYPES = new Set([
  "subway_platform",
  "subway_concourse",
  "subway_train_interior",
]);

export function inferMediaSubtype(row: MediaRow): string {
  const type = String(row.type ?? "").toLowerCase();
  const main = String(row.media_main_category ?? "").toLowerCase();
  const sub = String(row.media_sub_category ?? row.sub_category ?? "").toLowerCase();
  const hay = `${type} ${main} ${sub} ${row.location ?? ""}`.toLowerCase();

  if (sub.includes("platform") || hay.includes("승강장")) return "subway_platform";
  if (sub.includes("concourse") || hay.includes("대합실") || hay.includes("cm"))
    return "subway_concourse";
  if (type === "mobile" && (sub.includes("subway") || hay.includes("지하철")))
    return "subway_train_interior";
  if (sub.includes("subway") || hay.includes("지하철")) return "subway_platform";
  if (type === "digital") return "dooh";
  if (type === "static") {
    if (hay.includes("wrap") || hay.includes("래핑")) return "building_wrap";
    return "billboard";
  }
  if (type === "mobile") {
    if (sub.includes("taxi") || hay.includes("택시")) return "taxi";
    if (sub.includes("bus") || hay.includes("버스")) return "bus_wrap";
  }
  if (sub.includes("shelter") || hay.includes("쉘터")) return "bus_shelter";
  if (row.region_main === "incheon" && hay.includes("공항")) return "airport";
  if (sub.includes("retail") || sub.includes("venue")) return "retail_venue";
  return "other";
}

export function isSubwaySubtype(subtype: string): boolean {
  return SUBWAY_SUBTYPES.has(subtype);
}

function padTime(t: string): string {
  const [h, m] = t.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

export function parseOperatingHours(
  raw: unknown,
): { operatingStart: string | null; operatingEnd: string | null } {
  if (raw == null || raw === "") return { operatingStart: null, operatingEnd: null };
  const s = String(raw).trim();
  const m = s.match(/(\d{1,2}:\d{2})\s*[-~–—]\s*(\d{1,2}:\d{2})/);
  if (!m) return { operatingStart: null, operatingEnd: null };
  return { operatingStart: padTime(m[1]), operatingEnd: padTime(m[2]) };
}

function parseMmFromText(text: unknown): number | null {
  if (text == null || text === "") return null;
  const s = String(text).trim().toLowerCase();
  const dim = s.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/);
  if (dim) {
    const a = parseFloat(dim[1]);
    const b = parseFloat(dim[2]);
    const val = Math.max(a, b);
    if (s.includes("mm")) return Math.round(val);
    if (s.includes("m") && !s.includes("mm")) return Math.round(val * 1000);
    if (val > 100) return Math.round(val);
    return Math.round(val * 1000);
  }
  const mOnly = s.match(/(\d+(?:\.\d+)?)\s*m(?!\w)/);
  if (mOnly) return Math.round(parseFloat(mOnly[1]) * 1000);
  return null;
}

export function resolveDimensions(row: MediaRow): {
  widthMm: number | null;
  heightMm: number | null;
  dimensionSource: DimensionSource | null;
} {
  if (row.width_m != null && row.height_m != null) {
    return {
      widthMm: Math.round(Number(row.width_m) * 1000),
      heightMm: Math.round(Number(row.height_m) * 1000),
      dimensionSource: "MEASURED",
    };
  }

  const fromWidth = parseMmFromText(row.width);
  const fromHeight = parseMmFromText(row.height);
  const combined = parseMmFromText(`${row.width ?? ""}x${row.height ?? ""}`);

  if (combined && combined > 0) {
    const w = fromWidth ?? combined;
    const h = fromHeight ?? combined;
    if (w && h) {
      return {
        widthMm: w,
        heightMm: h,
        dimensionSource: "PARSED_FROM_TEXT",
      };
    }
  }

  if (row.width_m != null || row.height_m != null || row.width || row.height) {
    const w =
      row.width_m != null
        ? Math.round(Number(row.width_m) * 1000)
        : fromWidth;
    const h =
      row.height_m != null
        ? Math.round(Number(row.height_m) * 1000)
        : fromHeight;
    return {
      widthMm: w ?? null,
      heightMm: h ?? null,
      dimensionSource: "UNKNOWN",
    };
  }

  return { widthMm: null, heightMm: null, dimensionSource: "UNKNOWN" };
}

/** media에 station_code 컬럼 없음 — RAW_COPY도 nearby_stations 텍스트만 (코드 아님). */
export function toStationCode(row: MediaRow, subtype: string): string | null {
  if (!isSubwaySubtype(subtype)) return null;
  if (STATIONCODE_MODE === "RAW_COPY") {
    const raw = row.nearby_stations;
    if (raw == null || String(raw).trim() === "") return null;
    return String(raw).trim().slice(0, 512);
  }
  return null;
}

export function hasRequiredCoordinates(row: MediaRow): boolean {
  return row.latitude != null && row.longitude != null;
}

export type FactSheetInsert = {
  mediaId: string;
  latitude: number;
  longitude: number;
  mediaSubtype: string;
  widthMm: number | null;
  heightMm: number | null;
  dimensionSource: DimensionSource | null;
  operatingStart: string | null;
  operatingEnd: string | null;
  stationCode: string | null;
};

export function toFactSheet(row: MediaRow): FactSheetInsert | null {
  if (!hasRequiredCoordinates(row)) return null;
  const mediaSubtype = inferMediaSubtype(row);
  const dims = resolveDimensions(row);
  const hours = parseOperatingHours(row.operating_hours);
  return {
    mediaId: String(row.id),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    mediaSubtype,
    widthMm: dims.widthMm,
    heightMm: dims.heightMm,
    dimensionSource: dims.dimensionSource,
    operatingStart: hours.operatingStart,
    operatingEnd: hours.operatingEnd,
    stationCode: toStationCode(row, mediaSubtype),
  };
}

export type ComputedMetricInsert = {
  mediaId: string;
  dailyImpressions: number;
  cpm: number;
  visibilityScore: null;
  reliabilityGrade: "C";
  modelVersion: string;
  computedAt: Date;
  legacyDailyImpressions: number | null;
  legacyCpm: number | null;
};

export function toComputedMetric(row: MediaRow): ComputedMetricInsert {
  const dailyRaw =
    row.daily_footfall != null
      ? Number(row.daily_footfall)
      : row.impressions != null
        ? Math.round(Number(row.impressions) / 30)
        : 0;
  const cpmRaw = row.cpm != null ? Math.round(Number(row.cpm)) : 0;
  const legacyDaily =
    row.daily_footfall != null ? Number(row.daily_footfall) : null;
  const legacyCpm = row.cpm != null ? Math.round(Number(row.cpm)) : null;

  return {
    mediaId: String(row.id),
    dailyImpressions: dailyRaw,
    cpm: cpmRaw,
    visibilityScore: null,
    reliabilityGrade: "C",
    modelVersion: BACKFILL_MODEL_VERSION,
    computedAt: new Date(),
    legacyDailyImpressions: legacyDaily,
    legacyCpm: legacyCpm,
  };
}
