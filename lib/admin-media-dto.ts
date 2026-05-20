import type { Media } from "@prisma/client";

export type MediaAvailability = "available" | "reserved" | "maintenance";

/** Admin 매체 관리 / API 공통 DTO (클라이언트·서버 직렬화용) */
export type AdminMediaDto = {
  id: string;
  name: string;
  nameEn: string | null;
  location: string;
  region: string;
  regionZone: string | null;
  type: string;
  price: number;
  image: string | null;
  width: string | null;
  height: string | null;
  description: string | null;
  subCategory: string | null;
  tags: string[];
  district: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  priceNote: string | null;
  widthM: number | null;
  heightM: number | null;
  resolution: string | null;
  operatingHours: string | null;
  dailyFootfall: number | null;
  weekdayFootfall: number | null;
  targetAge: string | null;
  impressions: number | null;
  reach: number | null;
  frequency: number | null;
  cpm: number | null;
  engagementRate: number | null;
  visibilityScore: number;
  effectMemo: string | null;
  extractedImages: string[];
  /** 광고주 이력 (쉼표 구분) */
  pastAdvertisers: string | null;
  nearbyFacilities: string | null;
  nearbyStations: string | null;
  nearbyLandmarks: string | null;
  addressVerified: boolean;
  /** 공개 카탈로그 THINKAD Verified 리본 */
  isVerified: boolean;
  autoPopulatedAt: string | null;
  availability: MediaAvailability;
  /** 목록 노출·운영 on/off (예약 가용과 별개) */
  isActive: boolean;
  /** 홈 추천 매체 */
  isFeatured: boolean;
  /** 추천 노출 순서 (작을수록 앞) */
  featuredOrder: number | null;
  /** 홈 인기 매체 */
  isPopular: boolean;
  /** 인기 노출 순서 (작을수록 앞) */
  popularOrder: number | null;
  priceOptions: Array<{
    label: string;
    price: number;
    period?: string;
    description?: string;
  }> | null;
  /** 이동형 매체 서비스 구역 — 전국 시·군·구 5자리 행정구역 코드 */
  coverageDistrictCodes: string[];
};

const AVAIL: MediaAvailability[] = ["available", "reserved", "maintenance"];

function pickStr(
  r: Record<string, unknown>,
  camel: string,
  snake: string,
): string | null {
  const a = r[camel];
  const b = r[snake];
  if (typeof a === "string") return a;
  if (typeof b === "string") return b;
  return null;
}

function pickStrArr(
  r: Record<string, unknown>,
  camel: string,
  snake: string,
): string[] {
  const a = r[camel];
  const b = r[snake];
  const v = a ?? b;
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function pickNum(
  r: Record<string, unknown>,
  camel: string,
  snake: string,
): number | null {
  const a = r[camel];
  const b = r[snake];
  const v = a !== undefined && a !== null ? a : b;
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickInt(
  r: Record<string, unknown>,
  camel: string,
  snake: string,
): number | null {
  const n = pickNum(r, camel, snake);
  if (n === null) return null;
  return Math.round(n);
}

function pickBool(
  r: Record<string, unknown>,
  camel: string,
  snake: string,
  defaultVal: boolean,
): boolean {
  const v = r[camel] ?? r[snake];
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1 || v === "1") return true;
  if (v === "false" || v === 0 || v === "0") return false;
  return defaultVal;
}

function pickIsoDateTime(
  r: Record<string, unknown>,
  camel: string,
  snake: string,
): string | null {
  const v = r[camel] ?? r[snake];
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  return null;
}

/** API/Prisma JSON 한 건 → DTO (snake_case·누락 필드 방어) */
export function normalizeAdminMediaRow(raw: unknown): AdminMediaDto | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  if (!id) return null;
  const name = typeof r.name === "string" ? r.name : "";
  const location = typeof r.location === "string" ? r.location : "";
  const region = typeof r.region === "string" ? r.region : "";
  const regionZone = pickStr(r, "regionZone", "region_zone");
  const type = typeof r.type === "string" ? r.type : "";
  const priceRaw = r.price;
  const price =
    typeof priceRaw === "number" && Number.isFinite(priceRaw)
      ? Math.round(priceRaw)
      : typeof priceRaw === "string" && Number.isFinite(Number(priceRaw))
        ? Math.round(Number(priceRaw))
        : 0;

  let availability: MediaAvailability = "available";
  const av = r.availability;
  if (typeof av === "string" && AVAIL.includes(av as MediaAvailability)) {
    availability = av as MediaAvailability;
  }

  const iaRaw = r.isActive ?? r.is_active;
  let isActive = true;
  if (typeof iaRaw === "boolean") isActive = iaRaw;
  else if (iaRaw === 0 || iaRaw === "0" || iaRaw === "false") isActive = false;

  return {
    id,
    name,
    nameEn: pickStr(r, "nameEn", "name_en"),
    location,
    region,
    regionZone,
    type,
    price,
    image: pickStr(r, "image", "image"),
    width: pickStr(r, "width", "width"),
    height: pickStr(r, "height", "height"),
    description: pickStr(r, "description", "description"),
    subCategory: pickStr(r, "subCategory", "sub_category"),
    tags: pickStrArr(r, "tags", "tags"),
    district: pickStr(r, "district", "district"),
    city: pickStr(r, "city", "city"),
    latitude: pickNum(r, "latitude", "latitude"),
    longitude: pickNum(r, "longitude", "longitude"),
    priceNote: pickStr(r, "priceNote", "price_note"),
    widthM: pickNum(r, "widthM", "width_m"),
    heightM: pickNum(r, "heightM", "height_m"),
    resolution: pickStr(r, "resolution", "resolution"),
    operatingHours: pickStr(r, "operatingHours", "operating_hours"),
    dailyFootfall: pickInt(r, "dailyFootfall", "daily_footfall"),
    weekdayFootfall: pickInt(r, "weekdayFootfall", "weekday_footfall"),
    targetAge: pickStr(r, "targetAge", "target_age"),
    impressions: pickInt(r, "impressions", "impressions"),
    reach: pickNum(r, "reach", "reach"),
    frequency: pickNum(r, "frequency", "frequency"),
    cpm: pickNum(r, "cpm", "cpm"),
    engagementRate: pickNum(r, "engagementRate", "engagement_rate"),
    visibilityScore: (() => {
      const v = pickInt(r, "visibilityScore", "visibility_score");
      if (v === null) return 0;
      return Math.max(0, Math.min(100, v));
    })(),
    effectMemo: pickStr(r, "effectMemo", "effect_memo"),
    extractedImages: pickStrArr(r, "extractedImages", "extracted_images"),
    pastAdvertisers: pickStr(r, "pastAdvertisers", "past_advertisers"),
    nearbyFacilities: pickStr(r, "nearbyFacilities", "nearby_facilities"),
    nearbyStations: pickStr(r, "nearbyStations", "nearby_stations"),
    nearbyLandmarks: pickStr(r, "nearbyLandmarks", "nearby_landmarks"),
    addressVerified: pickBool(r, "addressVerified", "address_verified", false),
    isVerified: pickBool(r, "isVerified", "is_verified", false),
    autoPopulatedAt: pickIsoDateTime(
      r,
      "autoPopulatedAt",
      "auto_populated_at",
    ),
    availability,
    isActive,
    isFeatured: pickBool(r, "isFeatured", "is_featured", false),
    featuredOrder: pickInt(r, "featuredOrder", "featured_order"),
    isPopular: pickBool(r, "isPopular", "is_popular", false),
    popularOrder: pickInt(r, "popularOrder", "popular_order"),
    priceOptions: Array.isArray((r as Record<string, unknown>).priceOptions)
      ? (r as Record<string, unknown>).priceOptions as Array<{ label: string; price: number; period?: string }>
      : Array.isArray((r as Record<string, unknown>).price_options)
        ? (r as Record<string, unknown>).price_options as Array<{ label: string; price: number; period?: string }>
        : null,
    coverageDistrictCodes: pickStrArr(
      r,
      "coverageDistrictCodes",
      "coverage_district_codes",
    ),
  };
}

