/**
 * 카카오 로컬 키워드 검색 — 잠재 매체 발굴용
 */

import { getKakaoRestApiKey } from "@/lib/kakao-address-geocode";

const BASE = "https://dapi.kakao.com";

export type KakaoKeywordPlace = {
  externalPlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
};

type KakaoKeywordDoc = {
  id?: string;
  place_name?: string;
  address_name?: string;
  road_address_name?: string;
  x?: string;
  y?: string;
  phone?: string;
};

type KakaoKeywordResponse = {
  documents?: KakaoKeywordDoc[];
  meta?: { is_end?: boolean; pageable_count?: number };
};

export async function searchKakaoKeywordPlaces(opts: {
  query: string;
  lat: number;
  lng: number;
  radiusM?: number;
  page?: number;
  size?: number;
}): Promise<KakaoKeywordPlace[]> {
  const key = getKakaoRestApiKey();
  if (!key) return [];

  const url = new URL(`${BASE}/v2/local/search/keyword.json`);
  url.searchParams.set("query", opts.query);
  url.searchParams.set("x", String(opts.lng));
  url.searchParams.set("y", String(opts.lat));
  url.searchParams.set(
    "radius",
    String(Math.min(20000, Math.max(1000, opts.radiusM ?? 15000))),
  );
  url.searchParams.set("size", String(Math.min(15, opts.size ?? 15)));
  url.searchParams.set("page", String(Math.max(1, opts.page ?? 1)));
  url.searchParams.set("sort", "distance");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  let json: KakaoKeywordResponse;
  try {
    json = (await res.json()) as KakaoKeywordResponse;
  } catch {
    return [];
  }

  const out: KakaoKeywordPlace[] = [];
  for (const d of json.documents ?? []) {
    const id = (d.id ?? "").trim();
    const name = (d.place_name ?? "").trim();
    const address = (d.road_address_name || d.address_name || "").trim();
    const lng = Number(d.x);
    const lat = Number(d.y);
    if (!id || !name || !address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }
    out.push({
      externalPlaceId: id,
      name,
      address,
      lat,
      lng,
      phone: d.phone?.trim() || null,
    });
  }
  return out;
}
