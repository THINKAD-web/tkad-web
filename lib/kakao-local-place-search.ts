/**
 * Kakao 로컬 — 키워드(POI)·주소 통합 검색 (서버 전용).
 * @see lib/kakao-address-geocode.ts
 */

import { getKakaoRestApiKey } from "@/lib/kakao-address-geocode";

const BASE = "https://dapi.kakao.com";

export type KakaoPlaceSearchKind = "address" | "poi";

export type KakaoPlaceHit = {
  kind: KakaoPlaceSearchKind;
  placeName: string;
  addressName: string;
  latitude: number;
  longitude: number;
};

type KeywordDoc = {
  place_name?: string;
  address_name?: string;
  road_address_name?: string;
  x?: string;
  y?: string;
  category_name?: string;
};

type AddressDoc = {
  x?: string;
  y?: string;
  address?: { address_name?: string };
  road_address?: { address_name?: string };
};

async function kakaoGet<T>(path: string, params: Record<string, string>): Promise<T | null> {
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
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function parseCoord(doc: { x?: string; y?: string }): { lat: number; lng: number } | null {
  const lat = doc.y != null ? Number.parseFloat(doc.y) : NaN;
  const lng = doc.x != null ? Number.parseFloat(doc.x) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function hitFromKeyword(doc: KeywordDoc): KakaoPlaceHit | null {
  const coord = parseCoord(doc);
  if (!coord) return null;
  const placeName = (doc.place_name ?? "").trim();
  const addressName =
    (doc.road_address_name ?? doc.address_name ?? "").trim() || placeName;
  if (!placeName && !addressName) return null;
  const cat = (doc.category_name ?? "").toLowerCase();
  const kind: KakaoPlaceSearchKind =
    cat.includes("지하철") || /역$/.test(placeName) ? "poi" : "poi";
  return {
    kind,
    placeName: placeName || addressName,
    addressName,
    latitude: coord.lat,
    longitude: coord.lng,
  };
}

function hitFromAddress(doc: AddressDoc): KakaoPlaceHit | null {
  const coord = parseCoord(doc);
  if (!coord) return null;
  const addressName =
    (doc.road_address?.address_name ?? doc.address?.address_name ?? "").trim();
  if (!addressName) return null;
  return {
    kind: "address",
    placeName: addressName,
    addressName,
    latitude: coord.lat,
    longitude: coord.lng,
  };
}

/** 주소·POI 통합 검색 — 키워드 우선, 없으면 주소 API. */
export async function searchKakaoPlaces(
  query: string,
  opts?: { limit?: number },
): Promise<KakaoPlaceHit[]> {
  const q = query.trim();
  if (!q || !getKakaoRestApiKey()) return [];
  const limit = Math.min(10, Math.max(1, opts?.limit ?? 8));
  const seen = new Set<string>();
  const out: KakaoPlaceHit[] = [];

  const push = (h: KakaoPlaceHit | null) => {
    if (!h) return;
    const key = `${h.latitude.toFixed(5)},${h.longitude.toFixed(5)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(h);
  };

  const keywordJson = await kakaoGet<{ documents?: KeywordDoc[] }>(
    "/v2/local/search/keyword.json",
    { query: q, size: String(Math.min(15, limit)) },
  );
  for (const doc of keywordJson?.documents ?? []) {
    push(hitFromKeyword(doc));
    if (out.length >= limit) return out;
  }

  const addrJson = await kakaoGet<{ documents?: AddressDoc[] }>(
    "/v2/local/search/address.json",
    { query: q, size: String(Math.min(15, limit)) },
  );
  for (const doc of addrJson?.documents ?? []) {
    push(hitFromAddress(doc));
    if (out.length >= limit) return out;
  }

  return out;
}
