/**
 * Admin quick-add: JSON pasted from external tools → Prisma Media create payload.
 */

import { Prisma } from "@prisma/client";
import {
  CATALOG_MEDIA_TYPES,
  inferCatalogTypeFromMediaContent,
  isValidCatalogMediaType,
} from "@/lib/media-auto-categorize";
import {
  deriveRegionFromAddress,
  deriveTypeFromSubCategory,
  enrichCityDistrictFromAddress,
  extractAutoTags,
  inferSubCategoryFromText,
  mergeManualAndAutoTags,
  normalizeSubCategory,
} from "@/lib/media-json-enrich";
import {
  parseMediaInstallLocations,
  resolveMediaCoordsForSave,
  type MediaInstallLocation,
} from "@/lib/media-install-locations";
import { coercePriceOptionPeriodForWrite } from "@/lib/media-price-period-write";

export type QuickAddMediaJson = {
  media_name: string;
  description: string;
  sub_category: string;
  tags: string[];
  full_address: string;
  district: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  /**
   * 복수 설치 지점. JSON 편집·bulk-import에서 `install_locations` 별칭도 허용.
   * - 키 없음(`undefined`): 기존 DB 값 유지 (update 시)
   * - `null` 또는 `[]`: 지점 비우기
   * - 배열: 저장 후 대표 lat/lng는 centroid로 동기화
   */
  installLocations?: MediaInstallLocation[] | null;
  price_per_month: number;
  price_note: string;
  /** 대표 가격 기간: month | biweekly | week | day (기본 month) */
  price_period?: string;
  /**
   * 다양한 가격 옵션. JSON 편집 시 `priceOptions`(camelCase)도 동일 의미로 허용.
   * 예: [{ "label":"15초", "price":20000000, "period":"month", "description":"…" }]
   */
  price_options?: Array<{
    label: string;
    price: number;
    period?: string;
    description?: string;
  }> | null;
  width_m: number | null;
  height_m: number | null;
  resolution: string | null;
  operating_hours: string;
  daily_footfall: number | null;
  weekday_footfall: number | null;
  target_age: string;
  impressions: number | null;
  reach: number | null;
  frequency: number | null;
  cpm: number | null;
  engagement_rate: number | null;
  visibility_score: number;
  effect_memo: string;
  extracted_images: string[];
  /** 비우면 좌표가 있을 때 카카오로 자동 수집 */
  nearby_facilities: string;
  /** 비우면 자동(지하철 SW8) */
  nearby_stations: string;
  /** 비우면 자동(백화점·대학·관광 등) */
  nearby_landmarks: string;
  /** 광고주 이력 (쉼표 구분) */
  past_advertisers: string;
  /**
   * 비우면 `inferCatalogTypeFromMediaContent`로 자동 분류.
   * 지정 시: {CATALOG_MEDIA_TYPES} 중 하나.
   */
  type?: string;
};

type QuickAddMediaJsonInput = Record<string, unknown>;

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isStr(v: unknown): v is string {
  return typeof v === "string";
}

function isStrArr(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function optNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function optStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  return null;
}

/** @deprecated full_address까지 반영하려면 `deriveRegionFromAddress` 사용 */
export function deriveRegion(city: string, district: string): string {
  return deriveRegionFromAddress(city, district, "");
}

export function deriveType(subCategory: string): string {
  return deriveTypeFromSubCategory(subCategory);
}

/** Parse textarea → one object or array of objects. */
export function parseQuickAddJsonText(
  text: string,
): { ok: true; raw: unknown[] } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "JSON 내용이 비어 있습니다." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "JSON 파싱 오류";
    return { ok: false, error: `JSON 문법 오류: ${msg}` };
  }
  if (Array.isArray(parsed)) {
    return { ok: true, raw: parsed };
  }
  if (parsed !== null && typeof parsed === "object") {
    return { ok: true, raw: [parsed] };
  }
  return { ok: false, error: "최상위는 객체 또는 배열이어야 합니다." };
}

