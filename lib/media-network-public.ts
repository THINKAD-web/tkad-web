import type { MediaNetwork, MediaNetworkLocation } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { dedupeImageUrls, type MediaItem } from "@/lib/media-data";
import {
  NETWORK_TYPE_CODES,
  NETWORK_TYPE_LABELS,
  loosePackagePrices,
  type NetworkTypeCode,
  type NetworkPackageTier,
} from "@/lib/media-network-types";

export {
  NETWORK_TYPE_CODES,
  NETWORK_TYPE_LABELS,
  type NetworkTypeCode,
  type NetworkPackageTier,
};

export const NETWORK_CATALOG_ID_PREFIX = "nw_";

/** 네트워크 일일 유동 상한 — 지점 합산 과대 추정 방지 (프라임오피스급) */
export const NETWORK_DAILY_FOOTFALL_CAP = 5_000_000;

/**
 * 데이터 없을 때 정렬·CPM·추천에서 0으로 탈락하지 않도록 하는 최소 일 유동.
 * 스포애니 등 footfall 미입력 네트워크용.
 */
export const NETWORK_DAILY_FOOTFALL_FLOOR = 1_000;

export type NetworkFootfallInput = {
  dailyFootfall: number | null;
  totalLocations: number | null;
  locations: ReadonlyArray<{
    dailyFootfall: number | null;
    unitCount: number | null;
  }>;
};

/**
 * 네트워크 일일 유동 추정 — 지점 합산·unitCount 스케일, DB 단일값 병합.
 *
 * - 지점 `dailyFootfall`은 **지점(사이트) 일 유동**으로 간주해 합산 (평균 X).
 * - `totalLocations` > 합산에 포함된 unit 수이면 전체 규모로 스케일업.
 * - DB `dailyFootfall`이 있고 지점 합이 5배 초과면 운영자 DB 우선 (중복 합산 방지).
 * - 그 외 DB·지점 합 중 큰 값.
 */
export function computeNetworkDailyFootfall(n: NetworkFootfallInput): number {
  const locs = n.locations ?? [];

  const locSum = locs.reduce(
    (s, l) => s + Math.max(0, l.dailyFootfall ?? 0),
    0,
  );

  const locsWithFootfall = locs.filter((l) => (l.dailyFootfall ?? 0) > 0);
  const unitsRepresented = locsWithFootfall.reduce(
    (s, l) => s + Math.max(1, l.unitCount ?? 1),
    0,
  );
  const totalUnits =
    n.totalLocations != null && n.totalLocations > 0
      ? n.totalLocations
      : locs.reduce((s, l) => s + Math.max(1, l.unitCount ?? 1), 0) ||
        locs.length;

  let fromLocations = locSum;
  if (
    locSum > 0 &&
    unitsRepresented > 0 &&
    totalUnits > unitsRepresented
  ) {
    fromLocations = Math.round(locSum * (totalUnits / unitsRepresented));
  }

  const dbVal =
    n.dailyFootfall != null && n.dailyFootfall > 0 ? n.dailyFootfall : 0;

  let result = 0;
  if (dbVal > 0 && fromLocations > 0) {
    if (fromLocations > dbVal * 5) {
      result = dbVal;
    } else {
      result = Math.max(dbVal, fromLocations);
    }
  } else if (dbVal > 0) {
    result = dbVal;
  } else if (fromLocations > 0) {
    result = fromLocations;
  } else {
    result = NETWORK_DAILY_FOOTFALL_FLOOR;
  }

  return Math.min(
    NETWORK_DAILY_FOOTFALL_CAP,
    Math.max(0, Math.round(result)),
  );
}

export function networkCatalogId(rawId: string): string {
  return rawId.startsWith(NETWORK_CATALOG_ID_PREFIX)
    ? rawId
    : `${NETWORK_CATALOG_ID_PREFIX}${rawId}`;
}

export function parseNetworkRawId(catalogId: string): string | null {
  if (!catalogId.startsWith(NETWORK_CATALOG_ID_PREFIX)) return null;
  const rest = catalogId.slice(NETWORK_CATALOG_ID_PREFIX.length);
  return rest.length > 0 ? rest : null;
}

export function mediaItemDetailPath(id: string): string {
  const raw = parseNetworkRawId(id);
  if (raw) return `/media/network/${raw}`;
  return `/media/${id}`;
}

/** 지역 필터용 코드 (목록에서 대표 region 하나) */
export function inferRegionCodeFromLabels(labels: string[]): string {
  const j = labels.join(" ");
  if (/부산/.test(j)) return "busan";
  if (/제주/.test(j)) return "jeju";
  if (/서울|경기|인천|수도권/.test(j)) return "seoul";
  return "national";
}

export function parsePackageOptions(raw: unknown): NetworkPackageTier[] {
  if (!Array.isArray(raw)) return [];
  const out: NetworkPackageTier[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const units = Math.round(Number(o.units));
    const price = Math.round(Number(o.price));
    if (Number.isFinite(units) && units > 0 && Number.isFinite(price) && price >= 0) {
      out.push({ units, price });
    }
  }
  out.sort((a, b) => a.units - b.units);
  return out;
}

/** 카드/견적 기본 표시 월액(원): 패키지가 있으면 우선, 없으면 개당×최소단위 */
export function defaultDisplayMonthlyPrice(n: {
  pricePackage: number | null;
  pricePerUnit: number | null;
  minUnits: number;
  packageOptions: unknown;
}): number {
  const tiers = parsePackageOptions(n.packageOptions);
  if (tiers.length > 0) return tiers[0].price;
  // 패키지 우선: units 없는 packageOptions·pricePackage 를 pricePerUnit 보다 먼저 사용
  const loose = loosePackagePrices(n.packageOptions);
  if (loose.length > 0) return loose[0];
  if (n.pricePackage != null && n.pricePackage > 0) return n.pricePackage;
  const u = Math.max(1, n.minUnits);
  const p = n.pricePerUnit;
  if (p != null && p > 0) return p * u;
  return 0;
}

