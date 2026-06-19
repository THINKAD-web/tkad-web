import type { MediaMapUrlState } from "@/lib/media-map/url-state";

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

const LEGACY_REGION_TO_BROWSE: Record<string, { regionMain: string; regionSub: string }> = {
  강남: { regionMain: "seoul", regionSub: "seoul_gangnam" },
  홍대: { regionMain: "seoul", regionSub: "seoul_hongdae" },
  성수: { regionMain: "seoul", regionSub: "seoul_seongsu" },
  도심: { regionMain: "seoul", regionSub: "seoul_cbd" },
  부산: { regionMain: "busan", regionSub: "" },
  대구: { regionMain: "daegu", regionSub: "" },
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