export function validateQuickAddItem(
  obj: unknown,
  index: number,
): { ok: true; item: QuickAddMediaJson } | { ok: false; error: string } {
  const prefix = `[#${index + 1}]`;
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, error: `${prefix} 항목은 객체여야 합니다.` };
  }
  const o = obj as QuickAddMediaJsonInput;

  if (!isStr(o.media_name) || !o.media_name.trim()) {
    return {
      ok: false,
      error: `${prefix} media_name은 비어 있지 않은 문자열이어야 합니다.`,
    };
  }

  const str = (k: string, def = ""): string => {
    const v = o[k];
    return isStr(v) ? v : def;
  };

  if (o.tags !== undefined && !isStrArr(o.tags)) {
    return {
      ok: false,
      error: `${prefix} tags는 문자열 배열이어야 합니다.`,
    };
  }
  if (
    o.extracted_images !== undefined &&
    !isStrArr(o.extracted_images)
  ) {
    return {
      ok: false,
      error: `${prefix} extracted_images는 문자열 배열이어야 합니다.`,
    };
  }
  const tags = isStrArr(o.tags) ? o.tags : [];
  const images = isStrArr(o.extracted_images) ? o.extracted_images : [];

  const fullAddr = str("full_address", "");
  const cityStr = str("city", "");
  if (!fullAddr.trim() && !cityStr.trim()) {
    return {
      ok: false,
      error: `${prefix} full_address 또는 city 중 하나는 비어 있지 않아야 합니다.`,
    };
  }

  const lat = optNum(o.latitude);
  const lng = optNum(o.longitude);
  if (o.latitude !== undefined && o.latitude !== null && lat === null) {
    return { ok: false, error: `${prefix} latitude는 숫자여야 합니다.` };
  }
  if (o.longitude !== undefined && o.longitude !== null && lng === null) {
    return { ok: false, error: `${prefix} longitude는 숫자여야 합니다.` };
  }

  const ppm = o.price_per_month;
  if (!isNum(ppm)) {
    return { ok: false, error: `${prefix} price_per_month는 숫자여야 합니다.` };
  }

  let vis = 0;
  if (o.visibility_score !== undefined && o.visibility_score !== null) {
    if (!isNum(o.visibility_score)) {
      return {
        ok: false,
        error: `${prefix} visibility_score는 숫자여야 합니다.`,
      };
    }
    vis = Math.max(0, Math.min(100, Math.round(o.visibility_score)));
  }

  const typeRaw = str("type", "").trim();
  if (typeRaw && !isValidCatalogMediaType(typeRaw)) {
    return {
      ok: false,
      error: `${prefix} type은 다음 중 하나여야 합니다: ${CATALOG_MEDIA_TYPES.join(", ")}`,
    };
  }

  let priceOptions: QuickAddMediaJson["price_options"] = null;
  {
    const raw = o.price_options ?? o.priceOptions;
    if (Array.isArray(raw)) {
      const mapped: NonNullable<QuickAddMediaJson["price_options"]> = [];
      for (let oi = 0; oi < raw.length; oi++) {
        const x = raw[oi] as {
          label?: unknown;
          price?: unknown;
          period?: unknown;
          description?: unknown;
        };
        if (typeof x.label !== "string" || typeof x.price !== "number") continue;
        const row: {
          label: string;
          price: number;
          period?: string;
          description?: string;
        } = { label: x.label, price: x.price };
        if (typeof x.period === "string" && x.period.trim()) {
          const pr = coercePriceOptionPeriodForWrite(x.period);
          if (pr.kind === "error") {
            return {
              ok: false,
              error: `${prefix} price_options[${oi}]: ${pr.message}`,
            };
          }
          if (pr.kind === "ok") row.period = pr.period;
        }
        if (typeof x.description === "string" && x.description.trim()) {
          row.description = x.description.trim();
        }
        mapped.push(row);
      }
      priceOptions = mapped.length > 0 ? mapped : null;
    }
  }

  let installLocations: QuickAddMediaJson["installLocations"];
  {
    const hasInstallKey =
      Object.prototype.hasOwnProperty.call(o, "installLocations") ||
      Object.prototype.hasOwnProperty.call(o, "install_locations");
    if (hasInstallKey) {
      const raw = o.installLocations ?? o.install_locations;
      if (raw === null) {
        installLocations = null;
      } else if (!Array.isArray(raw)) {
        return {
          ok: false,
          error: `${prefix} installLocations는 배열 또는 null이어야 합니다.`,
        };
      } else {
        const parsed = parseMediaInstallLocations(raw);
        const invalidCoord = raw.some((row) => {
          if (row === null || typeof row !== "object" || Array.isArray(row)) {
            return true;
          }
          const r = row as { latitude?: unknown; longitude?: unknown };
          const la = optNum(r.latitude);
          const ln = optNum(r.longitude);
          return la === null || ln === null;
        });
        if (invalidCoord && raw.length > 0 && parsed.length === 0) {
          return {
            ok: false,
            error: `${prefix} installLocations 항목은 latitude/longitude 숫자가 필요합니다.`,
          };
        }
        installLocations = parsed.length > 0 ? parsed : null;
      }
    }
  }

  const item: QuickAddMediaJson = {
    media_name: o.media_name.trim(),
    description: str("description", ""),
    sub_category: str("sub_category", ""),
    tags,
    full_address: fullAddr,
    district: str("district", ""),
    city: cityStr,
    latitude: lat,
    longitude: lng,
    ...(installLocations !== undefined ? { installLocations } : {}),
    price_per_month: ppm,
    price_note: str("price_note", ""),
    width_m: optNum(o.width_m),
    height_m: optNum(o.height_m),
    resolution: optStr(o.resolution),
    operating_hours: str("operating_hours", ""),
    daily_footfall: optNum(o.daily_footfall),
    weekday_footfall: optNum(o.weekday_footfall),
    target_age: str("target_age", ""),
    impressions: optNum(o.impressions),
    reach: optNum(o.reach),
    frequency: optNum(o.frequency),
    cpm: optNum(o.cpm),
    engagement_rate: optNum(o.engagement_rate),
    visibility_score: vis,
    effect_memo: str("effect_memo", ""),
    extracted_images: images,
    nearby_facilities: str("nearby_facilities", "") || str("surrounding_facilities", ""),
    nearby_stations: str("nearby_stations", "") || str("nearby_subway", ""),
    nearby_landmarks: str("nearby_landmarks", ""),
    past_advertisers: str("past_advertisers", "") || str("advertiser_history", ""),
    price_period: str("price_period", "") || undefined,
    price_options: priceOptions,
    ...(typeRaw ? { type: typeRaw.toLowerCase() } : {}),
  };

  return { ok: true, item };
}

