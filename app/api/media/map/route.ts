import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import {
  matchesMapCatalogFilter,
  sortMapCatalogItems,
  type MapCatalogFilterParams,
} from "@/lib/public-media-map-filter";
import type { MediaItem } from "@/lib/media-data";
import type { PublicMediaSort } from "@/lib/public-media-query";
import { apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseSort(raw: string | null): PublicMediaSort {
  if (
    raw === "newest" ||
    raw === "price_asc" ||
    raw === "price_desc" ||
    raw === "popular" ||
    raw === "default"
  ) {
    return raw;
  }
  if (raw === "priceAsc") return "price_asc";
  if (raw === "priceDesc") return "price_desc";
  if (raw === "trafficDesc") return "popular";
  return "popular";
}

function toMapItem(m: MediaItem) {
  return {
    id: m.id,
    name: m.name,
    location: m.location,
    region: m.region,
    city: m.city ?? null,
    district: m.district ?? null,
    type: m.type,
    subCategory: m.subCategory ?? null,
    price: catalogPriceFieldToWon(m.price ?? 0),
    pricePeriod: m.pricePeriod ?? "month",
    createdAt: m.createdAt ?? null,
    lat: m.lat,
    lng: m.lng,
    image: m.sampleImages?.[0] ?? null,
    availability: m.availability ?? null,
    visibilityScore: m.visibilityScore ?? 0,
    dailyFootTraffic: m.dailyFootTraffic ?? null,
    impressions: m.impressions ?? null,
    cpm: m.cpm ?? null,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sp = url.searchParams;

    const parseFloatOrNull = (v: string | null): number | null => {
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const swLat = parseFloatOrNull(sp.get("swLat"));
    const swLng = parseFloatOrNull(sp.get("swLng"));
    const neLat = parseFloatOrNull(sp.get("neLat"));
    const neLng = parseFloatOrNull(sp.get("neLng"));

    const filterParams: MapCatalogFilterParams = {
      category: sp.get("category")?.trim() || sp.get("type")?.trim() || null,
      target: sp.get("target")?.trim() || null,
      region: sp.get("region")?.trim() || null,
      q: sp.get("q")?.trim() || null,
      sort: parseSort(sp.get("sort")),
    };

    const all = await fetchPublicMediaCatalog();

    const filtered = all.filter((m) => {
      const lat = Number(m.lat);
      const lng = Number(m.lng);
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180
      ) {
        return false;
      }
      if (swLat != null && neLat != null && swLng != null && neLng != null) {
        if (lat < swLat || lat > neLat) return false;
        if (lng < swLng || lng > neLng) return false;
      }
      return matchesMapCatalogFilter(m, filterParams);
    });

    const items = sortMapCatalogItems(filtered, filterParams.sort).map(toMapItem);

    const distinctRegions = Array.from(
      new Set(all.map((m) => m.region).filter((v): v is string => !!v)),
    ).sort();
    const distinctTypes = Array.from(
      new Set(all.map((m) => m.type).filter((v): v is string => !!v)),
    ).sort();

    return apiOk({
      items,
      total: items.length,
      facets: { regions: distinctRegions, types: distinctTypes },
    });
  } catch (e) {
    return apiServerError(e, "media/map");
  }
}
