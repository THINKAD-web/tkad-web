import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  NETWORK_REGION_META,
  normalizeNetworkRegionKey,
  type NetworkMapPoint,
  type NetworkMediaStats,
  type NetworkRegionStat,
} from "@/lib/network-media-stats";

const DEFAULT_UNIT_PRICE_MAN = 5;

function emptyStats(): NetworkMediaStats {
  return {
    regions: [],
    mapPoints: [],
    nationalAvgPriceManWon: DEFAULT_UNIT_PRICE_MAN,
    totalLocations: 0,
    totalUnits: 0,
    networkCount: 0,
    heroImage: null,
    galleryImages: [],
    featuredNetworks: [],
    minUnitsTypical: 1,
  };
}

export async function getNetworkMediaStats(): Promise<NetworkMediaStats> {
  if (!isDatabaseConfigured()) return emptyStats();

  try {
    const db = getPrisma();
    const [networks, locations] = await Promise.all([
      db.mediaNetwork.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          nameEn: true,
          type: true,
          pricePerUnit: true,
          minUnits: true,
          totalLocations: true,
          image: true,
          galleryImages: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.mediaNetworkLocation.findMany({
        where: { network: { isActive: true } },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          regionMain: true,
          regionSub: true,
          unitCount: true,
          network: {
            select: { name: true, pricePerUnit: true },
          },
        },
      }),
    ]);

    const priceByNetwork = new Map(
      networks.map((n) => [n.id, n.pricePerUnit ?? DEFAULT_UNIT_PRICE_MAN]),
    );

    const regionAgg = new Map<
      string,
      { locations: number; units: number; priceSum: number; priceN: number }
    >();

    const mapPoints: NetworkMapPoint[] = [];
    let totalUnits = 0;

    for (const loc of locations) {
      const units = Math.max(1, loc.unitCount ?? 1);
      totalUnits += units;
      const regionKey = normalizeNetworkRegionKey(
        loc.regionMain,
        loc.regionSub,
      );
      const priceMan = loc.network.pricePerUnit ?? DEFAULT_UNIT_PRICE_MAN;

      const bucket = regionAgg.get(regionKey) ?? {
        locations: 0,
        units: 0,
        priceSum: 0,
        priceN: 0,
      };
      bucket.locations += 1;
      bucket.units += units;
      bucket.priceSum += priceMan;
      bucket.priceN += 1;
      regionAgg.set(regionKey, bucket);

      if (
        loc.latitude != null &&
        loc.longitude != null &&
        Number.isFinite(loc.latitude) &&
        Number.isFinite(loc.longitude)
      ) {
        const meta = NETWORK_REGION_META[regionKey] ?? NETWORK_REGION_META.other;
        mapPoints.push({
          id: loc.id,
          lat: loc.latitude,
          lng: loc.longitude,
          name: loc.name,
          regionKey,
          regionLabelKo: meta.labelKo,
          unitCount: units,
          priceManWon: priceMan,
          networkName: loc.network.name,
        });
      }
    }

    const regions: NetworkRegionStat[] = [...regionAgg.entries()]
      .map(([key, v]) => {
        const meta = NETWORK_REGION_META[key] ?? NETWORK_REGION_META.other;
        const avg =
          v.priceN > 0
            ? Math.round(v.priceSum / v.priceN)
            : DEFAULT_UNIT_PRICE_MAN;
        return {
          key,
          labelKo: meta.labelKo,
          labelEn: meta.labelEn,
          locationCount: v.locations,
          unitCount: v.units,
          avgPriceManWon: avg,
          availableUnits: v.units,
        };
      })
      .sort(
        (a, b) =>
          (NETWORK_REGION_META[a.key]?.order ?? 99) -
          (NETWORK_REGION_META[b.key]?.order ?? 99),
      );

    const nationalAvg =
      regions.length > 0
        ? Math.round(
            regions.reduce((s, r) => s + r.avgPriceManWon, 0) / regions.length,
          )
        : Math.round(
            networks.reduce(
              (s, n) => s + (n.pricePerUnit ?? DEFAULT_UNIT_PRICE_MAN),
              0,
            ) / Math.max(1, networks.length),
          ) || DEFAULT_UNIT_PRICE_MAN;

    const gallerySet = new Set<string>();
    const featuredNetworks = networks.slice(0, 8).map((n) => {
      if (n.image) gallerySet.add(n.image);
      for (const g of n.galleryImages ?? []) {
        if (g?.trim()) gallerySet.add(g.trim());
      }
      return {
        id: n.id,
        name: n.name,
        nameEn: n.nameEn,
        image: n.image,
        pricePerUnit: n.pricePerUnit ?? DEFAULT_UNIT_PRICE_MAN,
        totalLocations: n.totalLocations,
        minUnits: n.minUnits,
        type: n.type,
      };
    });

    const minUnitsTypical =
      networks.length > 0
        ? Math.min(...networks.map((n) => Math.max(1, n.minUnits)))
        : 1;

    return {
      regions,
      mapPoints,
      nationalAvgPriceManWon: nationalAvg || DEFAULT_UNIT_PRICE_MAN,
      totalLocations: locations.length,
      totalUnits,
      networkCount: networks.length,
      heroImage: networks.find((n) => n.image)?.image ?? null,
      galleryImages: [...gallerySet].slice(0, 12),
      featuredNetworks,
      minUnitsTypical,
    };
  } catch {
    return emptyStats();
  }
}