export function validateQuickAddItems(
  raw: unknown[],
): { ok: true; items: QuickAddMediaJson[] } | { ok: false; error: string } {
  if (raw.length === 0) {
    return { ok: false, error: "등록할 항목이 없습니다." };
  }
  const items: QuickAddMediaJson[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = validateQuickAddItem(raw[i], i);
    if (!r.ok) return r;
    items.push(r.item);
  }
  return { ok: true, items };
}

export type MediaQuickAddCreate = {
  name: string;
  nameEn: string | null;
  location: string;
  region: string;
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
  nearbyFacilities: string | null;
  nearbyStations: string | null;
  nearbyLandmarks: string | null;
  pastAdvertisers: string | null;
  pricePeriod?: "month" | "biweekly" | "week" | "day";
  priceOptions: Array<{
    label: string;
    price: number;
    period?: string;
    description?: string;
  }> | null;
  /**
   * undefined = install_locations 컬럼을 건드리지 않음.
   * null/배열 = `persistMediaInstallLocations`로 별도 저장.
   */
  installLocations?: MediaInstallLocation[] | null;
};

/** Prisma create/update data에서 installLocations를 분리 (raw SQL persist 전용). */
export function splitQuickAddInstallLocations(p: MediaQuickAddCreate): {
  prismaFields: Omit<MediaQuickAddCreate, "installLocations">;
  installLocations: MediaInstallLocation[] | null | undefined;
} {
  const { installLocations, ...prismaFields } = p;
  return { prismaFields, installLocations };
}

