import type { Media } from "@prisma/client";
import {
  defaultPricingModeForBrowseSub,
  isMediaPricingMode,
  type MediaPricingMode,
} from "@/lib/media-pricing-mode";
import { normalizeMediaCountry } from "@/lib/media-country";
import {
  parsePartialPeriodRatesRaw,
  type PartialPeriodRatesMap,
} from "@/lib/media-partial-period-rates";
import {
  parseMediaInstallLocations,
  type MediaInstallLocation,
} from "@/lib/media-install-locations";

export type MediaAvailability = "available" | "reserved" | "maintenance";

/** PR4: media_fact_sheets + media_computed_metrics 뱃지용 */
export type AdminMediaLayerBadges = {
  reliabilityGrade: "A" | "B" | "C" | null;
  modelVersion: string | null;
  dimensionSource: string | null;
  legacyCpm: number | null;
};

export const ADMIN_MEDIA_LAYER_INCLUDE = {
  factSheet: { select: { dimensionSource: true } },
  computedMetric: {
    select: {
      reliabilityGrade: true,
      modelVersion: true,
      legacyCpm: true,
    },
  },
} as const;

/** Admin 매체 관리 / API 공통 DTO (클라이언트·서버 직렬화용) */
export type AdminMediaDto = {
  id: string;
  name: string;
  nameEn: string | null;
  /** JJ-2: 영문 위치 (AI 초안 또는 수동) */
  locationEn: string | null;
  location: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
  region: string;
  regionZone: string | null;
  type: string | null;
  price: number | null;
  catalogChannel?: string | null;
  image: string | null;
  width: string | null;
  height: string | null;
  description: string | null;
  /** JJ-2: 영문 상세 설명 (AI 초안 또는 수동) */
  descriptionEn: string | null;
  subCategory: string | null;
  mediaCategory: string[];
  targetCategory: string[];
  tags: string[];
  district: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  /** 복수 설치 지점 (휴게소 상·하행 등) */
  installLocations: MediaInstallLocation[];
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
  /** 즉시 예약 CTA — 어드민 「노출」에서 수동 on/off */
  instantBookingEnabled: boolean;
  /** 목록 노출·운영 on/off (예약 가용과 별개) */
  isActive: boolean;
  /** Operational — Phase B. `clean` | `flagged` | `reviewed` */
  reviewStatus: "clean" | "flagged" | "reviewed";
  reviewReason: string | null;
  flaggedAt: string | null;
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
    partialPeriodRates?: PartialPeriodRatesMap;
  }> | null;
  partialPeriodRates: PartialPeriodRatesMap | null;
  /** 이동형 매체 서비스 구역 — 전국 시·군·구 5자리 행정구역 코드 */
  coverageDistrictCodes: string[];
  proposalUrl: string | null;
  proposalFileName: string | null;
  hasProposal: boolean;
  mediaMainCategory: string | null;
  mediaSubCategory: string | null;
  /** 협의가(quote_only) | 고정단가(fixed) */
  pricingMode: MediaPricingMode;
  regionMain: string | null;
  regionSub: string | null;
  /** PR4: 3-layer badge data (admin list/modal only) */
  layerBadges: AdminMediaLayerBadges | null;
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

