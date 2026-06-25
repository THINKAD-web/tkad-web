import type { MediaMapUrlState } from "@/lib/media-map/url-state";
import { LEGACY_REGION_TO_BROWSE } from "@/lib/media-map/legacy-region-browse";
import { resolveTextQueryToRegionFilter } from "@/lib/media-map/text-query-region";

export type MapBrowseFilters = {
  q: string;
  mainCategory: string;
  subCategory: string;
  target: string;
  regionMain: string;
  regionSub: string;
  priceMin: string;
  priceMax: string;
  features: string;
  sort: "popular" | "newest" | "price_asc" | "price_desc";
};

function parseSort(raw?: string): MapBrowseFilters["sort"] {
  if (raw === "newest" || raw === "price_asc" || raw === "price_desc") return raw;
  if (raw === "priceAsc") return "price_asc";
  if (raw === "priceDesc") return "price_desc";
  return "popular";
}

export function initMapBrowseFiltersFromUrl(
  init: MediaMapUrlState | null | undefined,
): MapBrowseFilters {
  let regionMain = init?.regionMain ?? "";
  let regionSub = init?.regionSub ?? "";
  if (!regionMain && !regionSub && init?.region) {
    const mapped = LEGACY_REGION_TO_BROWSE[init.region];
    if (mapped) {
      regionMain = mapped.regionMain;
      regionSub = mapped.regionSub;
    }
  }

  return {
    q: init?.q ?? "",
    mainCategory: init?.mainCategory ?? "",
    subCategory: init?.subCategory ?? "",
    target: init?.target ?? "",
    regionMain,
    regionSub,
    priceMin:
      init?.priceMin ??
      (init?.minPrice != null ? String(init.minPrice) : ""),
    priceMax:
      init?.priceMax ??
      (init?.maxPrice != null ? String(init.maxPrice) : ""),
    features: init?.features ?? "",
    sort: parseSort(init?.sort),
  };
}

export function mapBrowseFiltersToUrlState(
  filters: MapBrowseFilters,
): MediaMapUrlState {
  return {
    q: filters.q || undefined,
    mainCategory: filters.mainCategory || undefined,
    subCategory: filters.subCategory || undefined,
    target: filters.target || undefined,
    regionMain: filters.regionMain || undefined,
    regionSub: filters.regionSub || undefined,
    priceMin: filters.priceMin.trim() || undefined,
    priceMax: filters.priceMax.trim() || undefined,
    features: filters.features.trim() || undefined,
    sort: filters.sort !== "popular" ? filters.sort : undefined,
  };
}

export function mapBrowseFiltersToApiParams(
  filters: MapBrowseFilters,
): URLSearchParams {
  const qs = new URLSearchParams();
  if (filters.q.trim()) qs.set("q", filters.q.trim());
  if (filters.mainCategory) qs.set("mainCategory", filters.mainCategory);
  if (filters.subCategory) qs.set("subCategory", filters.subCategory);
  if (filters.target) qs.set("target", filters.target);
  if (filters.regionMain) qs.set("regionMain", filters.regionMain);
  if (filters.regionSub) qs.set("regionSub", filters.regionSub);
  if (filters.priceMin.trim()) qs.set("priceMin", filters.priceMin.trim());
  if (filters.priceMax.trim()) qs.set("priceMax", filters.priceMax.trim());
  if (filters.features.trim()) qs.set("features", filters.features.trim());
  if (filters.sort) qs.set("sort", filters.sort);
  return qs;
}

export type MapBrowseApiParams = {
  params: URLSearchParams;
  /** true면 bounds 필터 생략 — 전국 텍스트 검색 */
  nationalScope: boolean;
  /** 지역어로 승격된 region (지도 이동용) */
  queryRegion: { regionMain: string; regionSub: string } | null;
};

/** /api/media/map 전용 — 텍스트 검색 시 bounds 분리 + 지역어 region 승격 */
export function mapBrowseFiltersToMapApiParams(
  filters: MapBrowseFilters,
): MapBrowseApiParams {
  const qTrim = filters.q.trim();
  const nationalScope = qTrim.length > 0;
  const qs = mapBrowseFiltersToApiParams(filters);

  let queryRegion: MapBrowseApiParams["queryRegion"] = null;

  if (nationalScope) {
    qs.set("nationalScope", "1");
    const fromQ = resolveTextQueryToRegionFilter(qTrim);
    if (fromQ) {
      queryRegion = {
        regionMain: fromQ.regionMain,
        regionSub: fromQ.regionSub,
      };
      if (!filters.regionMain) {
        qs.set("regionMain", fromQ.regionMain);
        if (fromQ.regionSub) qs.set("regionSub", fromQ.regionSub);
      } else if (!filters.regionSub && fromQ.regionSub) {
        qs.set("regionSub", fromQ.regionSub);
      }
      if (fromQ.consumeQuery) {
        qs.delete("q");
      }
    }
  }

  return { params: qs, nationalScope, queryRegion };
}

export function isMapTextSearchActive(filters: MapBrowseFilters): boolean {
  return filters.q.trim().length > 0;
}

export function clearMapBrowseFilters(
  filters: MapBrowseFilters,
): MapBrowseFilters {
  return {
    ...filters,
    q: "",
    mainCategory: "",
    subCategory: "",
    target: "",
    regionMain: "",
    regionSub: "",
    priceMin: "",
    priceMax: "",
    features: "",
  };
}