export function mediaQuickAddCreateToPrismaUpdate(
  p: MediaQuickAddCreate,
): Prisma.MediaUpdateInput {
  const { prismaFields } = splitQuickAddInstallLocations(p);
  return {
    name: prismaFields.name,
    nameEn: prismaFields.nameEn,
    location: prismaFields.location,
    region: prismaFields.region,
    type: prismaFields.type,
    price: prismaFields.price,
    image: prismaFields.image,
    width: prismaFields.width,
    height: prismaFields.height,
    description: prismaFields.description,
    subCategory: prismaFields.subCategory,
    tags: prismaFields.tags,
    district: prismaFields.district,
    city: prismaFields.city,
    latitude: prismaFields.latitude,
    longitude: prismaFields.longitude,
    priceNote: prismaFields.priceNote,
    widthM: prismaFields.widthM,
    heightM: prismaFields.heightM,
    resolution: prismaFields.resolution,
    operatingHours: prismaFields.operatingHours,
    dailyFootfall: prismaFields.dailyFootfall,
    weekdayFootfall: prismaFields.weekdayFootfall,
    targetAge: prismaFields.targetAge,
    impressions: prismaFields.impressions,
    reach: prismaFields.reach,
    frequency: prismaFields.frequency,
    cpm: prismaFields.cpm,
    engagementRate: prismaFields.engagementRate,
    visibilityScore: prismaFields.visibilityScore,
    effectMemo: prismaFields.effectMemo,
    extractedImages: prismaFields.extractedImages,
    nearbyFacilities: prismaFields.nearbyFacilities,
    nearbyStations: prismaFields.nearbyStations,
    nearbyLandmarks: prismaFields.nearbyLandmarks,
    pastAdvertisers: prismaFields.pastAdvertisers,
    ...(prismaFields.pricePeriod
      ? {
          pricePeriod: prismaFields.pricePeriod as
            | "month"
            | "biweekly"
            | "week"
            | "day",
        }
      : {}),
    priceOptions:
      prismaFields.priceOptions !== null &&
      prismaFields.priceOptions !== undefined
        ? prismaFields.priceOptions
        : Prisma.JsonNull,
  };
}

/** DB Media 행 → quick-add JSON (편집기·GET API용) */
export function mediaDbRowToQuickAddJson(m: {
  name: string;
  type: string;
  description: string | null;
  subCategory: string | null;
  tags: string[];
  location: string;
  district: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number;
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
  nearbyFacilities: string | null;
  nearbyStations: string | null;
  nearbyLandmarks: string | null;
  pastAdvertisers: string | null;
  pricePeriod?: string | null;
  priceOptions?: unknown;
  installLocations?: unknown;
}): QuickAddMediaJson {
  const installs = parseMediaInstallLocations(m.installLocations);
  return {
    media_name: m.name,
    description: m.description ?? "",
    sub_category: m.subCategory ?? "",
    type: m.type,
    tags: [...(m.tags ?? [])],
    full_address: m.location,
    district: m.district ?? "",
    city: m.city ?? "",
    latitude: m.latitude,
    longitude: m.longitude,
    ...(installs.length > 0 ? { installLocations: installs } : {}),
    price_per_month: m.price,
    price_note: m.priceNote ?? "",
    width_m: m.widthM,
    height_m: m.heightM,
    resolution: m.resolution,
    operating_hours: m.operatingHours ?? "",
    daily_footfall: m.dailyFootfall,
    weekday_footfall: m.weekdayFootfall,
    target_age: m.targetAge ?? "",
    impressions: m.impressions,
    reach: m.reach,
    frequency: m.frequency,
    cpm: m.cpm,
    engagement_rate: m.engagementRate,
    visibility_score: m.visibilityScore,
    effect_memo: m.effectMemo ?? "",
    extracted_images: [...(m.extractedImages ?? [])],
    nearby_facilities: m.nearbyFacilities ?? "",
    nearby_stations: m.nearbyStations ?? "",
    nearby_landmarks: m.nearbyLandmarks ?? "",
    past_advertisers: m.pastAdvertisers ?? "",
    price_period: m.pricePeriod ?? undefined,
    price_options: Array.isArray(m.priceOptions) ? m.priceOptions as Array<{ label: string; price: number; period?: string }> : null,
  };
}

/**
 * 에디터에 표시할 객체: quick-add 필드 + 문서용 별칭 키
 * (surrounding_facilities / nearby_subway / advertiser_history)
 */
export function quickAddJsonWithAliasKeys(
  row: QuickAddMediaJson,
): Record<string, unknown> {
  return {
    ...row,
    surrounding_facilities: row.nearby_facilities,
    nearby_subway: row.nearby_stations,
    advertiser_history: row.past_advertisers,
    /** `price_options`와 동일 배열 — camelCase 에디터·목업 JSON과 동기화 */
    priceOptions: row.price_options ?? null,
    /** snake_case 별칭 — bulk/가이드 문서와 동기화 */
    ...(row.installLocations !== undefined
      ? { install_locations: row.installLocations }
      : {}),
  };
}