function pickLayerBadges(r: Record<string, unknown>): AdminMediaLayerBadges | null {
  const nested = r.layerBadges;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const b = nested as Record<string, unknown>;
    const grade = b.reliabilityGrade ?? b.reliability_grade;
    return {
      reliabilityGrade:
        grade === "A" || grade === "B" || grade === "C" ? grade : null,
      modelVersion:
        typeof b.modelVersion === "string"
          ? b.modelVersion
          : typeof b.model_version === "string"
            ? b.model_version
            : null,
      dimensionSource:
        typeof b.dimensionSource === "string"
          ? b.dimensionSource
          : typeof b.dimension_source === "string"
            ? b.dimension_source
            : null,
      legacyCpm: pickNum(b, "legacyCpm", "legacy_cpm"),
    };
  }

  const factSheet = r.factSheet ?? r.fact_sheet;
  const computedMetric = r.computedMetric ?? r.computed_metric;
  if (
    (!factSheet || typeof factSheet !== "object") &&
    (!computedMetric || typeof computedMetric !== "object")
  ) {
    return null;
  }

  const fs =
    factSheet && typeof factSheet === "object"
      ? (factSheet as Record<string, unknown>)
      : null;
  const cm =
    computedMetric && typeof computedMetric === "object"
      ? (computedMetric as Record<string, unknown>)
      : null;
  const grade = cm?.reliabilityGrade ?? cm?.reliability_grade;
  return {
    reliabilityGrade:
      grade === "A" || grade === "B" || grade === "C" ? grade : null,
    modelVersion:
      typeof cm?.modelVersion === "string"
        ? cm.modelVersion
        : typeof cm?.model_version === "string"
          ? cm.model_version
          : null,
    dimensionSource:
      typeof fs?.dimensionSource === "string"
        ? fs.dimensionSource
        : typeof fs?.dimension_source === "string"
          ? fs.dimension_source
          : null,
    legacyCpm: cm ? pickNum(cm, "legacyCpm", "legacy_cpm") : null,
  };
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
    locationEn: pickStr(r, "locationEn", "location_en"),
    country: normalizeMediaCountry(r.country),
    location,
    region,
    regionZone,
    type,
    price,
    image: pickStr(r, "image", "image"),
    width: pickStr(r, "width", "width"),
    height: pickStr(r, "height", "height"),
    description: pickStr(r, "description", "description"),
    descriptionEn: pickStr(r, "descriptionEn", "description_en"),
    subCategory: pickStr(r, "subCategory", "sub_category"),
    mediaCategory: pickStrArr(r, "mediaCategory", "media_category"),
    targetCategory: pickStrArr(r, "targetCategory", "target_category"),
    tags: pickStrArr(r, "tags", "tags"),
    district: pickStr(r, "district", "district"),
    city: pickStr(r, "city", "city"),
    latitude: pickNum(r, "latitude", "latitude"),
    longitude: pickNum(r, "longitude", "longitude"),
    installLocations: parseMediaInstallLocations(
      r.installLocations ?? r.install_locations,
    ),
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
    instantBookingEnabled: pickBool(
      r,
      "instantBookingEnabled",
      "instant_booking_enabled",
      false,
    ),
    isActive,
    reviewStatus: ((): AdminMediaDto["reviewStatus"] => {
      const v = pickStr(r, "reviewStatus", "review_status");
      if (v === "flagged" || v === "reviewed" || v === "clean") return v;
      return "clean";
    })(),
    reviewReason: pickStr(r, "reviewReason", "review_reason"),
    flaggedAt: pickIsoDateTime(r, "flaggedAt", "flagged_at"),
    isFeatured: pickBool(r, "isFeatured", "is_featured", false),
    featuredOrder: pickInt(r, "featuredOrder", "featured_order"),
    isPopular: pickBool(r, "isPopular", "is_popular", false),
    popularOrder: pickInt(r, "popularOrder", "popular_order"),
    priceOptions: Array.isArray((r as Record<string, unknown>).priceOptions)
      ? ((r as Record<string, unknown>).priceOptions as AdminMediaDto["priceOptions"])
      : Array.isArray((r as Record<string, unknown>).price_options)
        ? ((r as Record<string, unknown>).price_options as AdminMediaDto["priceOptions"])
        : null,
    partialPeriodRates:
      parsePartialPeriodRatesRaw(
        (r as Record<string, unknown>).partialPeriodRates ??
          (r as Record<string, unknown>).partial_period_rates,
      ) ?? null,
    coverageDistrictCodes: pickStrArr(
      r,
      "coverageDistrictCodes",
      "coverage_district_codes",
    ),
    proposalUrl: pickStr(r, "proposalUrl", "proposal_url"),
    proposalFileName: pickStr(r, "proposalFileName", "proposal_file_name"),
    hasProposal: pickBool(r, "hasProposal", "has_proposal", false),
    mediaMainCategory: pickStr(r, "mediaMainCategory", "media_main_category"),
    mediaSubCategory: pickStr(r, "mediaSubCategory", "media_sub_category"),
    pricingMode: (() => {
      const raw = r.pricingMode ?? r.pricing_mode;
      if (isMediaPricingMode(raw)) return raw;
      const sub = pickStr(r, "mediaSubCategory", "media_sub_category");
      return defaultPricingModeForBrowseSub(sub);
    })(),
    regionMain: pickStr(r, "regionMain", "region_main"),
    regionSub: pickStr(r, "regionSub", "region_sub"),
    layerBadges: pickLayerBadges(r),
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

