/**
 * /media/map URL state 직렬화.
 *
 * URL 형식 예시:
 *   /ko/media/map?lat=37.5665&lng=126.978&zoom=8&type=digital&q=강남
 *
 * 모든 필드는 옵션. 빈 값은 URL 에서 제거.
 */

import { normalizeCatalogMediaType } from "@/lib/catalog-media-type";

export type MediaMapView = {
  lat?: number;
  lng?: number;
  zoom?: number;
};

export type MediaMapFilter = {
  category?: string;
  region?: string;
  q?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  mainCategory?: string;
  subCategory?: string;
  target?: string;
  regionMain?: string;
  regionSub?: string;
  priceMin?: string;
  priceMax?: string;
  features?: string;
};

/**
 * 선택된 매체 공개 식별자 (`slug` 우선, 없으면 `id`).
 * install 핀 id(`*-install-N`)는 URL에 넣지 않음.
 */
export type MediaMapUrlState = MediaMapView &
  MediaMapFilter & {
    media?: string;
  };

const VIEW_NUM_FIELDS = ["lat", "lng", "zoom"] as const;
const PRICE_NUM_FIELDS = ["minPrice", "maxPrice"] as const;
const STRING_FIELDS = [
  "category",
  "region",
  "q",
  "sort",
  "mainCategory",
  "subCategory",
  "target",
  "regionMain",
  "regionSub",
  "priceMin",
  "priceMax",
  "features",
] as const;

function parsePositiveInt(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

/**
 * 현재 페이지의 URL 에서 상태를 파싱.
 * SSR/이상 입력에 대해 안전 — invalid 한 lat/lng/zoom 은 무시.
 */
export function parseMediaMapUrlState(
  searchParams: URLSearchParams,
): MediaMapUrlState {
  const out: MediaMapUrlState = {};
  for (const key of VIEW_NUM_FIELDS) {
    const raw = searchParams.get(key);
    if (raw == null) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    out[key] = n;
  }
  for (const key of PRICE_NUM_FIELDS) {
    const n = parsePositiveInt(searchParams.get(key));
    if (n != null) out[key] = n;
  }
  if (
    out.minPrice != null &&
    out.maxPrice != null &&
    out.maxPrice < out.minPrice
  ) {
    const lo = out.minPrice;
    out.minPrice = out.maxPrice;
    out.maxPrice = lo;
  }
  if (
    out.lat != null &&
    (out.lat < 33 || out.lat > 39.5 || Number.isNaN(out.lat))
  ) {
    delete out.lat;
  }
  if (
    out.lng != null &&
    (out.lng < 124 || out.lng > 132.5 || Number.isNaN(out.lng))
  ) {
    delete out.lng;
  }
  if (out.zoom != null && (out.zoom < 1 || out.zoom > 14)) {
    out.zoom = Math.max(1, Math.min(14, Math.round(out.zoom)));
  }
  for (const key of STRING_FIELDS) {
    const raw = searchParams.get(key);
    if (raw == null || raw === "") continue;
    out[key] = raw.slice(0, 80);
  }
  const mediaRaw = searchParams.get("media");
  if (mediaRaw?.trim()) {
    out.media = mediaRaw.trim().slice(0, 120);
  }
  // legacy `type` → category (digital alias → dooh)
  if (!out.category) {
    const legacyType = searchParams.get("type");
    if (legacyType?.trim()) {
      const normalized =
        normalizeCatalogMediaType(legacyType.trim()) ?? legacyType.trim();
      out.category = normalized.slice(0, 80);
    }
  } else {
    const normalized = normalizeCatalogMediaType(out.category);
    if (normalized) out.category = normalized;
  }
  return out;
}

/**
 * 상태 → URLSearchParams. 빈 값은 누락시킨다.
 */
export function buildMediaMapSearchString(state: MediaMapUrlState): string {
  const sp = new URLSearchParams();
  if (state.lat != null && Number.isFinite(state.lat)) {
    sp.set("lat", state.lat.toFixed(5));
  }
  if (state.lng != null && Number.isFinite(state.lng)) {
    sp.set("lng", state.lng.toFixed(5));
  }
  if (state.zoom != null && Number.isFinite(state.zoom)) {
    sp.set("zoom", String(Math.round(state.zoom)));
  }
  if (state.minPrice != null && Number.isFinite(state.minPrice) && state.minPrice >= 0) {
    sp.set("minPrice", String(Math.round(state.minPrice)));
  }
  if (state.maxPrice != null && Number.isFinite(state.maxPrice) && state.maxPrice >= 0) {
    sp.set("maxPrice", String(Math.round(state.maxPrice)));
  }
  for (const key of STRING_FIELDS) {
    const v = state[key];
    if (v && v.length > 0) sp.set(key, v);
  }
  if (state.media?.trim()) {
    sp.set("media", state.media.trim().slice(0, 120));
  }
  return sp.toString();
}

export type UrlHistoryMode = "replace" | "push";

/**
 * history API 로 URL search 만 갱신.
 * `push` — 필터·선택 등 사용자 의도가 바뀐 경우(뒤로가기 복원용).
 * `replace` — 지도 pan/zoom 등 고빈도 갱신.
 */
export function writeUrlSearch(next: string, mode: UrlHistoryMode): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  const url = next ? `${path}?${next}` : path;
  const cur = window.location.search.replace(/^\?/, "");
  try {
    if (mode === "push") {
      if (cur === next) return;
      window.history.pushState(window.history.state, "", url);
    } else {
      if (cur === next) return;
      window.history.replaceState(window.history.state, "", url);
    }
  } catch {
    /* noop */
  }
}

/**
 * history.replaceState 로 URL 만 갱신 (스크롤/리렌더 X).
 * 같은 search string 이면 no-op.
 */
/** @deprecated prefer `writeUrlSearch(next, "replace")` */
export function replaceUrlSearch(next: string): void {
  writeUrlSearch(next, "replace");
}
