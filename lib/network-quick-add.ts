import {
  CATALOG_MEDIA_TYPES,
  inferCatalogTypeFromMediaContent,
  isValidCatalogMediaType,
} from "@/lib/media-auto-categorize";
import {
  NETWORK_TYPE_CODES,
  inferNetworkVenueFromSubCategory,
  isNetworkVenueCode,
  networkVenueTag,
  resolveNetworkCatalogType,
} from "@/lib/media-network-types";

export type NetworkQuickAddLocationInput = {
  name: string;
  address?: string | null;
  fullAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  unitCount?: number;
  regionMain?: string | null;
  regionSub?: string | null;
  dailyFootfall?: number | null;
  priceNote?: string | null;
  note?: string | null;
};

export type NetworkQuickAddLocationParsed = {
  name: string;
  address: string | null;
  fullAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  unitCount: number;
  regionMain: string | null;
  regionSub: string | null;
  dailyFootfall: number | null;
  priceNote: string | null;
  note: string | null;
};

export type NetworkQuickAddParsed = {
  name: string;
  nameEn: string | null;
  description: string | null;
  type: string;
  pricePerUnit: number | null;
  pricePackage: number | null;
  priceNote: string | null;
  minUnits: number;
  image: string | null;
  galleryImages: string[];
  features: string | null;
  packageOptions: unknown;
  isActive: boolean;
  regions: string[];
  totalLocations: number;
  city: string | null;
  district: string | null;
  visibilityScore: number | null;
  dailyFootfall: number | null;
  targetAge: string | null;
  effectMemo: string | null;
  operatingHours: string | null;
  tags: string[];
  locations: NetworkQuickAddLocationParsed[];
};

/** API POST `/api/admin/networks` 페이로드 */
export type NetworkCreateBody = NetworkQuickAddParsed;

