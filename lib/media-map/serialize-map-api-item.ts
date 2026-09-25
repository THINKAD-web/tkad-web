import type { MapMapItem } from "@/components/media-map/media-map-types";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import { getPrimaryMediaImageUrl, type MediaItem } from "@/lib/media-data";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import { mediaItemToImpressionsInput } from "@/lib/media-impressions-ssot";
import { resolveMediaDisplayPrice } from "@/lib/media-price-format";
import type { MapDisplayMode } from "@/lib/media-map/map-display-mode";

/**
 * 목록 SSR(`mapMediaItemToHomeCatalog`)과 동일한 가격·노출·CPM 입력을 지도 API 항목에 포함.
 */
export function serializeMapApiItemFromMediaItem(
  m: MediaItem,
  mapDisplayMode: MapDisplayMode,
  serviceRegionLabel: string | undefined,
): MapMapItem {
  const catalog = mapMediaItemToHomeCatalog(m);
  const imp = mediaItemToImpressionsInput(m);
  const display = resolveMediaDisplayPrice(m);

  return {
    id: m.id,
    slug: m.slug?.trim() || undefined,
    name: m.name,
    location: m.location,
    region: m.region,
    city: m.city ?? null,
    district: m.district ?? null,
    type: m.type,
    subCategory: m.subCategory ?? null,
    price: display.priceWon,
    pricePeriod: display.period,
    priceOptions: m.priceOptions?.length ? [...m.priceOptions] : undefined,
    catalogPrice: m.price,
    catalogPricePeriod: m.pricePeriod,
    productPriceWon: catalog.productPriceWon ?? null,
    productPriceDays: catalog.productPriceDays ?? null,
    createdAt: m.createdAt ?? null,
    lat: m.lat,
    lng: m.lng,
    image: getPrimaryMediaImageUrl(m),
    availability: m.availability ?? null,
    visibilityScore: m.visibilityScore ?? 0,
    dailyFootTraffic: m.dailyFootTraffic ?? null,
    monthlyFootTraffic:
      catalog.monthlyFootTraffic ?? imp.monthlyFootTraffic ?? null,
    impressions: imp.impressions ?? null,
    engineDailyImpressions: imp.engineDailyImpressions ?? null,
    impressionModelVersion: imp.impressionModelVersion ?? null,
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
    locationUnknown: mapDisplayMode === "location_unknown",
    coverageDistrictCodes:
      m.coverageDistrictCodes?.length ? [...m.coverageDistrictCodes] : undefined,
  };
}
