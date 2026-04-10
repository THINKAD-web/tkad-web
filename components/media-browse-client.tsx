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
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import { FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS } from "@/components/floating-selection-bar";
import SolutionCtaButton from "@/components/solution-cta-button";
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
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
import {
  matchesMediaTextQuery,
  mediaData,
  type MediaItem,
} from "@/lib/media-data";
import {
  computeCatalogBounds,
  defaultAdvancedFilterState,
  passesMediaAdvancedFilters,
} from "@/lib/media-filter-advanced";
import {
  hasActiveMediaPrecisionSelections,
  passesMediaPrecisionFilters,
} from "@/lib/media-precision-filter-match";
import {
  MEDIA_BROWSE_GRID_MIN_ITEMS,
  PRECISION_BUDGET_MAX_MAN,
  PRECISION_BUDGET_MIN_MAN,
} from "@/lib/media-precision-filter-config";
import {
  MEDIA_CATALOG_GRID_CLASS,
  MEDIA_CATALOG_COMPACT_GRID_CLASS,
  MediaCatalogGridCompactToggle,
} from "@/components/media-catalog-shared";
import { PerPageSelect } from "@/components/per-page-select";
import { MediaPrecisionFiltersAssistant } from "@/components/media-precision-filters-assistant";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MediaKeywordSearchHero } from "@/components/media-keyword-search-hero";
import {
  useMediaCatalogFilters,
} from "@/lib/use-media-catalog-filters";
import { MediaCatalogCompactLinkRow } from "@/components/media-catalog-compact-link";
import { addRecentlyViewedId } from "@/lib/recently-viewed";
import MediaAiRecommendPanel from "@/components/media-ai-recommend-panel";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { KEYWORD_FILTER_SEARCH_DEBOUNCE_MS } from "@/lib/media-keyword-filter-logic";

