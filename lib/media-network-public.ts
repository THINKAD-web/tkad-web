import type { MediaNetwork, MediaNetworkLocation } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { dedupeImageUrls, type MediaItem } from "@/lib/media-data";
import {
  computeNetworkDailyFootfall,
  NETWORK_DAILY_FOOTFALL_CAP,
  NETWORK_DAILY_FOOTFALL_FLOOR,
  type NetworkFootfallInput,
} from "@/lib/media-network-footfall";
import {
  NETWORK_TYPE_CODES,
  NETWORK_TYPE_LABELS,
  loosePackagePrices,
  resolveNetworkCatalogType,
  type NetworkTypeCode,
  type NetworkPackageTier,
} from "@/lib/media-network-types";
import { inferBrowseRegionFromMedia } from "@/lib/media-browse-regions";
import { resolveBrowseRegionIds } from "@/lib/network-location-enrich";
import {
  resolveNetworkBrowseForPublic,
  resolveNetworkTargetForPublic,
  resolveNetworkVenueCodeFromRow,
} from "@/lib/network-taxonomy";

export {
  NETWORK_TYPE_CODES,
  NETWORK_TYPE_LABELS,
  type NetworkTypeCode,
  type NetworkPackageTier,
};

export {
  computeNetworkDailyFootfall,
  NETWORK_DAILY_FOOTFALL_CAP,
  NETWORK_DAILY_FOOTFALL_FLOOR,
  type NetworkFootfallInput,
} from "@/lib/media-network-footfall";

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

  const catalogMainType = resolveNetworkCatalogType(n.type);
  const venueCode = resolveNetworkVenueCodeFromRow(n);

  const browseTaxonomy = resolveNetworkBrowseForPublic(n);
  const targetCategory = resolveNetworkTargetForPublic(n);

  const browseFromNetwork = inferBrowseRegionFromMedia({
    region: n.regions[0],
    city: n.city,
    district: n.district,
    location: locSummary,
  });

  let browseMain = n.regionMain?.trim() || browseFromNetwork.main;
  let browseSub = n.regionSub?.trim() || browseFromNetwork.sub;
  for (const loc of n.locations) {
    const resolved = resolveBrowseRegionIds({
      regionMain: loc.regionMain,
      regionSub: loc.regionSub,
      address: loc.fullAddress ?? loc.address,
    });
    if (resolved.regionMain) {
      browseMain = browseMain ?? resolved.regionMain;
      browseSub = browseSub ?? resolved.regionSub;
      break;
    }
  }

  const mediaCategory = [
    browseTaxonomy.mediaMainCategory,
    ...(browseTaxonomy.mediaSubCategory
      ? [browseTaxonomy.mediaSubCategory]
      : []),
    catalogMainType,
    ...(venueCode ? [venueCode] : []),
  ];

  return {
    id,
    name: n.name,
    nameEn: n.nameEn ?? n.name,
    location: locSummary,
    locationEn: locSummary,
    region,
    subCategory: venueCode ?? n.type,
    tags: ["network", n.type, ...(n.tags ?? [])],
    type: "network",
    mediaMainCategory: browseTaxonomy.mediaMainCategory,
    mediaSubCategory: browseTaxonomy.mediaSubCategory,
    targetCategory,
    mediaCategory,
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
    regionMain: browseMain ?? undefined,
    regionSub: browseSub ?? undefined,
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
