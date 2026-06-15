import type { MediaNetwork, MediaNetworkLocation } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { dedupeImageUrls, type MediaItem } from "@/lib/media-data";
import {
  NETWORK_TYPE_CODES,
  NETWORK_TYPE_LABELS,
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

/** 카드/견적 기본 표시 월액(만원): 패키지가 있으면 우선, 없으면 개당×최소단위 */
export function defaultDisplayMonthlyPrice(n: {
  pricePackage: number | null;
  pricePerUnit: number | null;
  minUnits: number;
  packageOptions: unknown;
}): number {
  const tiers = parsePackageOptions(n.packageOptions);
  if (tiers.length > 0) return tiers[0].price;
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
  const displayPrice = defaultDisplayMonthlyPrice(n);
  const centerLat =
    n.locations.find((l) => l.latitude != null)?.latitude ?? 37.5665;
  const centerLng =
    n.locations.find((l) => l.longitude != null)?.longitude ?? 126.978;

  return {
    id,
    name: n.name,
    nameEn: n.nameEn ?? n.name,
    location: locSummary,
    locationEn: locSummary,
    region,
    subCategory: n.type,
    tags: ["network", n.type],
    type: "network",
    price: displayPrice,
    pricePeriod: "month",
    lat: centerLat,
    lng: centerLng,
    dailyFootTraffic: 0,
    monthlyFootTraffic: undefined,
    features: n.description ?? n.features ?? undefined,
    featuresEn: n.description ?? n.features ?? undefined,
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
