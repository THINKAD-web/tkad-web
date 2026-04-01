"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Calculator,
  LayoutList,
  Map as MapIcon,
  ExternalLink,
  X,
  Users,
} from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import { FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS } from "@/components/floating-selection-bar";
import SolutionCtaButton from "@/components/solution-cta-button";
import MediaSearchAutocomplete from "@/components/media-search-autocomplete";
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  entriesToCompareMediaItems,
} from "@/lib/compare-cart-client";

const RecentlyViewedMedia = dynamic(
  () => import("@/components/recently-viewed-media"),
  { loading: () => null },
);
const CompareBar = dynamic(() => import("@/components/compare-bar"), {
  ssr: false,
});
const MediaBrowseMap = dynamic(() => import("@/components/media-browse-map"), {
  ssr: false,
});
import { matchesMediaTextQuery, type MediaItem } from "@/lib/media-data";
import {
  computeCatalogBounds,
  defaultAdvancedFilterState,
  passesMediaAdvancedFilters,
  type TargetAgeBucket,
} from "@/lib/media-filter-advanced";
import {
  MEDIA_CATALOG_GRID_CLASS,
  MEDIA_CATALOG_COMPACT_GRID_CLASS,
  MediaCatalogGridCompactToggle,
} from "@/components/media-catalog-shared";
import MediaCatalogFiltersBar from "@/components/media-catalog-filters-bar";
import { buildMediaRegionFilterOptions } from "@/lib/media-region-filter-options";
import { MediaCatalogCompactLinkRow } from "@/components/media-catalog-compact-link";
import { addRecentlyViewedId } from "@/lib/recently-viewed";
import MediaAiRecommendPanel from "@/components/media-ai-recommend-panel";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";

const MAIN_CATEGORIES = [
  { key: "all", nameKo: "전체", nameEn: "All" },
  { key: "transit", nameKo: "교통 매체", nameEn: "Transit" },
  {
    key: "billboard",
    nameKo: "빌보드 / 전광판",
    nameEn: "Billboards / Screens",
  },
  {
    key: "street_furniture",
    nameKo: "거리 가구 매체",
    nameEn: "Street furniture",
  },
  {
    key: "indoor_place",
    nameKo: "실내·쇼핑몰",
    nameEn: "Indoor / malls",
  },
  {
    key: "special_digital",
    nameKo: "특수·디지털 매체",
    nameEn: "Special / digital",
  },
] as const;

type MainCategoryKey = (typeof MAIN_CATEGORIES)[number]["key"];

const TRANSIT_SUB_CATEGORIES = [
  { key: "all", nameKo: "전체", nameEn: "All" },
  { key: "subway", nameKo: "지하철", nameEn: "Subway" },
  {
    key: "bus",
    nameKo: "버스 (외부·내부·쉘터)",
    nameEn: "Bus & shelters",
  },
  { key: "taxi", nameKo: "택시", nameEn: "Taxi" },
  {
    key: "rail_airport",
    nameKo: "철도·공항·터미널",
    nameEn: "Rail / airport / terminals",
  },
] as const;

type TransitSubKey = (typeof TRANSIT_SUB_CATEGORIES)[number]["key"];

function matchesMainCategory(m: MediaItem, key: MainCategoryKey): boolean {
  if (key === "all") return true;

  const sub = (m.subCategory ?? "").toLowerCase();
  const tags = (m.tags ?? []).join(" ").toLowerCase();
  const haystack = `${sub} ${tags}`;

  if (key === "transit") {
    if (m.type === "mobile") return true;
    return /교통|버스|택시|지하철|역사|셔틀|차량/.test(haystack);
  }

  if (key === "billboard") {
    return /빌보드|전광판|외벽|옥외|파사드|월스크린/.test(haystack);
  }

  if (key === "street_furniture") {
    return /미디어폴|버스쉘터|정류장|가로등|키오스크|거리/.test(haystack);
  }

  if (key === "indoor_place") {
    return /실내|쇼핑몰|몰|백화점|마트|로비|실내광고|매장/.test(haystack);
  }

  if (key === "special_digital") {
    if (m.type === "digital" && !matchesMainCategory(m, "billboard")) {
      return true;
    }
    return /프로젝션|특수|체험|인터랙티브|홀로그램/.test(haystack);
  }

  return true;
}

