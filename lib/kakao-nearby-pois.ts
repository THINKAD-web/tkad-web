/**
 * 카카오 로컬 — 반경 내 **카테고리·키워드** 검색 (`KAKAO_REST_API_KEY`).
 * https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-category
 */

import { getKakaoRestApiKey } from "@/lib/kakao-address-geocode";

const BASE = "https://dapi.kakao.com";

type LocalDoc = {
  id?: string;
  place_name?: string;
  distance?: string;
  x?: string;
  y?: string;
};

export type NearbyMapPoiKind = "subway" | "cafe" | "convenience";

export type NearbyMapPoi = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: NearbyMapPoiKind;
  distanceM: number;
};

type LocalSearchResponse = {
  documents?: LocalDoc[];
};

async function kakaoLocalGet(
  path: string,
  params: Record<string, string>,
): Promise<LocalSearchResponse | null> {
  const key = getKakaoRestApiKey();
  if (!key) return null;
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  try {
    return (await res.json()) as LocalSearchResponse;
  } catch {
    return null;
  }
}

function docDistance(d: LocalDoc): number {
  const n = Number(d.distance);
  return Number.isFinite(n) ? n : 1e9;
}

function sortedNames(docs: LocalDoc[] | undefined, limit: number): string[] {
  if (!docs?.length) return [];
  const sorted = [...docs].sort((a, b) => docDistance(a) - docDistance(b));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const d of sorted) {
    const name = (d.place_name ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

/** SW8 지하철역 */
async function fetchSubwayNames(
  lng: string,
  lat: string,
  radius: string,
  limit: number,
): Promise<string[]> {
  const json = await kakaoLocalGet("/v2/local/search/category.json", {
    category_group_code: "SW8",
    x: lng,
    y: lat,
    radius,
    size: String(Math.min(15, limit + 5)),
    sort: "distance",
  });
  return sortedNames(json?.documents, limit);
}

/** SC4 학교 중 이름에 대학 포함 */
async function fetchUniversityNames(
  lng: string,
  lat: string,
  radius: string,
  limit: number,
): Promise<string[]> {
  const json = await kakaoLocalGet("/v2/local/search/category.json", {
    category_group_code: "SC4",
    x: lng,
    y: lat,
    radius,
    size: "15",
    sort: "distance",
  });
  const docs = json?.documents?.filter((d) => {
    const n = (d.place_name ?? "").toLowerCase();
    return n.includes("대학") || n.includes("university");
  });
  return sortedNames(docs, limit);
}

async function fetchKeywordNames(
  query: string,
  lng: string,
  lat: string,
  radius: string,
  limit: number,
): Promise<string[]> {
  const json = await kakaoLocalGet("/v2/local/search/keyword.json", {
    query,
    x: lng,
    y: lat,
    radius,
    size: String(Math.min(15, limit + 3)),
    sort: "distance",
  });
  return sortedNames(json?.documents, limit);
}

/** AT4 관광명소 (랜드마크 보조) */
async function fetchAttractionNames(
  lng: string,
  lat: string,
  radius: string,
  limit: number,
): Promise<string[]> {
  const json = await kakaoLocalGet("/v2/local/search/category.json", {
    category_group_code: "AT4",
    x: lng,
    y: lat,
    radius,
    size: "10",
    sort: "distance",
  });
  return sortedNames(json?.documents, limit);
}

const DEFAULT_RADIUS_M = 500;
const MAX_OUT_LEN = 900;
const MAX_STATION_LEN = 400;
const MAX_LANDMARK_LEN = 700;

export type NearbyStationsLandmarks = {
  stations: string | null;
  landmarks: string | null;
  /** stations + landmarks 통합 (기존 nearby_facilities 용) */
  combined: string | null;
};

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/**
 * 지하철(SW8) vs 그 외(백화점·쇼핑몰·대학·관광)로 나눈 주변 POI 문자열.
 */
export async function buildNearbyStationsAndLandmarks(opts: {
  latitude: number;
  longitude: number;
  radiusM?: number;
}): Promise<NearbyStationsLandmarks | null> {
  const { latitude, longitude } = opts;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (!getKakaoRestApiKey()) return null;

  const radius = String(
    Math.min(20000, Math.max(1, Math.round(opts.radiusM ?? DEFAULT_RADIUS_M))),
  );
  const lat = String(latitude);
  const lng = String(longitude);

  const [subways, deptStores, malls, universities, attractions] =
    await Promise.all([
      fetchSubwayNames(lng, lat, radius, 8),
      fetchKeywordNames("백화점", lng, lat, radius, 4),
      fetchKeywordNames("쇼핑몰", lng, lat, radius, 2),
      fetchUniversityNames(lng, lat, radius, 4),
      fetchAttractionNames(lng, lat, radius, 3),
    ]);

  const joinUnique = (lists: string[][]): string => {
    const seen = new Set<string>();
    const parts: string[] = [];
    for (const list of lists) {
      for (const n of list) {
        if (!n || seen.has(n)) continue;
        seen.add(n);
        parts.push(n);
      }
    }
    return parts.join(", ");
  };

  const stationsRaw = joinUnique([subways]);
  const landmarksRaw = joinUnique([deptStores, malls, universities, attractions]);

  if (!stationsRaw && !landmarksRaw) return null;

  const stations = stationsRaw ? clip(stationsRaw, MAX_STATION_LEN) : null;
  const landmarks = landmarksRaw ? clip(landmarksRaw, MAX_LANDMARK_LEN) : null;

  const combinedParts: string[] = [];
  if (stations) combinedParts.push(stations);
  if (landmarks) combinedParts.push(landmarks);
  const combined = combinedParts.length
    ? clip(combinedParts.join(", "), MAX_OUT_LEN)
    : null;

  return { stations, landmarks, combined };
}

/**
 * 위도·경도 기준 반경(m) 내 지하철·백화점(키워드)·대학·관광명소 이름을 모아 한 줄 요약.
 */
export async function buildNearbyFacilitiesText(opts: {
  latitude: number;
  longitude: number;
  radiusM?: number;
  maxLength?: number;
}): Promise<string | null> {
  const split = await buildNearbyStationsAndLandmarks(opts);
  if (!split?.combined) return null;
  const maxLen = opts.maxLength ?? MAX_OUT_LEN;
  return clip(split.combined, maxLen);
}



const MAP_POI_CATEGORIES: ReadonlyArray<{
  code: string;
  kind: NearbyMapPoiKind;
  limit: number;
}> = [
  { code: "SW8", kind: "subway", limit: 4 },
  { code: "CE7", kind: "cafe", limit: 5 },
  { code: "CS2", kind: "convenience", limit: 4 },
];

function docToMapPoi(d: LocalDoc, kind: NearbyMapPoiKind): NearbyMapPoi | null {
  const name = (d.place_name ?? "").trim();
  const lng = Number(d.x);
  const lat = Number(d.y);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const distanceM = docDistance(d);
  const id = (d.id ?? `${kind}-${name}-${lat}-${lng}`).trim();
  return { id, name, lat, lng, kind, distanceM };
}

async function fetchCategoryMapPois(
  categoryGroupCode: string,
  kind: NearbyMapPoiKind,
  lng: string,
  lat: string,
  radius: string,
  limit: number,
): Promise<NearbyMapPoi[]> {
  const json = await kakaoLocalGet("/v2/local/search/category.json", {
    category_group_code: categoryGroupCode,
    x: lng,
    y: lat,
    radius,
    size: String(Math.min(15, limit + 3)),
    sort: "distance",
  });
  const docs = json?.documents ?? [];
  const out: NearbyMapPoi[] = [];
  const seen = new Set<string>();
  const sorted = [...docs].sort((a, b) => docDistance(a) - docDistance(b));
  for (const d of sorted) {
    const poi = docToMapPoi(d, kind);
    if (!poi || seen.has(poi.id)) continue;
    seen.add(poi.id);
    out.push(poi);
    if (out.length >= limit) break;
  }
  return out;
}

/** 매체 상세 지도 — 반경(m) 내 지하철·카페·편의점 POI */
export async function fetchNearbyMapPois(opts: {
  latitude: number;
  longitude: number;
  radiusM?: number;
}): Promise<NearbyMapPoi[]> {
  const { latitude, longitude } = opts;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
  if (!getKakaoRestApiKey()) return [];
  const radius = String(
    Math.min(20000, Math.max(1, Math.round(opts.radiusM ?? 200))),
  );
  const lat = String(latitude);
  const lng = String(longitude);
  const batches = await Promise.all(
    MAP_POI_CATEGORIES.map(({ code, kind, limit }) =>
      fetchCategoryMapPois(code, kind, lng, lat, radius, limit),
    ),
  );
  const merged: NearbyMapPoi[] = [];
  const seen = new Set<string>();
  for (const batch of batches) {
    for (const poi of batch) {
      if (seen.has(poi.id)) continue;
      seen.add(poi.id);
      merged.push(poi);
    }
  }
  return merged.sort((a, b) => a.distanceM - b.distanceM);
}

/** 반경 내 가장 가까운 지하철역 (카테고리 SW8). 유동인구 추정 등에 사용. */
export async function findNearestSubwayStation(opts: {
  latitude: number;
  longitude: number;
  radiusM?: number;
}): Promise<{ placeName: string; distanceM: number } | null> {
  const { latitude, longitude } = opts;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (!getKakaoRestApiKey()) return null;
  const radius = String(
    Math.min(20000, Math.max(1, Math.round(opts.radiusM ?? 500))),
  );
  const json = await kakaoLocalGet("/v2/local/search/category.json", {
    category_group_code: "SW8",
    x: String(longitude),
    y: String(latitude),
    radius,
    size: "5",
    sort: "distance",
  });
  const docs = json?.documents;
  if (!docs?.length) return null;
  const best = [...docs].sort((a, b) => docDistance(a) - docDistance(b))[0];
  const name = (best.place_name ?? "").trim();
  if (!name) return null;
  const distanceM = docDistance(best);
  return {
    placeName: name,
    distanceM: distanceM >= 1e8 ? 9999 : distanceM,
  };
}