export function prismaMediaToAdminDto(
  m: Media & {
    factSheet?: { dimensionSource: string | null } | null;
    computedMetric?: {
      reliabilityGrade: string;
      modelVersion: string;
      legacyCpm: number | null;
    } | null;
  },
): AdminMediaDto {
  const grade = m.computedMetric?.reliabilityGrade;
  const layerBadges: AdminMediaLayerBadges | null =
    m.factSheet || m.computedMetric
      ? {
          reliabilityGrade:
            grade === "A" || grade === "B" || grade === "C" ? grade : null,
          modelVersion: m.computedMetric?.modelVersion ?? null,
          dimensionSource: m.factSheet?.dimensionSource ?? null,
          legacyCpm: m.computedMetric?.legacyCpm ?? null,
        }
      : null;

  return {
    id: m.id,
    name: m.name,
    nameEn: m.nameEn,
    locationEn: (m as Media & { locationEn?: string | null }).locationEn ?? null,
    country: normalizeMediaCountry(m.country),
    location: m.location,
    region: m.region,
    regionZone: m.regionZone,
    type: m.type,
    price: m.price,
    catalogChannel: (m as Media & { catalogChannel?: string | null }).catalogChannel ?? null,
    image: m.image,
    width: m.width,
    height: m.height,
    description: m.description,
    descriptionEn:
      (m as Media & { descriptionEn?: string | null }).descriptionEn ?? null,
    subCategory: m.subCategory,
    mediaCategory: m.mediaCategory ?? [],
    targetCategory: m.targetCategory ?? [],
    tags: m.tags ?? [],
    district: m.district,
    city: m.city,
    latitude: m.latitude,
    longitude: m.longitude,
    installLocations: (() => {
      const row = m as Media & { installLocations?: unknown };
      const raw = row.installLocations;
      if (Array.isArray(raw) && raw.length > 0) {
        const parsed = parseMediaInstallLocations(raw);
        if (parsed.length > 0) return parsed;
      }
      return parseMediaInstallLocations(raw);
    })(),
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
    instantBookingEnabled: m.instantBookingEnabled,
    isActive: m.isActive,
    reviewStatus:
      m.reviewStatus === "flagged" || m.reviewStatus === "reviewed"
        ? m.reviewStatus
        : "clean",
    reviewReason: m.reviewReason ?? null,
    flaggedAt: m.flaggedAt?.toISOString() ?? null,
    isFeatured: m.isFeatured,
    featuredOrder: m.featuredOrder,
    isPopular: m.isPopular,
    popularOrder: m.popularOrder,
    priceOptions: Array.isArray(m.priceOptions)
      ? (m.priceOptions as AdminMediaDto["priceOptions"])
      : null,
    partialPeriodRates: parsePartialPeriodRatesRaw(m.partialPeriodRates) ?? null,
    coverageDistrictCodes: m.coverageDistrictCodes ?? [],
    proposalUrl: m.proposalUrl,
    proposalFileName: m.proposalFileName,
    hasProposal: m.hasProposal,
    mediaMainCategory: m.mediaMainCategory,
    mediaSubCategory: m.mediaSubCategory,
    pricingMode: isMediaPricingMode(
      (m as Media & { pricingMode?: string }).pricingMode,
    )
      ? ((m as Media & { pricingMode: MediaPricingMode }).pricingMode)
      : defaultPricingModeForBrowseSub(m.mediaSubCategory),
    regionMain: m.regionMain,
    regionSub: m.regionSub,
    layerBadges,
  };
}

/** Admin list/card — null price (online inquiry rows) → 「가격 문의」 (PR525/PR5 hotfix SSOT). */
export function formatAdminListPrice(price: number | null | undefined): string {
  if (price == null || !Number.isFinite(price)) return "가격 문의";
  return `₩${price.toLocaleString("ko-KR")}`;
}

/** Admin list subtitle — null type (online) → 「온라인」 (PR525 pattern). */
export function formatAdminListTypeSummary(
  media: Pick<AdminMediaDto, "type" | "catalogChannel" | "mediaMainCategory">,
): string {
  if (!media.type?.trim()) {
    if (media.catalogChannel === "online") return "온라인";
    if (media.mediaMainCategory?.trim()) return media.mediaMainCategory;
    return "—";
  }
  return media.type;
}
