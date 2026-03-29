/**
 * Kakao 로컬 REST API (서버 전용).
 *
 * 환경 변수: **`KAKAO_REST_API_KEY`** (또는 호환용 `KAKAO_MAP_REST_API_KEY`).
 *
 * 이 파일: **주소 검색** `GET /v2/local/search/address.json`
 * `@/lib/kakao-nearby-pois`: **카테고리** `.../category.json`, **키워드** `.../keyword.json`
 *
 * https://developers.kakao.com/docs/latest/ko/local/dev-guide
 */

export type KakaoGeocodeHit = {
  latitude: number;
  longitude: number;
  /** region_1depth (예: 서울, 서울특별시) */
  city: string;
  /** region_2depth (예: 강남구) */
  district: string;
  /** 통합 표기 주소 */
  addressName: string;
};

type KakaoAddrPart = {
  address_name?: string;
  region_1depth_name?: string;
  region_2depth_name?: string;
  region_3depth_name?: string;
};

type KakaoAddressDoc = {
  x?: string;
  y?: string;
  address?: KakaoAddrPart;
  road_address?: KakaoAddrPart;
};

type KakaoAddressResponse = {
  documents?: KakaoAddressDoc[];
};

export function getKakaoRestApiKey(): string | null {
  const k =
    process.env.KAKAO_REST_API_KEY?.trim() ||
    process.env.KAKAO_MAP_REST_API_KEY?.trim();
  return k || null;
}

function pickAddr(doc: KakaoAddressDoc): KakaoAddrPart | null {
  const a = doc.road_address ?? doc.address;
  return a && typeof a === "object" ? a : null;
}

function parseHit(doc: KakaoAddressDoc): KakaoGeocodeHit | null {
  const lat = doc.y != null ? Number.parseFloat(doc.y) : NaN;
  const lng = doc.x != null ? Number.parseFloat(doc.x) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const addr = pickAddr(doc);
  if (!addr) return null;
  const city = (addr.region_1depth_name ?? "").trim();
  const district = (addr.region_2depth_name ?? "").trim();
  const addressName =
    (addr.address_name ?? "").trim() ||
    [city, district, addr.region_3depth_name].filter(Boolean).join(" ");
  if (!city && !district && !addressName) return null;
  return {
    latitude: lat,
    longitude: lng,
    city: city || addressName,
    district,
    addressName,
  };
}

/** 주소 문자열 → 첫 번째 검색 결과의 좌표·시·구. 실패 시 null. */
export async function geocodeAddressWithKakao(
  query: string,
): Promise<KakaoGeocodeHit | null> {
  const key = getKakaoRestApiKey();
  const q = query.trim();
  if (!key || !q) return null;

  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", q);
  url.searchParams.set("size", "1");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let json: KakaoAddressResponse;
  try {
    json = (await res.json()) as KakaoAddressResponse;
  } catch {
    return null;
  }

  const doc = json.documents?.[0];
  if (!doc) return null;
  return parseHit(doc);
}
