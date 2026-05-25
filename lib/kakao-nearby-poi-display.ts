/**
 * 매체 상세 — 주변 POI 실시간 조회 (카카오 로컬 API).
 */

import { getKakaoRestApiKey } from "@/lib/kakao-address-geocode";

const BASE = "https://dapi.kakao.com";
const DEFAULT_RADIUS_M = 500;

type LocalDoc = {
  place_name?: string;
  distance?: string;
  category_name?: string;
};

type LocalSearchResponse = {
  documents?: LocalDoc[];
};

export type NearbyPoiCategory =
  | "subway"
  | "bus"
  | "mall"
  | "university"
  | "public"
  | "hospital"
  | "park";

export type NearbyPoiDisplayItem = {
  name: string;
  category: NearbyPoiCategory;
  distanceM: number;
  label: string;
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
  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as LocalSearchResponse;
  } catch {
    return null;
  }
}

function docDistance(d: LocalDoc): number {
  const n = Number(d.distance);
  return Number.isFinite(n) ? n : 1e9;
}

function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.round(distanceM / 80));
}

function formatPoiLabel(name: string, distanceM: number, isKo: boolean): string {
  const min = walkMinutes(distanceM);
  return isKo
    ? `${name} (도보 ${min}분 · ${distanceM}m)`
    : `${name} (${min} min walk · ${distanceM}m)`;
}

function docsToItems(
  docs: LocalDoc[] | undefined,
  category: NearbyPoiCategory,
  limit: number,
  isKo: boolean,
  filter?: (d: LocalDoc) => boolean,
): NearbyPoiDisplayItem[] {
  if (!docs?.length) return [];
  const sorted = [...docs]
    .filter((d) => (filter ? filter(d) : true))
    .sort((a, b) => docDistance(a) - docDistance(b));
  const out: NearbyPoiDisplayItem[] = [];
  const seen = new Set<string>();
  for (const d of sorted) {
    const name = (d.place_name ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const distanceM = Math.round(docDistance(d));
    if (distanceM >= 1e8) continue;
    out.push({
      name,
      category,
      distanceM,
      label: formatPoiLabel(name, distanceM, isKo),
    });
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchCategory(
  code: string,
  lng: string,
  lat: string,
  radius: string,
  size: number,
): Promise<LocalDoc[]> {
  const json = await kakaoLocalGet("/v2/local/search/category.json", {
    category_group_code: code,
    x: lng,
    y: lat,
    radius,
    size: String(Math.min(15, size)),
    sort: "distance",
  });
  return json?.documents ?? [];
}

async function fetchKeyword(
  query: string,
  lng: string,
  lat: string,
  radius: string,
  size: number,
): Promise<LocalDoc[]> {
  const json = await kakaoLocalGet("/v2/local/search/keyword.json", {
    query,
    x: lng,
    y: lat,
    radius,
    size: String(Math.min(15, size)),
    sort: "distance",
  });
  return json?.documents ?? [];
}

/** 주소 문자열에서 "○○구 ○○로 일대" 형태 추출 */
export function addressAreaFallbackText(
  location: string,
  isKo: boolean,
): string | null {
  const trimmed = location.trim();
  if (!trimmed) return null;
  const koMatch = trimmed.match(
    /([가-힣]+(?:구|시|군))\s+([가-힣0-9]+(?:로|길|대로))/,
  );
  if (koMatch) {
    return isKo
      ? `${koMatch[1]} ${koMatch[2]} 일대`
      : `Near ${koMatch[1]} ${koMatch[2]}`;
  }
  const parts = trimmed.split(/[,\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    return isKo
      ? `${parts[0]} ${parts[1]} 일대`
      : `Near ${parts[0]} ${parts[1]}`;
  }
  return isKo ? `${trimmed.slice(0, 24)} 일대` : `Near ${trimmed.slice(0, 32)}`;
}

export async function fetchNearbyPoiDisplayItems(opts: {
  latitude: number;
  longitude: number;
  radiusM?: number;
  isKo?: boolean;
  maxItems?: number;
}): Promise<NearbyPoiDisplayItem[] | null> {
  const { latitude, longitude } = opts;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (!getKakaoRestApiKey()) return null;

  const isKo = opts.isKo ?? true;
  const radius = String(
    Math.min(20000, Math.max(1, Math.round(opts.radiusM ?? DEFAULT_RADIUS_M))),
  );
  const lat = String(latitude);
  const lng = String(longitude);
  const maxItems = opts.maxItems ?? 8;

  const [subways, buses, malls, universities, publicOffices, hospitals, parks] =
    await Promise.all([
      fetchCategory("SW8", lng, lat, radius, 4),
      fetchKeyword("버스정류장", lng, lat, radius, 3),
      fetchKeyword("쇼핑몰", lng, lat, radius, 3),
      fetchCategory("SC4", lng, lat, radius, 6).then((docs) =>
        docs.filter((d) => {
          const n = (d.place_name ?? "").toLowerCase();
          return n.includes("대학") || n.includes("university");
        }),
      ),
      fetchCategory("PO3", lng, lat, radius, 3),
      fetchCategory("HP8", lng, lat, radius, 3),
      fetchKeyword("공원", lng, lat, radius, 3),
    ]);

  const groups: NearbyPoiDisplayItem[][] = [
    docsToItems(subways, "subway", 3, isKo),
    docsToItems(buses, "bus", 2, isKo),
    docsToItems(malls, "mall", 2, isKo),
    docsToItems(universities, "university", 2, isKo),
    docsToItems(publicOffices, "public", 2, isKo),
    docsToItems(hospitals, "hospital", 2, isKo),
    docsToItems(parks, "park", 2, isKo),
  ];

  const merged: NearbyPoiDisplayItem[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const item of group) {
      if (seen.has(item.name)) continue;
      seen.add(item.name);
      merged.push(item);
    }
  }

  merged.sort((a, b) => a.distanceM - b.distanceM);
  const result = merged.slice(0, maxItems);
  return result.length > 0 ? result : null;
}
