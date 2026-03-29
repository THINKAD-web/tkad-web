import { enrichQuickAddMediaFromKakao } from "@/lib/media-location-enrich";
import { maybeEstimateDailyFootfall } from "@/lib/media-daily-footfall-estimate";
import { maybeAutoFillNearbyMediaFields } from "@/lib/media-nearby-facilities";
import {
  mapQuickAddToDb,
  type MediaQuickAddCreate,
  type QuickAddMediaJson,
} from "@/lib/media-quick-add";

/** quick-add POST와 동일한 보강(카카오·주변·유동) 후 DB 반영용 페이로드 생성 */
export async function enrichQuickAddRowForPersist(row: QuickAddMediaJson): Promise<{
  createPayload: MediaQuickAddCreate;
  addressVerified: boolean;
  autoPopulatedAt: Date | null;
}> {
  const { row: enriched, addressVerified: geoVerified } =
    await enrichQuickAddMediaFromKakao(row);
  const autoNear = await maybeAutoFillNearbyMediaFields({
    existingFacilities: enriched.nearby_facilities,
    existingStations: enriched.nearby_stations,
    existingLandmarks: enriched.nearby_landmarks,
    latitude: enriched.latitude,
    longitude: enriched.longitude,
  });
  let withNearby = enriched;
  if (autoNear) {
    withNearby = {
      ...withNearby,
      nearby_facilities:
        autoNear.nearbyFacilities ?? withNearby.nearby_facilities,
      nearby_stations: autoNear.nearbyStations ?? withNearby.nearby_stations,
      nearby_landmarks:
        autoNear.nearbyLandmarks ?? withNearby.nearby_landmarks,
    };
  }
  const foot = await maybeEstimateDailyFootfall({
    existingDaily: withNearby.daily_footfall,
    latitude: withNearby.latitude,
    longitude: withNearby.longitude,
    city: withNearby.city,
    district: withNearby.district,
  });
  const withFoot =
    foot != null ? { ...withNearby, daily_footfall: foot } : withNearby;
  const createPayload = mapQuickAddToDb(withFoot);
  return {
    createPayload,
    addressVerified: geoVerified,
    autoPopulatedAt: autoNear?.autoPopulatedAt ?? null,
  };
}
