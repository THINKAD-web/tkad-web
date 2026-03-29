import { estimateFootfallFromAdminDistrict } from "@/lib/footfall-district-heuristic";
import { findNearestSubwayStation } from "@/lib/kakao-nearby-pois";
import { fetchMetroRawDailyPassengerTotal } from "@/lib/seoul-metro-passenger-api";

const SUBWAY_NEAR_M = 500;
/** 역 일별 승하차(원시 합) → 매체 인근 일 유동 추정 계수 (보수적) */
const METRO_RAW_TO_DAILY_FOOTFALL = 0.065;
const EST_MIN = 20_000;
const EST_MAX = 450_000;

function clampFootfall(n: number): number {
  if (!Number.isFinite(n)) return EST_MIN;
  return Math.max(EST_MIN, Math.min(EST_MAX, Math.round(n)));
}

/**
 * `daily_footfall` 비어 있을 때만: 지하철역 근처 + 공공데이터 승하차 우선,
 * 아니면 시·구 상권 휴리스틱.
 */
export async function maybeEstimateDailyFootfall(params: {
  existingDaily: number | null | undefined;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  city: string | null | undefined;
  district: string | null | undefined;
}): Promise<number | null> {
  const ex = params.existingDaily;
  if (ex != null && Number.isFinite(ex) && ex > 0) return null;

  const lat = params.latitude;
  const lng = params.longitude;
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const nearest = await findNearestSubwayStation({
    latitude: lat,
    longitude: lng,
    radiusM: SUBWAY_NEAR_M,
  });

  if (nearest && nearest.distanceM <= SUBWAY_NEAR_M) {
    const raw = await fetchMetroRawDailyPassengerTotal(nearest.placeName);
    if (raw != null && raw > 0) {
      return clampFootfall(raw * METRO_RAW_TO_DAILY_FOOTFALL);
    }
  }

  return clampFootfall(
    estimateFootfallFromAdminDistrict({
      city: params.city,
      district: params.district,
    }),
  );
}
