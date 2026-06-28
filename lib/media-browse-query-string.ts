import type { MapBrowseFilters } from "@/lib/media-map/browse-filters";
import { discoveryFeaturesIncludeNetwork } from "@/lib/media-discovery-client-filter";

/** `/media` browse 필터 URL 쿼리 상태 */
export type MediaBrowseFilterQueryState = {
  query: string;
  mainCategory: string;
  subCategory: string;
  target: string;
  regionMain: string;
  regionSub: string;
  priceMin: string;
  priceMax: string;
  features: string;
  sort: string;
  catalogVariant: "media" | "network";
  networkType: string;
};

export function buildMediaBrowseQueryString(
  state: MediaBrowseFilterQueryState,
): string {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set("q", state.query.trim());
  if (state.mainCategory) params.set("mainCategory", state.mainCategory);
  if (state.subCategory) params.set("subCategory", state.subCategory);
  if (state.target) params.set("target", state.target);
  if (state.regionMain) params.set("regionMain", state.regionMain);
  if (state.regionSub) params.set("regionSub", state.regionSub);
  if (state.priceMin.trim()) params.set("priceMin", state.priceMin.trim());
  if (state.priceMax.trim()) params.set("priceMax", state.priceMax.trim());
  if (state.features.trim()) params.set("features", state.features.trim());
  if (
    discoveryFeaturesIncludeNetwork(state.features) &&
    state.networkType
  ) {
    params.set("networkType", state.networkType);
  }
  if (state.sort && state.sort !== "popular") params.set("sort", state.sort);
  return params.toString();
}

/** `/media/map` → `/media` 이동 시 browse 필터 쿼리 동기화 */
export function mapBrowseFiltersToMediaBrowseQueryString(
  filters: MapBrowseFilters,
): string {
  return buildMediaBrowseQueryString({
    query: filters.q,
    mainCategory: filters.mainCategory,
    subCategory: filters.subCategory,
    target: filters.target,
    regionMain: filters.regionMain,
    regionSub: filters.regionSub,
    priceMin: filters.priceMin,
    priceMax: filters.priceMax,
    features: filters.features,
    sort: filters.sort,
    catalogVariant: "media",
    networkType: "",
  });
}
