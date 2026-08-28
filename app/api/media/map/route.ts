import {
  resolveMapDisplayMode,
  resolveServiceRegionLabel,
  type MapDisplayMode,
} from "@/lib/media-map/map-display-mode";
import { mediaItemIntersectsMapBounds } from "@/lib/media-detail-map-markers";
import { getPublicMediaMapCatalogCached } from "@/lib/public-media-map-catalog-cache";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import { resolveMediaDisplayPrice } from "@/lib/media-price-format";
import { filterMediaByDiscoveryChips } from "@/lib/media-discovery-client-filter";
import {
  sortMapCatalogItems,
  type MapCatalogFilterParams,
} from "@/lib/public-media-map-filter";
import { applyMapPinResponseLimit } from "@/lib/media-map/map-pin-response-limit";
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

function itemHasAnyCoordinate(m: MediaItem): boolean {
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
  return hasValidCoord || hasInstallCoords;
}

function itemIncludedInMapList(
  m: MediaItem,
  bounds: {
    swLat: number;
    neLat: number;
    swLng: number;
    neLng: number;
  } | null,
  nationalScope: boolean,
): boolean {
  const mode = resolveMapDisplayMode(m);

  if (mode === "service_region" || mode === "location_unknown") {
    return true;
  }

  if (!itemHasAnyCoordinate(m)) return false;

  if (!nationalScope && bounds) {
    return mediaItemIntersectsMapBounds(m, bounds);
  }

  return true;
}

function toMapItem(
  m: MediaItem,
  mapDisplayMode: MapDisplayMode,
  serviceRegionLabel: string | undefined,
) {
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
    catalogPrice: m.price,
    catalogPricePeriod: m.pricePeriod,
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
    mapDisplayMode,
    serviceRegionLabel: serviceRegionLabel ?? null,
    /** @deprecated `mapDisplayMode === "location_unknown"` 사용 */
    locationUnknown: mapDisplayMode === "location_unknown",
    coverageDistrictCodes:
      m.coverageDistrictCodes?.length ? [...m.coverageDistrictCodes] : undefined,
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

    const minPrice =
      parseFloatOrNull(sp.get("minPrice")) ??
      parseFloatOrNull(sp.get("priceMin"));
    const maxPrice =
      parseFloatOrNull(sp.get("maxPrice")) ??
      parseFloatOrNull(sp.get("priceMax"));

    const nationalScope = sp.get("nationalScope") === "1";

    const filterParams: MapCatalogFilterParams = {
      category: sp.get("category")?.trim() || sp.get("type")?.trim() || null,
      target: sp.get("target")?.trim() || null,
      region: sp.get("region")?.trim() || null,
      q: sp.get("q")?.trim() || null,
      sort: parseSort(sp.get("sort")),
      minPrice,
      maxPrice,
    };

    const chipFilterOpts = {
      category: filterParams.category ?? undefined,
      mainCategory: sp.get("mainCategory")?.trim() || undefined,
      subCategory: sp.get("subCategory")?.trim() || undefined,
      target: filterParams.target ?? undefined,
      region: filterParams.region ?? undefined,
      regionMain: sp.get("regionMain")?.trim() || undefined,
      regionSub: sp.get("regionSub")?.trim() || undefined,
      priceMin:
        sp.get("priceMin")?.trim() ||
        (minPrice != null ? String(minPrice) : undefined),
      priceMax:
        sp.get("priceMax")?.trim() ||
        (maxPrice != null ? String(maxPrice) : undefined),
      features: sp.get("features")?.trim() || undefined,
      query: filterParams.q ?? undefined,
    };

    const { catalog: all, facets } = await getPublicMediaMapCatalogCached();

    const filterMatched = filterMediaByDiscoveryChips(all, chipFilterOpts);

    const bounds =
      swLat != null && neLat != null && swLng != null && neLng != null
        ? { swLat, neLat, swLng, neLng }
        : null;

    const filtered = filterMatched.filter((m) =>
      itemIncludedInMapList(m, bounds, nationalScope),
    );

    const sorted = sortMapCatalogItems(filtered, filterParams.sort);

    const zoomRaw = parseFloatOrNull(sp.get("zoom"));
    const zoom =
      zoomRaw != null && zoomRaw >= 1 && zoomRaw <= 14
        ? Math.round(zoomRaw)
        : null;

    const { items: limitedCatalog, mapPlottableTotal, mapPinsReturned, mapPinsTruncated } =
      applyMapPinResponseLimit(sorted, {
        bounds,
        zoom,
        prioritizeViewport: true,
      });

    let serviceRegionTotal = 0;
    let locationUnknownTotal = 0;

    const items = limitedCatalog.map((m) => {
      const mapDisplayMode = resolveMapDisplayMode(m);
      const serviceRegionLabel = resolveServiceRegionLabel(m);
      if (mapDisplayMode === "service_region") serviceRegionTotal += 1;
      else if (mapDisplayMode === "location_unknown") locationUnknownTotal += 1;
      return toMapItem(m, mapDisplayMode, serviceRegionLabel);
    });

    return apiOk({
      items,
      total: items.length,
      matchTotal: filterMatched.length,
      mapPlottableTotal,
      mapPinsReturned,
      mapPinsTruncated,
      serviceRegionTotal,
      locationUnknownTotal,
      facets,
    });
  } catch (e) {
    return apiServerError(e, "media/map");
  }
}
