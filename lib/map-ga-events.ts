/** `/media/map` GA4 퍼널 — `source`는 항상 `map` */

import { trackEvent } from "@/lib/ga-events";
import type { MapBrowseFilters } from "@/lib/media-map/browse-filters";

export const MAP_GA_SOURCE = "map" as const;

export type MapPreviewCtaKind = "detail" | "contact" | "add";

export type MapSearchType = "media_name" | "address" | "poi" | "mixed";

export function isDefaultMapBrowseFilters(f: MapBrowseFilters): boolean {
  const empty = {
    q: "",
    mainCategory: "",
    subCategory: "",
    target: "",
    regionMain: "",
    regionSub: "",
    priceMin: "",
    priceMax: "",
    features: "",
    sort: "popular" as const,
  };
  return mapBrowseFiltersFingerprint(f) === mapBrowseFiltersFingerprint(empty);
}

export function mapBrowseFiltersFingerprint(f: MapBrowseFilters): string {
  return JSON.stringify({
    q: f.q.trim(),
    mainCategory: f.mainCategory,
    subCategory: f.subCategory,
    target: f.target,
    regionMain: f.regionMain,
    regionSub: f.regionSub,
    priceMin: f.priceMin,
    priceMax: f.priceMax,
    features: f.features.trim(),
    sort: f.sort,
  });
}

export function resolveMapSearchType(q: string): MapSearchType {
  const t = q.trim();
  if (!t) return "media_name";
  if (/^\d/.test(t) || /(로|길|동|구|시|읍|면|리)\s*$/.test(t)) return "address";
  if (/(역|공항|대학|마트|백화점|호텔|센터)/.test(t)) return "poi";
  if (t.length >= 2 && /[가-힣a-zA-Z]/.test(t)) return "media_name";
  return "mixed";
}

const MAP_VIEW_SESSION_KEY = "tkad_map_ga_view_v1";

/** StrictMode·재마운트와 별개로 동일 JS 컨텍스트에서 1회만 */
let mapViewSentInPageLifetime = false;

export function resetMapViewGaForTests(): void {
  mapViewSentInPageLifetime = false;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(MAP_VIEW_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function trackMapView(params: {
  zoom: number;
  region_main?: string;
  region_sub?: string;
}): void {
  if (mapViewSentInPageLifetime) return;
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem(MAP_VIEW_SESSION_KEY)) {
        mapViewSentInPageLifetime = true;
        return;
      }
      sessionStorage.setItem(MAP_VIEW_SESSION_KEY, "1");
    } catch {
      /* private mode / disabled storage */
    }
  }
  mapViewSentInPageLifetime = true;
  trackEvent("map_view", {
    source: MAP_GA_SOURCE,
    zoom: Math.round(params.zoom * 10) / 10,
    region_main: params.region_main || undefined,
    region_sub: params.region_sub || undefined,
  });
}

export function trackMapFilterApply(params: {
  filter_summary: string;
  result_count: number;
}): void {
  trackEvent("map_filter_apply", {
    source: MAP_GA_SOURCE,
    filter_summary: params.filter_summary.slice(0, 200),
    result_count: params.result_count,
  });
}

export function trackMapSearch(params: {
  search_type: MapSearchType;
  query_length: number;
  has_results: boolean;
  result_count: number;
}): void {
  trackEvent("map_search", {
    source: MAP_GA_SOURCE,
    search_type: params.search_type,
    query_length: params.query_length,
    has_results: params.has_results,
    result_count: params.result_count,
  });
}

export function trackMapMarkerClick(params: {
  media_id?: string;
  is_cluster: boolean;
}): void {
  trackEvent("map_marker_click", {
    source: MAP_GA_SOURCE,
    media_id: params.media_id,
    is_cluster: params.is_cluster,
  });
}

export function trackMapPreviewCta(params: {
  cta_kind: MapPreviewCtaKind;
  media_id: string;
}): void {
  trackEvent("map_preview_cta", {
    source: MAP_GA_SOURCE,
    cta_kind: params.cta_kind,
    media_id: params.media_id,
  });
}