export function parseAdminMediaListFromApiJson(data: unknown): {
  medias: AdminMediaDto[];
  error: string | null;
} {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { medias: [], error: "Invalid response" };
  }
  const o = data as Record<string, unknown>;
  if (typeof o.error === "string" && o.error) {
    return { medias: [], error: o.error };
  }
  const list = o.medias;
  if (!Array.isArray(list)) {
    return { medias: [], error: "목록 응답 형식이 올바르지 않습니다." };
  }
  const medias = list
    .map((row) => normalizeAdminMediaRow(row))
    .filter((m): m is AdminMediaDto => m != null);
  return { medias, error: null };
}

export function prismaMediaToAdminDto(m: Media): AdminMediaDto {
  return {
    id: m.id,
    name: m.name,
    nameEn: m.nameEn,
    location: m.location,
    region: m.region,
    regionZone: m.regionZone,
    type: m.type,
    price: m.price,
    image: m.image,
    width: m.width,
    height: m.height,
    description: m.description,
    subCategory: m.subCategory,
    tags: m.tags ?? [],
    district: m.district,
    city: m.city,
    latitude: m.latitude,
    longitude: m.longitude,
    priceNote: m.priceNote,
    widthM: m.widthM,
    heightM: m.heightM,
    resolution: m.resolution,
    operatingHours: m.operatingHours,
    dailyFootfall: m.dailyFootfall,
    weekdayFootfall: m.weekdayFootfall,
    targetAge: m.targetAge,
    impressions: m.impressions,
    reach: m.reach,
    frequency: m.frequency,
    cpm: m.cpm,
    engagementRate: m.engagementRate,
    visibilityScore: m.visibilityScore,
    effectMemo: m.effectMemo,
    extractedImages: m.extractedImages ?? [],
    pastAdvertisers: m.pastAdvertisers,
    nearbyFacilities: m.nearbyFacilities,
    nearbyStations: m.nearbyStations,
    nearbyLandmarks: m.nearbyLandmarks,
    addressVerified: m.addressVerified,
    isVerified: m.isVerified,
    autoPopulatedAt: m.autoPopulatedAt?.toISOString() ?? null,
    availability: m.availability as MediaAvailability,
    isActive: m.isActive,
    isFeatured: m.isFeatured,
    featuredOrder: m.featuredOrder,
    isPopular: m.isPopular,
    popularOrder: m.popularOrder,
    priceOptions: Array.isArray(m.priceOptions)
      ? m.priceOptions as Array<{ label: string; price: number; period?: string }>
      : null,
    coverageDistrictCodes: m.coverageDistrictCodes ?? [],
  };
}
