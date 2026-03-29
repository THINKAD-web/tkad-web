import { geocodeAddressWithKakao, getKakaoRestApiKey } from "@/lib/kakao-address-geocode";
import type { QuickAddMediaJson } from "@/lib/media-quick-add";

/** 좌표·시·구가 비어 있을 때만 카카오 주소검색으로 채움 (기존 값은 덮어쓰지 않음). */
export async function enrichQuickAddMediaFromKakao(
  row: QuickAddMediaJson,
): Promise<{ row: QuickAddMediaJson; addressVerified: boolean }> {
  if (!getKakaoRestApiKey()) return { row, addressVerified: false };
  const q = row.full_address.trim();
  if (!q) return { row, addressVerified: false };

  const needLat =
    row.latitude == null ||
    row.longitude == null ||
    !Number.isFinite(row.latitude) ||
    !Number.isFinite(row.longitude);
  const needCity = !row.city?.trim();
  const needDistrict = !row.district?.trim();
  if (!needLat && !needCity && !needDistrict) return { row, addressVerified: false };

  const g = await geocodeAddressWithKakao(q);
  if (!g) return { row, addressVerified: false };

  return {
    row: {
      ...row,
      latitude: needLat ? g.latitude : row.latitude,
      longitude: needLat ? g.longitude : row.longitude,
      city: needCity ? g.city : row.city,
      district: needDistrict ? g.district : row.district,
    },
    addressVerified: true,
  };
}

export type LocationEnrichInput = {
  location: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  district: string | null;
};

/** 신규 매체 등록: 빈 필드만 카카오로 보강. */
export async function enrichNewMediaLocationFromKakao(
  input: LocationEnrichInput,
): Promise<LocationEnrichInput & { addressVerified: boolean }> {
  if (!getKakaoRestApiKey()) return { ...input, addressVerified: false };
  const q = input.location.trim();
  if (!q) return { ...input, addressVerified: false };

  const needLat =
    input.latitude == null ||
    input.longitude == null ||
    !Number.isFinite(input.latitude) ||
    !Number.isFinite(input.longitude);
  const needCity = !input.city?.trim();
  const needDistrict = !input.district?.trim();
  if (!needLat && !needCity && !needDistrict)
    return { ...input, addressVerified: false };

  const g = await geocodeAddressWithKakao(q);
  if (!g) return { ...input, addressVerified: false };

  return {
    location: input.location,
    latitude: needLat ? g.latitude : input.latitude,
    longitude: needLat ? g.longitude : input.longitude,
    city: needCity ? g.city : input.city,
    district: needDistrict ? g.district : input.district,
    addressVerified: true,
  };
}

/**
 * PATCH: `location`만 넘기고 위·경도는 안 넘긴 경우 좌표·시·구를 카카오로 맞춤.
 * 같은 요청에 `latitude`/`longitude`가 있으면 호출하지 않음.
 */
export async function kakaoFillForMediaPatch(
  body: Record<string, unknown>,
  newLocationTrimmed: string,
): Promise<Partial<{
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  district: string | null;
  addressVerified: boolean;
}> | null> {
  if (!getKakaoRestApiKey()) return null;
  if (!("location" in body) || !newLocationTrimmed) return null;
  if ("latitude" in body || "longitude" in body) return null;

  const g = await geocodeAddressWithKakao(newLocationTrimmed);
  if (!g) return null;

  const out: {
    latitude: number;
    longitude: number;
    city?: string | null;
    district?: string | null;
    addressVerified: boolean;
  } = { latitude: g.latitude, longitude: g.longitude, addressVerified: true };
  if (!("city" in body)) out.city = g.city;
  if (!("district" in body)) out.district = g.district;
  return out;
}
