import { NETWORK_TYPE_CODES } from "@/lib/media-network-types";

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

const TYPE_SET = new Set<string>(NETWORK_TYPE_CODES as unknown as string[]);

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

/** 원 단위(≥10만) → 만원. 이미 만원 단위면 그대로. */
export function normalizePriceManWon(v: number | null): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (n >= 100_000) return Math.round(n / 10_000);
  return n;
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
    return { pricePackage: normalizePriceManWon(asNum), priceNote };
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
    return { ...o, price: normalizePriceManWon(price) };
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
  const address = str(o.address) || null;
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
    fullAddress: str(o.fullAddress) || null,
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

export type ParseNetworkQuickAddResult =
  | { ok: true; data: NetworkQuickAddParsed }
  | { ok: false; error: string };

/**
 * 관리자용 네트워크 일괄 JSON.
 * `totalLocations`·`regions` 생략 시 locations 기준으로 자동 채움.
 */
export function parseNetworkQuickAddJson(text: string): ParseNetworkQuickAddResult {
  let root: unknown;
  try {
    root = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "JSON 파싱 실패" };
  }
  if (!root || typeof root !== "object") {
    return { ok: false, error: "객체 형식의 JSON이 필요합니다." };
  }
  const o = root as Record<string, unknown>;
  const name = str(o.name);
  const type = str(o.type);
  if (!name) return { ok: false, error: "name 필수" };
  if (!type || !TYPE_SET.has(type)) {
    return {
      ok: false,
      error: `type 필수 — 허용: ${NETWORK_TYPE_CODES.join(", ")}`,
    };
  }

  const locPayload = normalizeLocations(o.locations);

  const addressesForInfer = locPayload
    .map((l) => l.address ?? "")
    .filter(Boolean);
  const inferredRegions = inferRegionsFromAddresses(addressesForInfer);

  const regionsManual = strArr(o.regions);
  const regions =
    regionsManual.length > 0 ? regionsManual : inferredRegions;

  const totalFromJson = optNum(o.totalLocations);
  const totalLocations =
    totalFromJson != null && totalFromJson >= 0
      ? Math.round(totalFromJson)
      : locPayload.length;

  let packageOptions: unknown = null;
  if ("packageOptions" in o && o.packageOptions != null) {
    if (typeof o.packageOptions === "string") {
      const t = o.packageOptions.trim();
      if (t) {
        try {
          packageOptions = JSON.parse(t) as unknown;
        } catch {
          return { ok: false, error: "packageOptions JSON 형식 오류" };
        }
      }
    } else {
      packageOptions = o.packageOptions;
    }
  }

  const minUnitsRaw = optNum(o.minUnits);
  const minUnits =
    minUnitsRaw != null && minUnitsRaw >= 1 ? Math.round(minUnitsRaw) : 1;

  const priceNoteBase = str(o.priceNote) || null;
  const pkg = normalizePricePackageFields(o.pricePackage, priceNoteBase);

  return {
    ok: true,
    data: {
      name,
      nameEn: str(o.nameEn) || null,
      description: str(o.description) || null,
      type,
      pricePerUnit: normalizePriceManWon(optNum(o.pricePerUnit)),
      pricePackage: pkg.pricePackage,
      priceNote: pkg.priceNote,
      minUnits,
      image: str(o.image) || null,
      galleryImages: strArr(o.galleryImages),
      features: str(o.features) || null,
      packageOptions:
        packageOptions != null
          ? normalizePackageOptions(packageOptions)
          : packageOptions,
      isActive: o.isActive === false ? false : true,
      regions,
      totalLocations,
      city: str(o.city) || null,
      district: str(o.district) || null,
      visibilityScore: optInt(o.visibilityScore),
      dailyFootfall: optInt(o.dailyFootfall),
      targetAge: str(o.targetAge) || null,
      effectMemo: str(o.effectMemo) || null,
      operatingHours: str(o.operatingHours) || null,
      tags: strArr(o.tags),
      locations: locPayload,
    },
  };
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
  if (!root || typeof root !== "object") {
    return { ok: false, error: "객체 형식의 JSON이 필요합니다." };
  }
  return parseAndBuildNetworkCreateBody(JSON.stringify(root));
}