function subscribeMediaLg(cb: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useLgUp() {
  return useSyncExternalStore(
    subscribeMediaLg,
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

export default function MediaBrowseClient({
  catalog = [],
}: {
  catalog?: MediaItem[];
}) {
  // TODO: dev server restart if needed (after large UI changes)
  const t = useTranslations();
  const tMedia = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";

  const [mainTab, setMainTab] = useState<"search" | "ai">("search");
  const [searchTarget, setSearchTarget] = useState<string | null>(null);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState("");
  const [precisionFiltersOpen, setPrecisionFiltersOpen] = useState(false);
  const lgUp = useLgUp();
  const [browseMode, setBrowseMode] = useState<"list" | "map">("list");
  const [catalogCardLayout, setCatalogCardLayout] = useState<
    "grid" | "compact"
  >("grid");
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(12);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [mapPopupOpen, setMapPopupOpen] = useState(true);
  const [compareItems, setCompareItems] = useState<MediaItem[]>([]);
  const skipFirstComparePersist = useRef(true);
  const popularIds = new Set(["1", "2", "3", "8", "9"]);
  const [sortBy, setSortBy] = useState<
    "default" | "priceAsc" | "priceDesc" | "trafficDesc"
  >("default");

  /** 서버 카탈로그가 비었을 때 목업 `mediaData`로 폴백. 초기 1회만 셔플. */
  const effectiveCatalog = useMemo(() => {
    const base = catalog.length > 0 ? catalog : mediaData;
    const arr = [...base];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bounds = useMemo(
    () => computeCatalogBounds(effectiveCatalog),
    [effectiveCatalog],
  );
  const defaultAdvanced = useMemo(
    () => defaultAdvancedFilterState(bounds),
    [bounds],
  );

  const [budgetMin, setBudgetMin] = useState(0);
  const [budgetMax, setBudgetMax] = useState(999999999);

  useEffect(() => {
    setBudgetMin(bounds.minPrice);
    setBudgetMax(bounds.maxPrice);
  }, [bounds.minPrice, bounds.maxPrice]);
  const {
    filters,
    toggleFilter,
    resetFilters: resetAdvancedFilters,
    clearCategory,
    selectAllInCategory,
    setFilters,
  } = useMediaCatalogFilters();

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedCatalogSearch(catalogSearchQuery);
    }, KEYWORD_FILTER_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [catalogSearchQuery]);

  const filterState = useMemo(
    () => ({
      ...defaultAdvanced,
      priceMin: budgetMin * 10000,
      priceMax: budgetMax * 10000,
      targetAgePick: filters.targetAge,
    }),
    [defaultAdvanced, budgetMin, budgetMax, filters.targetAge],
  );

  const precisionBudgetBounds = useMemo(
    () => ({
      minPrice: PRECISION_BUDGET_MIN_MAN,
      maxPrice: PRECISION_BUDGET_MAX_MAN,
    }),
    [],
  );

  useLayoutEffect(() => {
    setCompareItems(
      entriesToCompareMediaItems(getCompareCartEntries(), effectiveCatalog),
    );
  }, [effectiveCatalog]);

  useEffect(() => {
    return subscribeCompareCart(() => {
      setCompareItems(
        entriesToCompareMediaItems(getCompareCartEntries(), effectiveCatalog),
      );
    });
  }, [effectiveCatalog]);

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

  const clearPrecisionSelections = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      areaSpot: {},
      mediaFormat: {},
      targetPersona: {},
      industryTag: {},
      campaignPurpose: {},
      duration: {},
      specialFeature: {},
    }));
  }, [setFilters]);

  /** 검색/히어로 → 고급(예산·슬라이더 등) → 정밀 필터(AND) → 단계적 폴백으로 0건 방지 */
  const searchFiltered = useMemo(() => {
    let data = effectiveCatalog;
    if (searchTarget) {
      data = data.filter((m) => m.id === searchTarget);
    } else if (debouncedCatalogSearch.trim()) {
      const lower = debouncedCatalogSearch.toLowerCase();
      data = data.filter((m) => matchesMediaTextQuery(m, lower));
    }
    return data;
  }, [effectiveCatalog, searchTarget, debouncedCatalogSearch]);

  const advancedFiltered = useMemo(
    () =>
      searchFiltered.filter((m) =>
        passesMediaAdvancedFilters(m, filterState, bounds),
      ),
    [searchFiltered, filterState, bounds],
  );

  const strictPrecisionFiltered = useMemo(
    () =>
      advancedFiltered.filter((m) => passesMediaPrecisionFilters(m, filters)),
    [advancedFiltered, filters],
  );

  const precisionSelectionsActive = useMemo(
    () => hasActiveMediaPrecisionSelections(filters),
    [filters],
  );

  const precisionFilterRelaxed =
    strictPrecisionFiltered.length === 0 &&
    precisionSelectionsActive &&
    advancedFiltered.length > 0;

  const browseLenientSearchTier =
    strictPrecisionFiltered.length === 0 &&
    !precisionFilterRelaxed &&
    searchFiltered.length > 0 &&
    effectiveCatalog.length > 0;

  /** 정밀 → 고급 → 검색 순으로 적용하되, 모두 0건이면 전체 목록 */
  const filtered = useMemo(() => {
    if (strictPrecisionFiltered.length > 0) return strictPrecisionFiltered;
    if (advancedFiltered.length > 0) return advancedFiltered;
    if (searchFiltered.length > 0) return searchFiltered;
    return effectiveCatalog;
  }, [
    strictPrecisionFiltered,
    advancedFiltered,
    searchFiltered,
    effectiveCatalog,
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

  /** 필터 결과가 적을 때 카탈로그에서 부족분만큼 덧붙여 그리드·지도 최소 노출 유지 */
  const { gridDisplayList, catalogMinPadActive } = useMemo(() => {
    if (
      sortedFiltered.length >= MEDIA_BROWSE_GRID_MIN_ITEMS ||
      effectiveCatalog.length < MEDIA_BROWSE_GRID_MIN_ITEMS
    ) {
      return {
        gridDisplayList: sortedFiltered,
        catalogMinPadActive: false,
      };
    }
    const need = MEDIA_BROWSE_GRID_MIN_ITEMS - sortedFiltered.length;
    const seen = new Set(sortedFiltered.map((m) => m.id));
    const extras = effectiveCatalog.filter((m) => !seen.has(m.id)).slice(0, need);
    return {
      gridDisplayList: [...sortedFiltered, ...extras],
      catalogMinPadActive: extras.length > 0,
    };
  }, [sortedFiltered, effectiveCatalog]);

  useEffect(() => {
    if (mapSelectedId == null) return;
    if (!gridDisplayList.some((m) => m.id === mapSelectedId))
      setMapSelectedId(null);
  }, [gridDisplayList, mapSelectedId]);

  useEffect(() => {
    setCatalogPage(1);
  }, [searchTarget, debouncedCatalogSearch, filterState, sortBy, filters]);

  const pagedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize;
    return gridDisplayList.slice(start, start + catalogPageSize);
  }, [gridDisplayList, catalogPage, catalogPageSize]);

  const catalogPageCount = Math.max(
    1,
    Math.ceil(gridDisplayList.length / catalogPageSize),
  );

  useEffect(() => {
    if (browseMode !== "map" || mapSelectedId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapPopupOpen(false);
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
    setCatalogSearchQuery("");
    setDebouncedCatalogSearch("");
    setMapSelectedId(null);
    setSortBy("default");
    setBudgetMin(PRECISION_BUDGET_MIN_MAN);
    setBudgetMax(PRECISION_BUDGET_MAX_MAN);
    resetAdvancedFilters();
  };

  const togglePrecisionFilters = useCallback(() => {
    setPrecisionFiltersOpen((o) => !o);
  }, []);

  const precisionAssistantProps = {
    budgetBounds: precisionBudgetBounds,
    budgetMin,
    budgetMax,
    onBudgetMinChange: setBudgetMin,
    onBudgetMaxChange: setBudgetMax,
    filters,
    onToggleFilter: toggleFilter,
    onReset: resetFilters,
    clearCategory,
    selectAllInCategory,
  };

  const handleMediaView = useCallback((media: MediaItem) => {
    addRecentlyViewedId(media.id);
    setSearchTarget(media.id);
    setCatalogSearchQuery("");
    setDebouncedCatalogSearch("");
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
      ? gridDisplayList.find((m) => m.id === mapSelectedId) ?? null
      : null;

  const handleMapSelectId = useCallback((id: string | null) => {
    if (id == null) {
      // X 버튼 클릭 시에도 selectedId는 유지 (지도 위치 유지)
      setMapPopupOpen(false);
      return;
    }
    // 새로운 매체 선택
    setMapSelectedId(id);
    setMapPopupOpen(true);
  }, []);

  return (
    <>
      <section className="bg-navy py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              {t("media.title")}
            </h1>
            <span className="rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">BETA</span>
          </div>
          <p className="mt-2 text-slate-300">
            {t("media.subtitle")}
          </p>
          <div className="relative mx-auto mt-8 max-w-lg sm:mt-10">
            <MediaKeywordSearchHero
              variant="embed"
              featured
              value={catalogSearchQuery}
              onChange={setCatalogSearchQuery}
            />
          </div>
          <div className="mt-8 sm:mt-10">
            <SolutionCtaButton
              href="/contact"
              variant="outline"
              label={isKo ? "맞춤형 OOH 캠페인 제안 받기" : "Get Custom OOH Campaign Proposal"}
              size="lg"
              className="h-11 border-white/35 bg-white/10 text-white shadow-none backdrop-blur-sm hover:border-white/55 hover:bg-white/18 hover:text-white"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/90 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {mainTab === "search" ? (
            <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
              {t("media.resultsSectionEyebrow")}
            </p>
          ) : null}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex rounded-full border border-slate-200/90 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setMainTab("search")}
                className={`touch-manipulation rounded-full px-5 py-2.5 text-sm font-semibold transition-colors sm:px-8 ${
                  mainTab === "search"
                    ? "bg-navy text-white shadow-sm"
                    : "text-muted-foreground hover:bg-white"
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
                    : "text-muted-foreground hover:bg-white"
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
              catalog={effectiveCatalog}
              compareItems={compareItems}
              toggleCompare={toggleCompare}
              isInCompare={isInCompare}
              addManyToCompare={addManyToCompare}
            />
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="inline-flex h-auto w-full items-center justify-center gap-2 border border-dashed border-slate-300/80 bg-slate-50/60 py-2.5 text-xs font-medium text-muted-foreground hover:bg-slate-100/90 sm:w-auto sm:self-start sm:px-4 sm:text-sm"
                  onClick={togglePrecisionFilters}
                >
                  {precisionFiltersOpen
                    ? t("media.advancedFiltersHide")
                    : t("media.advancedFiltersShow")}
                  {precisionFiltersOpen ? (
                    <ChevronUp className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <ChevronDown className="size-4 shrink-0" aria-hidden />
                  )}
                </Button>
                {!precisionFiltersOpen ? (
                  <div className="rounded-xl border border-slate-100 bg-white/90 px-4 py-3.5 text-left shadow-sm ring-1 ring-slate-100/80">
                    <p className="text-[15px] font-semibold leading-snug text-navy sm:text-base">
                      {t("media.advancedFiltersCollapsedHint")}
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
                      {t("media.advancedFiltersCollapsedSubhint")}
                    </p>
                  </div>
                ) : null}
              </div>

              {lgUp && precisionFiltersOpen ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3.5 shadow-sm sm:px-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground/85">
                      {t("media.advancedFiltersSectionLabel")}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/85">
                      {t("media.advancedFiltersSectionSubtext")}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {tMedia("precisionFilterPanelIntro")}
                    </p>
                  </div>
                  <MediaPrecisionFiltersAssistant {...precisionAssistantProps} />
                </div>
              ) : null}

              <Sheet
                open={precisionFiltersOpen && !lgUp}
                onOpenChange={setPrecisionFiltersOpen}
              >
                <SheetContent
                  side="bottom"
                  showCloseButton
                  className="max-h-[92vh] gap-0 overflow-y-auto rounded-t-2xl border-t-2 border-dashed border-slate-300/80 bg-slate-50/40 p-0"
                >
                  <SheetHeader className="sticky top-0 z-10 border-b border-dashed border-slate-200/80 bg-background/95 px-4 pb-3 pt-2 text-left backdrop-blur-sm">
                    <SheetTitle className="text-left text-base font-bold tracking-tight text-navy">
                      {t("media.advancedFiltersSectionLabel")}
                    </SheetTitle>
                    <p className="text-[11px] text-muted-foreground">
                      {t("media.advancedFiltersSectionSubtext")}
                    </p>
                    <p className="pt-1 text-[12px] leading-relaxed text-muted-foreground">
                      {tMedia("precisionFilterPanelIntro")}
                    </p>
                  </SheetHeader>
                  <div className="mx-3 mb-4 mt-2 sm:mx-4">
                    <MediaPrecisionFiltersAssistant {...precisionAssistantProps} />
                  </div>
                  <div className="sticky bottom-0 border-t border-slate-200/80 bg-background/95 px-4 py-3 backdrop-blur-sm">
                    <Button
                      type="button"
                      className="w-full bg-navy font-semibold text-white hover:bg-navy/90"
                      onClick={() => setPrecisionFiltersOpen(false)}
                    >
                      필터 적용하기
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-navy">
                      {t("media.results")}: {gridDisplayList.length}
                      {catalogMinPadActive ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {tMedia("catalogMinPadCountHint", {
                            matched: sortedFiltered.length,
                          })}
                        </span>
                      ) : null}
                    </span>
                    {debouncedCatalogSearch.trim() ? (
                      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gold/35 bg-gradient-to-r from-gold/10 to-amber-50/90 px-3 py-1 text-xs font-semibold text-navy shadow-sm">
                        <Search className="size-3.5 shrink-0 text-gold-dark" aria-hidden />
                        <span className="min-w-0 truncate">
                          {t("media.activeKeywordLabel")}: {debouncedCatalogSearch}
                        </span>
                      </span>
                    ) : null}
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
                      <PerPageSelect
                        value={catalogPageSize}
                        onChange={(next) => {
                          setCatalogPageSize(next);
                          setCatalogPage(1);
                        }}
                      />
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

                {precisionFilterRelaxed ? (
                  <div
                    role="status"
                    className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="min-w-0 leading-relaxed">
                      {tMedia("precisionFilterRelaxedBanner")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-amber-300 bg-white hover:bg-amber-50"
                      onClick={clearPrecisionSelections}
                    >
                      {tMedia("clearPrecisionFilters")}
                    </Button>
                  </div>
                ) : null}

                {browseLenientSearchTier ? (
                  <div
                    role="status"
                    className="mb-4 flex flex-col gap-3 rounded-xl border border-indigo-200/90 bg-indigo-50/90 px-4 py-3 text-sm text-indigo-950 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="min-w-0 leading-relaxed">
                      {tMedia("browseLenientSearchBanner")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-indigo-300 bg-white hover:bg-indigo-50"
                      onClick={resetFilters}
                    >
                      {tMedia("resetAllBrowseFilters")}
                    </Button>
                  </div>
                ) : null}

                {catalogMinPadActive ? (
                  <div
                    role="status"
                    className="mb-4 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm leading-relaxed text-emerald-950"
                  >
                    {tMedia("catalogMinPadBanner", {
                      matched: sortedFiltered.length,
                      shown: gridDisplayList.length,
                    })}
                  </div>
                ) : null}

                {gridDisplayList.length === 0 ? (
                  <div className="flex min-h-[32rem] flex-col items-center justify-center gap-8 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/90 px-6 py-20 text-center sm:px-10">
                    <p className="max-w-2xl text-3xl font-bold tracking-tight text-navy sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
                      {tMedia("catalogBrowseEmptyTitle")}
                    </p>
                    <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                      {tMedia("catalogBrowseEmptySubtitle")}
                    </p>
                    <Button
                      type="button"
                      size="lg"
                      className="min-h-12 min-w-[14rem] px-8 text-base font-semibold shadow-md"
                      onClick={resetFilters}
                    >
                      {tMedia("resetAllBrowseFiltersProminent")}
                    </Button>
                  </div>
                ) : browseMode === "map" ? (
                  <div className="relative">
                    <MediaBrowseMap
                      items={gridDisplayList}
                      locale={locale}
                      selectedId={mapSelectedId}
                      onSelectId={handleMapSelectId}
                    />
                    {mapSelectedMedia && mapPopupOpen ? (
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
                                onClick={() => setMapPopupOpen(false)}
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
                              gridDisplayList.length === 0
                                ? 0
                                : (catalogPage - 1) * catalogPageSize + 1,
                            to: Math.min(
                              catalogPage * catalogPageSize,
                              gridDisplayList.length,
                            ),
                            total: gridDisplayList.length,
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