function matchesTransitSub(m: MediaItem, key: TransitSubKey): boolean {
  if (key === "all") return true;

  const sub = (m.subCategory ?? "").toLowerCase();
  const tags = (m.tags ?? []).join(" ").toLowerCase();
  const loc = `${m.nearbyFacilities ?? ""} ${m.location}`.toLowerCase();
  const haystack = `${sub} ${tags} ${loc}`;

  if (key === "subway") {
    return /지하철|역사|subway|metro|station/.test(haystack);
  }
  if (key === "bus") {
    return /버스|bus|쉘터|정류장|버스쉘터/.test(haystack);
  }
  if (key === "taxi") {
    return /택시|taxi|카카오T|모범택시/.test(haystack);
  }
  if (key === "rail_airport") {
    return /기차|철도|ktx|srt|공항|airport|터미널|terminal/.test(haystack);
  }

  return true;
}

export default function MediaBrowseClient({
  catalog,
}: {
  catalog: MediaItem[];
}) {
  const t = useTranslations();
  const tMedia = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";

  const [mainTab, setMainTab] = useState<"search" | "ai">("search");
  const [searchTarget, setSearchTarget] = useState<string | null>(null);
  const [mainCategory, setMainCategory] = useState<MainCategoryKey>("all");
  const [transitSub, setTransitSub] = useState<TransitSubKey>("all");
  const [textFilter, setTextFilter] = useState("");
  const [browseMode, setBrowseMode] = useState<"list" | "map">("list");
  const [catalogCardLayout, setCatalogCardLayout] = useState<
    "grid" | "compact"
  >("grid");
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(24);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [compareItems, setCompareItems] = useState<MediaItem[]>([]);
  const skipFirstComparePersist = useRef(true);
  const popularIds = new Set(["1", "2", "3", "8", "9"]);
  const [sortBy, setSortBy] = useState<
    "default" | "priceAsc" | "priceDesc" | "trafficDesc"
  >("default");

  const bounds = useMemo(() => computeCatalogBounds(catalog), [catalog]);
  const defaultAdvanced = useMemo(
    () => defaultAdvancedFilterState(bounds),
    [bounds],
  );

  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  const [mediaRegionFilter, setMediaRegionFilter] = useState("all");
  const [budgetMin, setBudgetMin] = useState(() => bounds.minPrice);
  const [budgetMax, setBudgetMax] = useState(() => bounds.maxPrice);
  const [targetAgePick, setTargetAgePick] = useState<
    Partial<Record<TargetAgeBucket, boolean>>
  >({});
  const [targetTraitsPick, setTargetTraitsPick] = useState<
    Partial<Record<string, boolean>>
  >({});

  useEffect(() => {
    setBudgetMin(bounds.minPrice);
    setBudgetMax(bounds.maxPrice);
  }, [bounds.minPrice, bounds.maxPrice]);

  const filterState = useMemo(
    () => ({
      ...defaultAdvanced,
      priceMin: budgetMin,
      priceMax: budgetMax,
      targetAgePick,
    }),
    [defaultAdvanced, budgetMin, budgetMax, targetAgePick],
  );

  const toggleTargetAge = useCallback((k: TargetAgeBucket) => {
    setTargetAgePick((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      if (!next[k]) delete next[k];
      return next;
    });
  }, []);

  const regionFilterOptions = useMemo(
    () => buildMediaRegionFilterOptions(catalog, (key) => tMedia(key)),
    [catalog, tMedia],
  );

  useLayoutEffect(() => {
    setCompareItems(entriesToCompareMediaItems(getCompareCartEntries(), catalog));
  }, [catalog]);

  useEffect(() => {
    return subscribeCompareCart(() => {
      setCompareItems(
        entriesToCompareMediaItems(getCompareCartEntries(), catalog),
      );
    });
  }, [catalog]);

  useEffect(() => {
    if (skipFirstComparePersist.current) {
      skipFirstComparePersist.current = false;
      return;
    }
    setCompareCartEntries(
      compareItems.map((m) => ({
        id: m.id,
        name: m.name,
        nameEn: m.nameEn,
      })),
    );
  }, [compareItems]);

  /** 검색어·선택 매체 + 유형·지역·예산 범위·타겟 연령 + 기본 고급 스키마 */
  const filtered = useMemo(() => {
    let data = catalog;

    if (searchTarget) {
      data = data.filter((m) => m.id === searchTarget);
    } else if (textFilter.trim()) {
      const lower = textFilter.toLowerCase();
      data = data.filter((m) => matchesMediaTextQuery(m, lower));
    }

    const activeTraits = Object.entries(targetTraitsPick).filter(
      ([, v]) => v,
    );

    return data.filter((m) => {
      if (!matchesMainCategory(m, mainCategory)) return false;
      if (mainCategory === "transit" && !matchesTransitSub(m, transitSub))
        return false;
      if (!passesMediaAdvancedFilters(m, filterState, bounds)) return false;
      if (mediaRegionFilter !== "all" && (m.region ?? "") !== mediaRegionFilter)
        return false;
      if (mediaTypeFilter !== "all" && (m.type ?? "") !== mediaTypeFilter)
        return false;
      if (activeTraits.length > 0) {
        const haystack = `${(m.tags ?? []).join(" ")} ${(m.subCategory ?? "")} ${
          m.location
        } ${(m.nearbyFacilities ?? "")}`.toLowerCase();
        const ok = activeTraits.some(([k]) => {
          switch (k) {
            case "commute":
              return /출퇴근|직장인|오피스|역세권|지하철|버스/.test(haystack);
            case "shopping":
              return /쇼핑몰|몰|백화점|아울렛|마트|쇼핑/.test(haystack);
            case "leisure_night":
              return /야간|나이트|pub|펍|클럽|거리공연|여가|공연장/.test(
                haystack,
              );
            case "tourism":
              return /관광|tour|여행|랜드마크|명소|핫플|공항|역사/.test(
                haystack,
              );
            case "fandom":
              return /팬덤|아이돌|응원|생일광고|버스킹|팬미팅|콘서트/.test(
                haystack,
              );
            default:
              return false;
          }
        });
        if (!ok) return false;
      }
      return true;
    });
  }, [
    catalog,
    searchTarget,
    textFilter,
    mainCategory,
    transitSub,
    filterState,
    bounds,
    mediaRegionFilter,
    mediaTypeFilter,
  ]);

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case "priceAsc":
        return arr.sort((a, b) => a.price - b.price);
      case "priceDesc":
        return arr.sort((a, b) => b.price - a.price);
      case "trafficDesc":
        return arr.sort(
          (a, b) =>
            (b.dailyFootTraffic ?? 0) - (a.dailyFootTraffic ?? 0),
        );
      default:
        return arr;
    }
  }, [filtered, sortBy]);

  useEffect(() => {
    if (mapSelectedId == null) return;
    if (!sortedFiltered.some((m) => m.id === mapSelectedId))
      setMapSelectedId(null);
  }, [sortedFiltered, mapSelectedId]);

  useEffect(() => {
    setCatalogPage(1);
  }, [
    searchTarget,
    textFilter,
    filterState,
    sortBy,
    mediaRegionFilter,
    mediaTypeFilter,
  ]);

  const pagedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize;
    return sortedFiltered.slice(start, start + catalogPageSize);
  }, [sortedFiltered, catalogPage, catalogPageSize]);

  const catalogPageCount = Math.max(
    1,
    Math.ceil(sortedFiltered.length / catalogPageSize),
  );

  useEffect(() => {
    if (browseMode !== "map" || mapSelectedId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [browseMode, mapSelectedId]);

  const regions = [
    { value: "all", label: t("media.allRegions") },
    { value: "seoul", label: t("media.regions.seoul") },
    { value: "busan", label: t("media.regions.busan") },
    { value: "jeju", label: t("media.regions.jeju") },
    { value: "national", label: t("media.regions.national") },
  ];

  const resetFilters = () => {
    setSearchTarget(null);
    setTextFilter("");
    setMapSelectedId(null);
    setSortBy("default");
    setMediaTypeFilter("all");
    setMediaRegionFilter("all");
    setBudgetMin(bounds.minPrice);
    setBudgetMax(bounds.maxPrice);
    setTargetAgePick({});
    setTargetTraitsPick({});
  };

  const handleMediaView = useCallback((media: MediaItem) => {
    addRecentlyViewedId(media.id);
    setSearchTarget(media.id);
    setTextFilter("");
    setMapSelectedId(media.id);
  }, []);

  const toggleCompare = useCallback((media: MediaItem) => {
    setCompareItems((prev) => {
      const exists = prev.find((m) => m.id === media.id);
      if (exists) return prev.filter((m) => m.id !== media.id);
      if (prev.length >= COMPARE_MAX_ITEMS) return prev;
      return [...prev, media];
    });
  }, []);

  const addManyToCompare = useCallback((items: MediaItem[]) => {
    setCompareItems((prev) => {
      const next = [...prev];
      for (const m of items) {
        if (next.length >= COMPARE_MAX_ITEMS) break;
        if (!next.some((x) => x.id === m.id)) next.push(m);
      }
      return next;
    });
  }, []);

  const isInCompare = (id: string) => compareItems.some((m) => m.id === id);

  const mapSelectedMedia =
    mapSelectedId != null
      ? sortedFiltered.find((m) => m.id === mapSelectedId) ?? null
      : null;

  const handleMapSelectId = useCallback((id: string | null) => {
    if (id == null) {
      setMapSelectedId(null);
      return;
    }
    setMapSelectedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <>
      <section className="bg-navy py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("media.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("media.subtitle")}</p>
          <div className="mt-6">
            <SolutionCtaButton
              href="/contact"
              label={
                isKo
                  ? "맞춤형 OOH 캠페인 제안 받기"
                  : "Get Custom OOH Campaign Proposal"
              }
              size="lg"
              className="h-12"
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-center">
            <div className="inline-flex rounded-full border border-navy/10 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setMainTab("search")}
                className={`touch-manipulation rounded-full px-5 py-2.5 text-sm font-semibold transition-colors sm:px-8 ${
                  mainTab === "search"
                    ? "bg-navy text-white shadow-sm"
                    : "text-muted-foreground hover:bg-slate-50"
                }`}
              >
                {t("media.ai.tabSearch")}
              </button>
              <button
                type="button"
                onClick={() => setMainTab("ai")}
                className={`touch-manipulation rounded-full px-5 py-2.5 text-sm font-semibold transition-colors sm:px-8 ${
                  mainTab === "ai"
                    ? "bg-gradient-to-r from-navy to-navy/90 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-slate-50"
                }`}
              >
                {t("media.ai.tabAi")}
              </button>
            </div>
          </div>

          {mainTab === "ai" ? (
            <MediaAiRecommendPanel
              locale={locale}
              regionOptions={regions}
              catalog={catalog}
              compareItems={compareItems}
              toggleCompare={toggleCompare}
              isInCompare={isInCompare}
              addManyToCompare={addManyToCompare}
            />
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-2">
                {MAIN_CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      setMainCategory(cat.key);
                      setTransitSub("all");
                    }}
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      mainCategory === cat.key
                        ? "border-navy bg-navy text-white shadow-sm"
                        : "border-navy/10 bg-white text-muted-foreground hover:border-navy/25 hover:text-navy"
                    }`}
                  >
                    {isKo ? cat.nameKo : cat.nameEn}
                  </button>
                ))}
              </div>

              {mainCategory === "transit" ? (
                <div className="flex flex-wrap gap-2">
                  {TRANSIT_SUB_CATEGORIES.map((sub) => (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => setTransitSub(sub.key)}
                      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                        transitSub === sub.key
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400"
                      }`}
                    >
                      {isKo ? sub.nameKo : sub.nameEn}
                    </button>
                  ))}
                </div>
              ) : null}

              <MediaCatalogFiltersBar
                search={
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-navy">
                      {t("common.search")}
                    </label>
                    <MediaSearchAutocomplete
                      locale={locale}
                      catalog={catalog}
                      onSelect={handleMediaView}
                      onSearchSubmit={(q) => {
                        setSearchTarget(null);
                        setTextFilter(q);
                        setBrowseMode("list");
                      }}
                      onQueryChange={(q) => {
                        if (!q.trim()) setTextFilter("");
                      }}
                      searchButtonLabel={t("media.searchButton")}
                    />
                  </div>
                }
                mediaTypeFilter={mediaTypeFilter}
                onMediaTypeFilterChange={setMediaTypeFilter}
                mediaRegionFilter={mediaRegionFilter}
                onMediaRegionFilterChange={setMediaRegionFilter}
                regionOptions={regionFilterOptions}
                bounds={bounds}
                budgetMin={budgetMin}
                budgetMax={budgetMax}
                onBudgetMinChange={setBudgetMin}
                onBudgetMaxChange={setBudgetMax}
                targetAgePick={targetAgePick}
                onToggleTargetAge={toggleTargetAge}
                targetTraitsPick={targetTraitsPick}
                onToggleTargetTrait={(key) =>
                  setTargetTraitsPick((prev) => ({
                    ...prev,
                    [key]: !prev[key],
                  }))
                }
                onReset={resetFilters}
              />

              <div className="min-w-0">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {t("media.results")}: {sortedFiltered.length}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-3 py-1.5 text-xs font-medium text-navy">
                      <span className="text-muted-foreground">
                        {t("media.sortLabel")}
                      </span>
                      <select
                        className="max-w-[10rem] rounded-md border border-navy/15 bg-slate-50 px-2 py-0.5 text-xs font-semibold"
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(
                            e.target.value as typeof sortBy,
                          )
                        }
                      >
                        <option value="default">
                          {t("media.sortDefault")}
                        </option>
                        <option value="priceAsc">
                          {t("media.sortPriceAsc")}
                        </option>
                        <option value="priceDesc">
                          {t("media.sortPriceDesc")}
                        </option>
                        <option value="trafficDesc">
                          {t("media.sortTrafficDesc")}
                        </option>
                      </select>
                    </label>
                    <div className="inline-flex rounded-full border border-navy/15 bg-slate-50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setBrowseMode("list")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          browseMode === "list"
                            ? "bg-white text-navy shadow-sm"
                            : "text-muted-foreground hover:text-navy"
                        }`}
                      >
                        <LayoutList className="h-3.5 w-3.5" />
                        {t("media.browseViewList")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrowseMode("map")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          browseMode === "map"
                            ? "bg-white text-navy shadow-sm"
                            : "text-muted-foreground hover:text-navy"
                        }`}
                      >
                        <MapIcon className="h-3.5 w-3.5" />
                        {t("media.browseViewMap")}
                      </button>
                    </div>
                    {browseMode === "list" ? (
                      <MediaCatalogGridCompactToggle
                        layout={catalogCardLayout}
                        onLayoutChange={setCatalogCardLayout}
                        gridLabel={t("media.browseCardLayoutGrid")}
                        compactLabel={t("media.browseCardLayoutCompact")}
                      />
                    ) : null}
                    {browseMode === "list" ? (
                      <label className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-3 py-1.5 text-xs font-medium text-navy">
                        <span className="text-muted-foreground">
                          {t("media.perPage")}
                        </span>
                        <select
                          className="rounded-md border border-navy/15 bg-slate-50 px-2 py-0.5 text-xs font-semibold"
                          value={catalogPageSize}
                          onChange={(e) => {
                            setCatalogPageSize(Number(e.target.value));
                            setCatalogPage(1);
                          }}
                        >
                          <option value={12}>12</option>
                          <option value={24}>24</option>
                          <option value={48}>48</option>
                        </select>
                      </label>
                    ) : null}
                    {browseMode === "list" ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            addManyToCompare(
                              pagedCatalog.filter(
                                (m) => m.catalogSource !== "network",
                              ),
                            )
                          }
                          disabled={pagedCatalog.length === 0}
                        >
                          전체선택
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCompareItems([])}
                          disabled={compareItems.length === 0}
                        >
                          전체삭제
                        </Button>
                      </>
                    ) : null}
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                      <ShieldCheck className="h-4 w-4" aria-hidden />
                      <span>{tMedia("browseCatalogVerifiedBadge")}</span>
                    </div>
                  </div>
                </div>

                {sortedFiltered.length === 0 ? (
                  <div className="flex h-64 items-center justify-center rounded-xl border text-muted-foreground">
                    {t("media.noResults")}
                  </div>
                ) : browseMode === "map" ? (
                  <div className="relative">
                    <MediaBrowseMap
                      items={sortedFiltered}
                      locale={locale}
                      selectedId={mapSelectedId}
                      onSelectId={handleMapSelectId}
                    />
                    {mapSelectedMedia ? (
                      <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center p-3 sm:p-4 md:items-start md:justify-end">
                        <div
                          className="pointer-events-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200 md:slide-in-from-bottom-0 md:slide-in-from-right-3"
                          role="dialog"
                          aria-label={
                            isKo
                              ? mapSelectedMedia.name
                              : mapSelectedMedia.nameEn
                          }
                        >
                          <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-2xl shadow-navy/20 ring-1 ring-black/5">
                            <div className="flex items-start gap-3 border-b border-navy/8 p-3 sm:p-4">
                              <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-32">
                                <MediaCatalogThumbnail
                                  media={mapSelectedMedia}
                                  placeholderLabel={t("media.imagePreparing")}
                                  className="h-full w-full rounded-lg"
                                  bottomGradientClassName={null}
                                  placeholderSize="xs"
                                />
                              </div>
                              <div className="min-w-0 flex-1 pt-0.5">
                                <h3 className="line-clamp-2 text-base font-bold leading-snug text-navy sm:text-lg">
                                  {isKo
                                    ? mapSelectedMedia.name
                                    : mapSelectedMedia.nameEn}
                                </h3>
                                <p className="mt-1.5 text-sm font-bold tabular-nums text-navy">
                                  {formatMediaPriceWonWithSymbol(mapSelectedMedia.price)}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    {" "}
                                    ·{" "}
                                    {tMedia(
                                      mediaPricePeriodTranslationKey(
                                        mapSelectedMedia.pricePeriod,
                                      ),
                                    )}
                                  </span>
                                </p>
                                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Users
                                    className="h-3.5 w-3.5 shrink-0 text-gold-dark"
                                    aria-hidden
                                  />
                                  <span>
                                    {t("media.mapPopupFootTraffic")}:{" "}
                                    <span className="font-semibold text-navy/85">
                                      {mapSelectedMedia.dailyFootTraffic.toLocaleString()}
                                    </span>
                                  </span>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setMapSelectedId(null)}
                                className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-slate-100 hover:text-navy"
                                aria-label={t("media.mapPopupClose")}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2 p-3 sm:p-4 sm:pt-3">
                              <Link
                                href={mediaItemDetailPath(
                                  mapSelectedMedia.id,
                                )}
                                className="flex-1 min-w-[8rem]"
                              >
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-10 w-full font-semibold"
                                >
                                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                  {t("media.mapCardDetail")}
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                onClick={() => toggleCompare(mapSelectedMedia)}
                                className={`h-10 flex-1 min-w-[8rem] font-semibold ${
                                  isInCompare(mapSelectedMedia.id)
                                    ? "border-2 border-gold bg-white text-gold hover:bg-gold/10"
                                    : "bg-navy text-white hover:bg-navy/90"
                                }`}
                              >
                                {isInCompare(mapSelectedMedia.id)
                                  ? (isKo ? "✓ 선택됨" : "✓ Selected")
                                  : (isKo ? "+ 비교 추가" : "+ Compare")}
                              </Button>
                              <Link
                                href={`/quote?media=${mapSelectedMedia.id}`}
                                className="flex-1 min-w-[8rem]"
                              >
                                <Button
                                  size="sm"
                                  className="h-10 w-full bg-gold font-semibold text-navy hover:bg-gold-dark"
                                >
                                  <Calculator className="mr-1.5 h-3.5 w-3.5" />
                                  {t("media.mapCardQuote")}
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {catalogCardLayout === "grid" ? (
                  <div className={MEDIA_CATALOG_GRID_CLASS}>
                    {pagedCatalog.map((media) => (
                      <MediaCatalogGridCard
                        key={media.id}
                        variant="link"
                        media={media}
                        isKo={isKo}
                        imagePreparingLabel={t("media.imagePreparing")}
                        popularIds={popularIds}
                        topLeftSlot={
                          <label
                            className="absolute left-2.5 top-2.5 z-20 flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-full border-2 border-navy bg-white shadow-md"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            title={t("media.compareToggleAria")}
                          >
                            <input
                              type="checkbox"
                              checked={isInCompare(media.id)}
                              onChange={() => toggleCompare(media)}
                              disabled={
                                media.catalogSource === "network" ||
                                (!isInCompare(media.id) &&
                                  compareItems.length >= COMPARE_MAX_ITEMS)
                              }
                              aria-label={t("media.compareToggleAria")}
                              className="h-4 w-4 rounded border-2 border-navy bg-white text-gold accent-gold"
                            />
                          </label>
                        }
                      />
                    ))}
                  </div>
                    ) : (
                  <div className={MEDIA_CATALOG_COMPACT_GRID_CLASS}>
                    {pagedCatalog.map((media) => (
                      <MediaCatalogCompactLinkRow
                        key={media.id}
                        media={media}
                        isKo={isKo}
                        href={mediaItemDetailPath(media.id)}
                        imagePreparingLabel={t("media.imagePreparing")}
                        pricePeriodLabel={tMedia(
                          mediaPricePeriodTranslationKey(media.pricePeriod),
                        )}
                        popularIds={popularIds}
                        leadingSlot={
                          <label
                            className="flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-lg border border-navy/20 bg-white shadow-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            title={t("media.compareToggleAria")}
                          >
                            <input
                              type="checkbox"
                              checked={isInCompare(media.id)}
                              onChange={() => toggleCompare(media)}
                              disabled={
                                media.catalogSource === "network" ||
                                (!isInCompare(media.id) &&
                                  compareItems.length >= COMPARE_MAX_ITEMS)
                              }
                              aria-label={t("media.compareToggleAria")}
                              className="h-4 w-4 rounded border-2 border-navy bg-white text-gold accent-gold shadow-none"
                            />
                          </label>
                        }
                      />
                    ))}
                  </div>
                    )}
                    {catalogPageCount > 1 ? (
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={catalogPage <= 1}
                          onClick={() =>
                            setCatalogPage((p) => Math.max(1, p - 1))
                          }
                        >
                          {t("media.pagePrev")}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {t("media.pageSummary", {
                            from:
                              sortedFiltered.length === 0
                                ? 0
                                : (catalogPage - 1) * catalogPageSize + 1,
                            to: Math.min(
                              catalogPage * catalogPageSize,
                              sortedFiltered.length,
                            ),
                            total: sortedFiltered.length,
                          })}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={catalogPage >= catalogPageCount}
                          onClick={() =>
                            setCatalogPage((p) =>
                              Math.min(catalogPageCount, p + 1),
                            )
                          }
                        >
                          {t("media.pageNext")}
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          )}

          <RecentlyViewedMedia locale={locale} />
        </div>
      </section>

      <CompareBar
        items={compareItems}
        locale={locale}
        onClear={() => setCompareItems([])}
      />

      {compareItems.length > 0 ? (
        <div className={FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS} aria-hidden />
      ) : null}
    </>
  );
}
