import { NETWORK_TYPE_CODES } from "@/lib/media-network-types";

export type NetworkQuickAddLocationInput = {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type NetworkQuickAddParsed = {
  name: string;
  nameEn: string | null;
  description: string | null;
  type: string;
  pricePerUnit: number | null;
  pricePackage: number | null;
  minUnits: number;
  image: string | null;
  galleryImages: string[];
  features: string | null;
  packageOptions: unknown;
  isActive: boolean;
  regions: string[];
  totalLocations: number;
  locations: Array<{
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  }>;
};

const TYPE_SET = new Set<string>(NETWORK_TYPE_CODES as unknown as string[]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function optNum(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
}

/** 주소 문자열에서 한국 광역 단위 키워드 추출 → `regions` 후보 */
export function inferRegionsFromAddresses(addresses: readonly string[]): string[] {
  const found = new Set<string>();
  for (const raw of addresses) {
    const addr = raw.trim();
    if (!addr) continue;
    if (/서울/.test(addr)) found.add("서울");
    if (/부산/.test(addr)) found.add("부산");
    if (/대구/.test(addr)) found.add("대구");
    if (/인천/.test(addr)) found.add("인천");
    if (/광주/.test(addr)) found.add("광주");
    if (/대전/.test(addr)) found.add("대전");
    if (/울산/.test(addr)) found.add("울산");
    if (/세종/.test(addr)) found.add("세종");
    if (/경기/.test(addr)) found.add("경기");
    if (/강원/.test(addr)) found.add("강원");
    if (/충북|청주|충청북도/.test(addr)) found.add("충북");
    if (/충남|충청남도|천안|아산/.test(addr)) found.add("충남");
    if (/전북|전라북도|전주/.test(addr)) found.add("전북");
    if (/전남|전라남도|광양/.test(addr)) found.add("전남");
    if (/경북|경상북도|구미|포항/.test(addr)) found.add("경북");
    if (/경남|경상남도|창원|김해/.test(addr)) found.add("경남");
    if (/제주/.test(addr)) found.add("제주");
  }
  return [...found];
}

function normalizeLocations(raw: unknown): NetworkQuickAddLocationInput[] {
  if (!Array.isArray(raw)) return [];
  const out: NetworkQuickAddLocationInput[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const name = str(o.name);
    if (!name) continue;
    const address = str(o.address) || null;
    const lat = optNum(o.latitude ?? o.lat);
    const lng = optNum(o.longitude ?? o.lng ?? o.lon);
    out.push({
      name,
      address,
      latitude: lat,
      longitude: lng,
    });
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

  const locInputs = normalizeLocations(o.locations);
  const locPayload = locInputs.map((l) => ({
    name: l.name,
    address: (l.address ?? "").trim() || null,
    latitude:
      l.latitude != null && Number.isFinite(l.latitude) ? l.latitude : null,
    longitude:
      l.longitude != null && Number.isFinite(l.longitude) ? l.longitude : null,
  }));

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

  return {
    ok: true,
    data: {
      name,
      nameEn: str(o.nameEn) || null,
      description: str(o.description) || null,
      type,
      pricePerUnit: optNum(o.pricePerUnit),
      pricePackage: optNum(o.pricePackage),
      minUnits,
      image: str(o.image) || null,
      galleryImages: strArr(o.galleryImages),
      features: str(o.features) || null,
      packageOptions,
      isActive: o.isActive === false ? false : true,
      regions,
      totalLocations,
      locations: locPayload,
    },
  };
}
