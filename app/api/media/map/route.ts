import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { mediaItemIntersectsMapBounds } from "@/lib/media-detail-map-markers";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import { resolveMediaDisplayPrice } from "@/lib/media-price-format";
import {
  matchesMapCatalogFilter,
  sortMapCatalogItems,
  type MapCatalogFilterParams,
} from "@/lib/public-media-map-filter";
import { getPrimaryMediaImageUrl, type MediaItem } from "@/lib/media-data";
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
  const display = resolveMediaDisplayPrice(m);
  return {
    id: m.id,
    name: m.name,
    location: m.location,
    region: m.region,
    city: m.city ?? null,
    district: m.district ?? null,
    type: m.type,
    subCategory: m.subCategory ?? null,
    price: display.priceWon,
    pricePeriod: display.period,
    createdAt: m.createdAt ?? null,
    lat: m.lat,
    lng: m.lng,
    image: getPrimaryMediaImageUrl(m),
    availability: m.availability ?? null,
    visibilityScore: m.visibilityScore ?? 0,
    dailyFootTraffic: m.dailyFootTraffic ?? null,
    impressions: m.impressions ?? null,
    cpm: m.cpm ?? null,
    isVerified: m.isVerified === true,
    isInstantBooking: isInstantBookingEligible({
      instantBookingEnabled: m.instantBookingEnabled ?? false,
      availability: m.availability,
      catalogSource: m.catalogSource,
    }).eligible,
    installLocations: m.installLocations?.length
      ? m.installLocations.map((p) => ({
          label: p.label,
          lat: p.lat,
          lng: p.lng,
        }))
      : undefined,
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
      const hasValidCoord =
        Number.isFinite(m.lat) &&
        Number.isFinite(m.lng) &&
        Math.abs(m.lat) <= 90 &&
        Math.abs(m.lng) <= 180;
      const hasInstallCoords = (m.installLocations ?? []).some(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng) &&
          Math.abs(p.lat) <= 90 &&
          Math.abs(p.lng) <= 180,
      );
      if (!hasValidCoord && !hasInstallCoords) return false;
      if (swLat != null && neLat != null && swLng != null && neLng != null) {
        if (
          !mediaItemIntersectsMapBounds(m, {
            swLat,
            neLat,
            swLng,
            neLng,
          })
        ) {
          return false;
        }
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