/** Prisma Int 필드용 — 문자열·NaN 은 null */
export function coerceNetworkInt(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    const n = Math.round(Number(t));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const VENUE_SET = new Set<string>(NETWORK_TYPE_CODES as unknown as string[]);

type ResolvedNetworkType = {
  catalogType: string;
  venueCode: string | null;
};

function resolveNetworkTypeInput(o: Record<string, unknown>): ResolvedNetworkType {
  const explicit = str(o.type);
  const sub = str(o.sub_category);
  const name = str(o.name) || str(o.media_name);
  const description = str(o.description);
  const tags = strArr(o.tags);

  if (isValidCatalogMediaType(explicit)) {
    const venue =
      (sub && isNetworkVenueCode(sub) ? sub : null) ??
      inferNetworkVenueFromSubCategory(sub);
    return { catalogType: explicit.toLowerCase(), venueCode: venue };
  }

  if (explicit && VENUE_SET.has(explicit)) {
    return {
      catalogType: resolveNetworkCatalogType(explicit),
      venueCode: explicit,
    };
  }

  const networkType = str(o.network_type);
  if (networkType && VENUE_SET.has(networkType)) {
    return {
      catalogType: resolveNetworkCatalogType(networkType),
      venueCode: networkType,
    };
  }

  const venueFromSub = inferNetworkVenueFromSubCategory(sub);
  if (venueFromSub) {
    return {
      catalogType: resolveNetworkCatalogType(venueFromSub),
      venueCode: venueFromSub,
    };
  }

  const fromText = inferNetworkVenueFromSubCategory(
    `${name} ${description} ${sub}`,
  );
  if (fromText) {
    return {
      catalogType: resolveNetworkCatalogType(fromText),
      venueCode: fromText,
    };
  }

  const catalog = inferCatalogTypeFromMediaContent({
    subCategory: sub,
    name,
    description,
    location: str(o.full_address) || str(o.location),
    tags,
  });

  return { catalogType: catalog, venueCode: null };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function optNum(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function optInt(v: unknown): number | null {
  const n = optNum(v);
  return n != null ? Math.round(n) : null;
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
}

/**
 * 가격은 원 단위로 그대로 저장(일반 매체와 통일). 입력값을 정수 원으로만 정규화.
 * (과거에는 만원 단위로 ÷10,000 변환했으나, 표시 ×10,000 과 함께 제거됨.)
 */
export function normalizePriceWon(v: number | null): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return Math.round(v);
}

export function normalizePricePackageFields(
  rawPackage: unknown,
  priceNote: string | null,
): { pricePackage: number | null; priceNote: string | null } {
  if (rawPackage === undefined || rawPackage === null || rawPackage === "") {
    return { pricePackage: null, priceNote };
  }
  const asNum = optNum(rawPackage);
  if (asNum != null) {
    return { pricePackage: normalizePriceWon(asNum), priceNote };
  }
  const label = str(rawPackage);
  if (!label) return { pricePackage: null, priceNote };
  const merged = priceNote
    ? `${priceNote}\n패키지: ${label}`
    : `패키지: ${label}`;
  return { pricePackage: null, priceNote: merged };
}

function normalizePackageOptions(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw;
  return raw.map((item) => {
    if (!item || typeof item !== "object") return item;
    const o = item as Record<string, unknown>;
    const price = optNum(o.price);
    if (price == null) return item;
    return { ...o, price: normalizePriceWon(price) };
  });
}

/** 주소 문자열에서 한국 광역 단위 키워드 추출 → `regions` 후보 */
export function inferRegionsFromAddresses(addresses: readonly string[]): string[] {
  const found = new Set<string>();
  for (const raw of addresses) {
    const main = inferRegionMainFromAddress(raw);
    if (main) found.add(main);
  }
  return [...found];
}

/** 주소에서 시·도 추론 (명시값 없을 때) */
export function inferRegionMainFromAddress(address: string): string | null {
  const addr = address.trim();
  if (!addr) return null;
  if (/서울/.test(addr)) return "서울";
  if (/부산/.test(addr)) return "부산";
  if (/대구/.test(addr)) return "대구";
  if (/인천/.test(addr)) return "인천";
  if (/광주/.test(addr)) return "광주";
  if (/대전/.test(addr)) return "대전";
  if (/울산/.test(addr)) return "울산";
  if (/세종/.test(addr)) return "세종";
  if (/경기/.test(addr)) return "경기";
  if (/강원/.test(addr)) return "강원";
  if (/충북|청주|충청북도/.test(addr)) return "충북";
  if (/충남|충청남도|천안|아산/.test(addr)) return "충남";
  if (/전북|전라북도|전주/.test(addr)) return "전북";
  if (/전남|전라남도|광양/.test(addr)) return "전남";
  if (/경북|경상북도|구미|포항/.test(addr)) return "경북";
  if (/경남|경상남도|창원|김해/.test(addr)) return "경남";
  if (/제주/.test(addr)) return "제주";
  return null;
}

/** 주소에서 구·군 추론 (명시값 없을 때) */
export function inferRegionSubFromAddress(address: string): string | null {
  const addr = address.trim();
  if (!addr) return null;
  const gu = addr.match(/([\uac00-\ud7a3]+구)/);
  if (gu?.[1]) return gu[1];
  const gun = addr.match(/([\uac00-\ud7a3]+군)/);
  if (gun?.[1]) return gun[1];
  return null;
}

function normalizeLocation(o: Record<string, unknown>): NetworkQuickAddLocationParsed | null {
  const name = str(o.name);
  if (!name) return null;
  const address = str(o.address) || str(o.full_address) || null;
  const lat = optNum(o.latitude ?? o.lat);
  const lng = optNum(o.longitude ?? o.lng ?? o.lon);
  const unitCountRaw = optInt(o.unitCount ?? o.units);
  const unitCount =
    unitCountRaw != null && unitCountRaw >= 1 ? unitCountRaw : 1;

  let regionMain = str(o.regionMain) || null;
  let regionSub = str(o.regionSub) || null;
  if (address) {
    if (!regionMain) regionMain = inferRegionMainFromAddress(address);
    if (!regionSub) regionSub = inferRegionSubFromAddress(address);
  }

  const dailyFootfall = optInt(o.dailyFootfall);

  return {
    name,
    address,
    fullAddress: str(o.fullAddress) || str(o.full_address) || null,
    latitude: lat != null && Number.isFinite(lat) ? lat : null,
    longitude: lng != null && Number.isFinite(lng) ? lng : null,
    unitCount,
    regionMain,
    regionSub,
    dailyFootfall: dailyFootfall != null && dailyFootfall >= 0 ? dailyFootfall : null,
    priceNote: str(o.priceNote) || null,
    note: str(o.note) || null,
  };
}

function normalizeLocations(raw: unknown): NetworkQuickAddLocationParsed[] {
  if (!Array.isArray(raw)) return [];
  const out: NetworkQuickAddLocationParsed[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const loc = normalizeLocation(x as Record<string, unknown>);
    if (loc) out.push(loc);
  }
  return out;
}

/** `sub_category`·설명 텍스트 → 레거시 세부 장소 코드 */
export function inferNetworkVenueFromSubCategory(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const rules: Array<[RegExp, string]> = [
    [/버스\s*쉘터|버스쉘터|정류장|bus[\s_-]?shelter/i, "bus_shelter"],
    [/아파트|apartment/i, "apartment"],
    [/지하철\s*기둥|역사\s*기둥|subway[\s_-]?pillar/i, "subway_pillar"],
    [/지하철|역사|subway[\s_-]?station/i, "subway_station"],
    [/편의점|convenience/i, "convenience_store"],
    [/골프|golf/i, "golf_course"],
    [/휴게소|고속도로|highway/i, "highway_rest"],
    [/캠퍼스|대학|campus|키오스크|kiosk/i, "campus_kiosk"],
    [/엘리베이터|elevator/i, "elevator"],
    [/쇼핑몰|백화점|shopping[\s_-]?mall|mall/i, "shopping_mall"],
    [/교보|서점|bookstore/i, "bookstore"],
    [/오피스|office|빌딩/i, "office"],
    [/병원|hospital|의료/i, "hospital"],
  ];
  for (const [re, code] of rules) {
    if (re.test(t)) return code;
  }
  return null;
}

/** @deprecated `inferNetworkVenueFromSubCategory` 사용 */
export const inferNetworkTypeFromSubCategory = inferNetworkVenueFromSubCategory;

/**
 * 일반 매체 quick-add(JSON snake_case)와 동일한 키를 네트워크 등록 필드로 정규화.
 * camelCase 네트워크 전용 키도 그대로 허용.
 */
export function normalizeNetworkQuickAddInput(
  o: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...o };

  const pickStr = (...keys: string[]): string => {
    for (const k of keys) {
      const v = out[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  const setIfMissing = (key: string, value: unknown) => {
    if (
      (out[key] === undefined || out[key] === null || out[key] === "") &&
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      out[key] = value;
    }
  };

  setIfMissing("name", pickStr("name", "media_name"));
  setIfMissing("nameEn", pickStr("nameEn", "name_en"));
  setIfMissing("type", pickStr("type", "network_type"));
  setIfMissing("description", pickStr("description"));
  setIfMissing("priceNote", pickStr("priceNote", "price_note"));
  setIfMissing("targetAge", pickStr("targetAge", "target_age"));
  setIfMissing("operatingHours", pickStr("operatingHours", "operating_hours"));
  setIfMissing("effectMemo", pickStr("effectMemo", "effect_memo"));
  setIfMissing("features", pickStr("features"));
  setIfMissing("city", pickStr("city"));
  setIfMissing("district", pickStr("district"));

  if (out.pricePerUnit == null && out.price_per_unit != null) {
    out.pricePerUnit = out.price_per_unit;
  }
  if (out.pricePerUnit == null && out.price_per_month != null) {
    out.pricePerUnit = out.price_per_month;
  }
  if (out.pricePackage == null && out.price_package != null) {
    out.pricePackage = out.price_package;
  }
  if (out.minUnits == null && out.min_units != null) {
    out.minUnits = out.min_units;
  }
  if (out.visibilityScore == null && out.visibility_score != null) {
    out.visibilityScore = out.visibility_score;
  }
  if (out.dailyFootfall == null && out.daily_footfall != null) {
    out.dailyFootfall = out.daily_footfall;
  }
  if (out.packageOptions == null && out.package_options != null) {
    out.packageOptions = out.package_options;
  }

  const extracted = out.extracted_images ?? out.extractedImages;
  if (Array.isArray(extracted)) {
    const imgs = extracted.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0,
    );
    if (imgs.length > 0) {
      setIfMissing("image", imgs[0]);
      if (
        !Array.isArray(out.galleryImages) ||
        (out.galleryImages as unknown[]).length === 0
      ) {
        out.galleryImages = imgs;
      }
    }
  }
  setIfMissing("image", pickStr("image"));

  const fullAddress = pickStr("full_address", "fullAddress");
  const lat = out.latitude ?? out.lat;
  const lng = out.longitude ?? out.lng ?? out.lon;

  if (Array.isArray(out.locations)) {
    out.locations = out.locations.map((item) => {
      if (!item || typeof item !== "object") return item;
      const l = { ...(item as Record<string, unknown>) };
      if (!str(l.address) && typeof l.full_address === "string") {
        l.address = l.full_address.trim();
      }
      if (!str(l.fullAddress) && typeof l.full_address === "string") {
        l.fullAddress = l.full_address.trim();
      }
      if (l.latitude == null && l.lat != null) l.latitude = l.lat;
      if (l.longitude == null && (l.lng != null || l.lon != null)) {
        l.longitude = l.lng ?? l.lon;
      }
      if (l.unitCount == null && l.units != null) l.unitCount = l.units;
      if (l.dailyFootfall == null && l.daily_footfall != null) {
        l.dailyFootfall = l.daily_footfall;
      }
      return l;
    });
  } else if (fullAddress) {
    const netName = pickStr("name", "media_name") || fullAddress;
    out.locations = [
      {
        name: netName,
        address: fullAddress,
        full_address: fullAddress,
        latitude: lat ?? null,
        longitude: lng ?? null,
      },
    ];
  }

  return out;
}

function unwrapNetworkQuickAddRoot(
  root: unknown,
):
  | { ok: true; obj: Record<string, unknown> }
  | { ok: false; error: string } {
  if (Array.isArray(root)) {
    if (root.length === 0) {
      return { ok: false, error: "등록할 항목이 없습니다." };
    }
    const first = root[0];
    if (!first || typeof first !== "object" || Array.isArray(first)) {
      return { ok: false, error: "[#1] 항목은 객체여야 합니다." };
    }
    return { ok: true, obj: first as Record<string, unknown> };
  }
  if (root !== null && typeof root === "object") {
    const o = root as Record<string, unknown>;
    if (Array.isArray(o.items)) {
      if (o.items.length === 0) {
        return { ok: false, error: "items 배열이 비어 있습니다." };
      }
      const first = o.items[0];
      if (!first || typeof first !== "object" || Array.isArray(first)) {
        return { ok: false, error: "items[0]은 객체여야 합니다." };
      }
      return { ok: true, obj: first as Record<string, unknown> };
    }
    return { ok: true, obj: o };
  }
  return { ok: false, error: "최상위는 객체 또는 배열이어야 합니다." };
}

/** Parse textarea → one object (일반 매체 quick-add와 동일: 객체·배열·`items` 래퍼). */
export function parseNetworkQuickAddJsonText(
  text: string,
): { ok: true; raw: Record<string, unknown> } | { ok: false; error: string } {
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
  const unwrapped = unwrapNetworkQuickAddRoot(parsed);
  if (!unwrapped.ok) return unwrapped;
  return { ok: true, raw: unwrapped.obj };
}

export type ParseNetworkQuickAddResult =
  | { ok: true; data: NetworkQuickAddParsed }
  | { ok: false; error: string };

function parseNetworkQuickAddObject(
  o: Record<string, unknown>,
): ParseNetworkQuickAddResult {
  const normalized = normalizeNetworkQuickAddInput(o);
  const name = str(normalized.name);
  const resolvedType = resolveNetworkTypeInput(normalized);
  const type = resolvedType.catalogType;
  if (!name) {
    return { ok: false, error: "media_name(또는 name) 필수" };
  }
  if (!isValidCatalogMediaType(type)) {
    return {
      ok: false,
      error: `type(또는 sub_category) 필수 — 허용: ${CATALOG_MEDIA_TYPES.join(", ")} (sub_category로 자동 추론 가능)`,
    };
  }

  const baseTags = strArr(normalized.tags);
  const tags = resolvedType.venueCode
    ? [...new Set([...baseTags, networkVenueTag(resolvedType.venueCode)])]
    : baseTags;

  const locPayload = normalizeLocations(normalized.locations);

  const addressesForInfer = locPayload
    .map((l) => l.address ?? "")
    .filter(Boolean);
  const inferredRegions = inferRegionsFromAddresses(addressesForInfer);

  const regionsManual = strArr(normalized.regions);
  const regions =
    regionsManual.length > 0 ? regionsManual : inferredRegions;

  const totalFromJson = optNum(normalized.totalLocations);
  const totalLocations =
    totalFromJson != null && totalFromJson >= 0
      ? Math.round(totalFromJson)
      : locPayload.length;

  let packageOptions: unknown = null;
  if ("packageOptions" in normalized && normalized.packageOptions != null) {
    if (typeof normalized.packageOptions === "string") {
      const t = normalized.packageOptions.trim();
      if (t) {
        try {
          packageOptions = JSON.parse(t) as unknown;
        } catch {
          return { ok: false, error: "packageOptions JSON 형식 오류" };
        }
      }
    } else {
      packageOptions = normalized.packageOptions;
    }
  }

  const minUnitsRaw = optNum(normalized.minUnits);
  const minUnits =
    minUnitsRaw != null && minUnitsRaw >= 1 ? Math.round(minUnitsRaw) : 1;

  const priceNoteBase = str(normalized.priceNote) || null;
  const pkg = normalizePricePackageFields(
    normalized.pricePackage,
    priceNoteBase,
  );

  return {
    ok: true,
    data: {
      name,
      nameEn: str(normalized.nameEn) || null,
      description: str(normalized.description) || null,
      type,
      pricePerUnit: normalizePriceWon(optNum(normalized.pricePerUnit)),
      pricePackage: pkg.pricePackage,
      priceNote: pkg.priceNote,
      minUnits,
      image: str(normalized.image) || null,
      galleryImages: strArr(normalized.galleryImages),
      features: str(normalized.features) || null,
      packageOptions:
        packageOptions != null
          ? normalizePackageOptions(packageOptions)
          : packageOptions,
      isActive: normalized.isActive === false ? false : true,
      regions,
      totalLocations,
      city: str(normalized.city) || null,
      district: str(normalized.district) || null,
      visibilityScore: optInt(normalized.visibilityScore),
      dailyFootfall: optInt(normalized.dailyFootfall),
      targetAge: str(normalized.targetAge) || null,
      effectMemo: str(normalized.effectMemo) || null,
      operatingHours: str(normalized.operatingHours) || null,
      tags,
      locations: locPayload,
    },
  };
}

/**
 * 관리자용 네트워크 일괄 JSON.
 * 일반 매체 quick-add와 동일한 snake_case 기본 필드 + 네트워크 전용 필드(locations 등).
 * `totalLocations`·`regions` 생략 시 locations 기준으로 자동 채움.
 */
export function parseNetworkQuickAddJson(text: string): ParseNetworkQuickAddResult {
  const parsed = parseNetworkQuickAddJsonText(text);
  if (!parsed.ok) return parsed;
  return parseNetworkQuickAddObject(parsed.raw);
}

/** 파싱 결과 → 네트워크 등록 API body (regions/totalLocations 자동 보정) */
export function buildNetworkCreateBody(
  parsed: NetworkQuickAddParsed,
): NetworkCreateBody {
  const regionsAuto = inferRegionsFromAddresses(
    parsed.locations.map((l) => l.address ?? "").filter(Boolean),
  );
  return {
    ...parsed,
    regions: parsed.regions.length > 0 ? parsed.regions : regionsAuto,
    totalLocations:
      parsed.totalLocations > 0
        ? parsed.totalLocations
        : parsed.locations.length,
  };
}

export function parseAndBuildNetworkCreateBody(
  text: string,
): ParseNetworkQuickAddResult & { body?: NetworkCreateBody } {
  const parsed = parseNetworkQuickAddJson(text);
  if (!parsed.ok) return parsed;
  return { ok: true, data: parsed.data, body: buildNetworkCreateBody(parsed.data) };
}

export function parseAndBuildNetworkCreateBodyFromObject(
  root: unknown,
): ParseNetworkQuickAddResult & { body?: NetworkCreateBody } {
  const unwrapped = unwrapNetworkQuickAddRoot(root);
  if (!unwrapped.ok) return unwrapped;
  const parsed = parseNetworkQuickAddObject(unwrapped.obj);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    data: parsed.data,
    body: buildNetworkCreateBody(parsed.data),
  };
}