export function computeNetworkMonthlyPrice(
  n: {
    pricePackage: number | null;
    pricePerUnit: number | null;
    minUnits: number;
    packageOptions: unknown;
  },
  units: number,
): number {
  const u = Math.max(n.minUnits, Math.round(units) || n.minUnits);
  const tiers = parsePackageOptions(n.packageOptions);
  if (tiers.length > 0) {
    let best = tiers[0];
    for (const t of tiers) {
      if (t.units <= u && t.units >= best.units) best = t;
    }
    const exact = tiers.find((t) => t.units === u);
    if (exact) return exact.price;
    const higher = tiers.find((t) => t.units >= u);
    if (higher) return higher.price;
    return tiers[tiers.length - 1].price;
  }
  if (n.pricePerUnit != null && n.pricePerUnit > 0) {
    return n.pricePerUnit * u;
  }
  if (n.pricePackage != null && n.pricePackage > 0) {
    return n.pricePackage;
  }
  return 0;
}

export type MediaNetworkWithLocs = MediaNetwork & {
  locations: MediaNetworkLocation[];
};

export function prismaNetworkToMediaItem(n: MediaNetworkWithLocs): MediaItem {
  const id = networkCatalogId(n.id);
  const imgs = dedupeImageUrls(
    [...(n.image ? [n.image] : []), ...n.galleryImages].filter(Boolean),
  );
  const region = inferRegionCodeFromLabels(n.regions);
  const locSummary =
    n.regions.length > 0 ? n.regions.join(", ") : "전국 네트워크";
  // 가격은 DB·코드 전반에서 원 단위로 통일(일반 매체와 동일). 과거 ×10,000 표시 변환 제거.
  const displayPriceWon = defaultDisplayMonthlyPrice(n);
  const centerLat =
    n.locations.find((l) => l.latitude != null)?.latitude ?? 37.5665;
  const centerLng =
    n.locations.find((l) => l.longitude != null)?.longitude ?? 126.978;

  const footfall = computeNetworkDailyFootfall({
    dailyFootfall: n.dailyFootfall,
    totalLocations: n.totalLocations,
    locations: n.locations,
  });

  return {
    id,
    name: n.name,
    nameEn: n.nameEn ?? n.name,
    location: locSummary,
    locationEn: locSummary,
    region,
    subCategory: n.type,
    tags: ["network", n.type, ...(n.tags ?? [])],
    type: "network",
    price: displayPriceWon,
    pricePeriod: "month",
    lat: centerLat,
    lng: centerLng,
    dailyFootTraffic: footfall,
    monthlyFootTraffic: footfall > 0 ? footfall * 30 : undefined,
    visibilityScore: n.visibilityScore ?? undefined,
    targetAge: n.targetAge ?? undefined,
    operatingHours: n.operatingHours ?? undefined,
    catalogDescription: n.description ?? undefined,
    description: n.description ?? undefined,
    features: n.description ?? n.features ?? undefined,
    featuresEn: n.description ?? n.features ?? undefined,
    priceNote: n.priceNote ?? undefined,
    city: n.city ?? undefined,
    district: n.district ?? undefined,
    regionMain: n.regions[0] ?? n.city ?? undefined,
    installLocations: n.locations
      .filter((l) => l.latitude != null && l.longitude != null)
      .map((l) => ({
        label: l.name,
        location: l.fullAddress ?? l.address ?? undefined,
        lat: l.latitude!,
        lng: l.longitude!,
      })),
    // 전체 지점(좌표 null 포함) — 지점 목록/합계용
    networkLocations: n.locations.map((l) => ({
      name: l.name,
      address: l.fullAddress ?? l.address ?? undefined,
      regionMain: l.regionMain ?? undefined,
      regionSub: l.regionSub ?? undefined,
      unitCount: Math.max(1, l.unitCount ?? 1),
      dailyFootfall: l.dailyFootfall ?? undefined,
      lat: l.latitude ?? undefined,
      lng: l.longitude ?? undefined,
    })),
    sampleImages: imgs.length > 0 ? imgs : [],
    catalogSource: "network",
    networkSubtype: n.type,
    networkTotalLocations: n.totalLocations,
    networkMinUnits: n.minUnits,
    networkPricePerUnit: n.pricePerUnit,
    networkPricePackage: n.pricePackage,
    networkPackageTiers: parsePackageOptions(n.packageOptions),
    networkRegionLabels: n.regions.length > 0 ? [...n.regions] : undefined,
  };
}

export function computeNetworkMonthlyFromMediaItem(
  m: MediaItem,
  units: number,
): number {
  if (m.catalogSource !== "network") return m.price;
  return computeNetworkMonthlyPrice(
    {
      pricePackage: m.networkPricePackage ?? null,
      pricePerUnit: m.networkPricePerUnit ?? null,
      minUnits: m.networkMinUnits ?? 1,
      packageOptions: m.networkPackageTiers ?? null,
    },
    units,
  );
}

export async function fetchPublicMediaNetworks(): Promise<MediaItem[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const db = getPrisma();
    const rows = await db.mediaNetwork.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      include: { locations: true },
    });
    return rows.map(prismaNetworkToMediaItem);
  } catch {
    return [];
  }
}

export async function resolveNetworkMediaDetail(
  rawId: string,
): Promise<MediaNetworkWithLocs | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    const db = getPrisma();
    return await db.mediaNetwork.findFirst({
      where: { id: rawId, isActive: true },
      include: { locations: true },
    });
  } catch {
    return null;
  }
}