export function mapQuickAddToDb(row: QuickAddMediaJson): MediaQuickAddCreate {
  const location =
    row.full_address.trim() ||
    [row.city, row.district].filter(Boolean).join(" ").trim() ||
    row.city ||
    "(주소 미입력)";

  const locEnriched = enrichCityDistrictFromAddress(
    row.city,
    row.district,
    location,
  );
  const city = locEnriched.city.trim();
  const district = locEnriched.district.trim();

  let subRaw = row.sub_category.trim();
  if (!subRaw) {
    subRaw = inferSubCategoryFromText(row.media_name, row.description);
  }
  const subNormalized = normalizeSubCategory(subRaw) || subRaw;
  const region = deriveRegionFromAddress(city, district, location);
  const price = Math.round(row.price_per_month);
  const imgs = row.extracted_images.filter(Boolean);

  const autoTags = extractAutoTags({
    name: row.media_name,
    location,
    description: row.description,
    nearbyStations: row.nearby_stations,
    nearbyLandmarks: row.nearby_landmarks,
    nearbyFacilities: row.nearby_facilities,
    city,
    district,
    subCategory: subNormalized,
  });
  const tags = mergeManualAndAutoTags(row.tags, autoTags);

  const inferredType = inferCatalogTypeFromMediaContent({
    subCategory: `${subRaw} ${subNormalized}`,
    name: row.media_name,
    description: row.description,
    location,
    tags,
    nearbyFacilities: row.nearby_facilities,
    nearbyStations: row.nearby_stations,
    nearbyLandmarks: row.nearby_landmarks,
  });
  const type =
    row.type?.trim() && isValidCatalogMediaType(row.type)
      ? row.type.trim().toLowerCase()
      : inferredType;

  let latitude = row.latitude;
  let longitude = row.longitude;
  let installLocations: MediaInstallLocation[] | null | undefined;
  if (row.installLocations !== undefined) {
    const resolved = resolveMediaCoordsForSave({
      installLocations: row.installLocations,
      latitude: row.latitude,
      longitude: row.longitude,
    });
    latitude = resolved.latitude;
    longitude = resolved.longitude;
    installLocations = resolved.installLocations;
  }

  return {
    name: row.media_name,
    nameEn: null,
    location,
    region,
    type,
    price: Number.isFinite(price) ? price : 0,
    image: imgs[0] ?? null,
    width: row.width_m != null ? String(row.width_m) : null,
    height: row.height_m != null ? String(row.height_m) : null,
    description: row.description.trim() || null,
    subCategory: subNormalized.trim() || null,
    tags,
    district: district || null,
    city: city || null,
    latitude,
    longitude,
    ...(installLocations !== undefined ? { installLocations } : {}),
    priceNote: row.price_note.trim() || null,
    widthM: row.width_m,
    heightM: row.height_m,
    resolution: row.resolution,
    operatingHours: row.operating_hours.trim() || null,
    dailyFootfall: row.daily_footfall,
    weekdayFootfall: row.weekday_footfall,
    targetAge: row.target_age.trim() || null,
    impressions: row.impressions,
    reach: row.reach,
    frequency: row.frequency,
    cpm: row.cpm,
    engagementRate: row.engagement_rate,
    visibilityScore: row.visibility_score,
    effectMemo: row.effect_memo.trim() || null,
    extractedImages: imgs,
    nearbyFacilities: row.nearby_facilities.trim() || null,
    nearbyStations: row.nearby_stations.trim() || null,
    nearbyLandmarks: row.nearby_landmarks.trim() || null,
    pastAdvertisers: row.past_advertisers.trim() || null,
    ...(row.price_period?.trim() ? { pricePeriod: row.price_period.trim() as "month" | "biweekly" | "week" | "day" } : {}),
    priceOptions: Array.isArray(row.price_options)
      ? (row.price_options as Array<{
          label: string;
          price: number;
          period?: string;
          description?: string;
        }>)
          .filter((o) => typeof o.label === "string" && typeof o.price === "number")
          .map((o) => {
            const out: {
              label: string;
              price: number;
              period?: string;
              description?: string;
            } = { label: o.label, price: o.price };
            if (typeof o.period === "string" && o.period.trim()) {
              const pr = coercePriceOptionPeriodForWrite(o.period);
              // Already validated in validateQuickAddItem — coerce aliases again for safety
              if (pr.kind === "ok") out.period = pr.period;
            }
            if (typeof o.description === "string" && o.description.trim()) {
              out.description = o.description.trim();
            }
            return out;
          })
      : null,
  };
}
