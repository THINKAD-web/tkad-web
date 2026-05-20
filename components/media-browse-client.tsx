"use client";

// 배포 테스트: v1.0 - Vercel 자동 배포 확인 중
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import {
  Calculator,
  LayoutList,
  Map as MapIcon,
  ExternalLink,
  X,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import { MediaScarcitySection } from "@/components/media-scarcity-section";
import { useMediaAvailabilitySummary } from "@/lib/use-media-availability-summary";
import { FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS } from "@/components/floating-selection-bar";
import { INDUSTRY_BUDGET_SESSION_KEY } from "@/lib/industry-landing";
import { BtnBlock } from "@/components/brutalist";
import { Link } from "@/i18n/navigation";
import {
  CategoryExploreHero,
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
} from "@/components/category-explore-hero";
import { cn } from "@/lib/utils";
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { useSearchParams } from "next/navigation";
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
import {
  useMediaCatalogFilters,
} from "@/lib/use-media-catalog-filters";
import { MediaCatalogCompactLinkRow } from "@/components/media-catalog-compact-link";
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
  hideHero = false,
}: {
  catalog?: MediaItem[];
  /** region/type/area 랜딩에서 자체 hero 가 이미 있을 때 내부 hero 섹션 숨김 */
  hideHero?: boolean;
}) {
  // TODO: dev server restart if needed (after large UI changes)
  const t = useTranslations();
  const tMedia = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";

  const [searchTarget, setSearchTarget] = useState<string | null>(null);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");
  const [debouncedCatalogSearch, setDebouncedCatalogSearch] = useState("");
  const [precisionFiltersOpen, setPrecisionFiltersOpen] = useState(false);
  const lgUp = useLgUp();
  const [browseMode, setBrowseMode] = useState<"list" | "map">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mediaBrowseMode");
      if (saved === "map" || saved === "list") return saved;
    }
    return "list";
  });
  const [catalogCardLayout, setCatalogCardLayout] = useState<
    "grid" | "compact"
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mediaCatalogLayout");
      if (saved === "grid" || saved === "compact") return saved;
    }
    return "grid";
  });
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(12);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [mapPopupOpen, setMapPopupOpen] = useState(false);
  const [compareItems, setCompareItems] = useState<MediaItem[]>([]);
  const skipFirstComparePersist = useRef(true);
  const popularIds = new Set(["1", "2", "3", "8", "9"]);
  const [sortBy, setSortBy] = useState<
    | "default"
    | "newest"
    | "priceAsc"
    | "priceDesc"
    | "trafficDesc"
    | "ratingDesc"
  >("default");
  const [instantOnlyFilter, setInstantOnlyFilter] = useState(false);
  const { summary: availabilitySummary } = useMediaAvailabilitySummary();

  /**
   * 서버 카탈로그를 그대로 사용. 초기 1회만 셔플.
   * CLAUDE.md: 공개 카탈로그는 DB-backed 가 진실. 서버가 빈 배열을
   * 반환하면 빈 상태 UI 가 노출되어야지, 클라이언트가 마음대로 목업으로
   * 덮으면 안 됨 (운영 사고 은폐).
   */
  const effectiveCatalog = useMemo(() => {
    const arr = [...catalog];
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(INDUSTRY_BUDGET_SESSION_KEY);
    if (!raw) return;
    const n = Number(raw);
    sessionStorage.removeItem(INDUSTRY_BUDGET_SESSION_KEY);
    if (Number.isFinite(n) && n > 0) {
      setBudgetMin(0);
      setBudgetMax(n);
    }
  }, []);
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

  useEffect(() => {
    const next = qFromUrl.trim();
    setCatalogSearchQuery(next);
    setDebouncedCatalogSearch(next);
  }, [qFromUrl]);

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

  // localStorage에 browseMode 저장
  useEffect(() => {
    localStorage.setItem("mediaBrowseMode", browseMode);
  }, [browseMode]);

  // localStorage에 catalogCardLayout 저장
  useEffect(() => {
    localStorage.setItem("mediaCatalogLayout", catalogCardLayout);
  }, [catalogCardLayout]);

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
      case "ratingDesc":
        return arr.sort((a, b) => {
          const ar = a.averageRating ?? 0;
          const br = b.averageRating ?? 0;
          if (br !== ar) return br - ar;
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        });
      case "newest":
        return arr.sort((a, b) => {
          const at = a.createdAt ? Date.parse(a.createdAt) : 0;
          const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
          return bt - at;
        });
      default:
        return arr;
    }
  }, [filtered, sortBy]);

  const catalogListForDisplay = useMemo(() => {
    if (!instantOnlyFilter || !availabilitySummary?.items) {
      return sortedFiltered;
    }
    return sortedFiltered.filter(
      (m) => availabilitySummary.items[m.id]?.tier === "instant",
    );
  }, [sortedFiltered, instantOnlyFilter, availabilitySummary]);

  /** 필터 결과가 적을 때 카탈로그에서 부족분만큼 덧붙여 그리드·지도 최소 노출 유지 */
  const { gridDisplayList, catalogMinPadActive } = useMemo(() => {
    if (
      catalogListForDisplay.length >= MEDIA_BROWSE_GRID_MIN_ITEMS ||
      effectiveCatalog.length < MEDIA_BROWSE_GRID_MIN_ITEMS
    ) {
      return {
        gridDisplayList: catalogListForDisplay,
        catalogMinPadActive: false,
      };
    }
    const need =
      MEDIA_BROWSE_GRID_MIN_ITEMS - catalogListForDisplay.length;
    const seen = new Set(catalogListForDisplay.map((m) => m.id));
    const extras = effectiveCatalog.filter((m) => !seen.has(m.id)).slice(0, need);
    return {
      gridDisplayList: [...catalogListForDisplay, ...extras],
      catalogMinPadActive: extras.length > 0,
    };
  }, [catalogListForDisplay, effectiveCatalog]);

  useEffect(() => {
    // 팝업이 열려있을 때만 선택된 매체가 리스트에 있는지 검증
    // (팝업이 닫혀있으면 선택 상태 유지)
    if (!mapPopupOpen || mapSelectedId == null) return;
    if (!gridDisplayList.some((m) => m.id === mapSelectedId))
      setMapSelectedId(null);
  }, [gridDisplayList, mapSelectedId, mapPopupOpen]);

  useEffect(() => {
    setCatalogPage(1);
  }, [
    searchTarget,
    debouncedCatalogSearch,
    filterState,
    sortBy,
    filters,
    instantOnlyFilter,
  ]);

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
      // X 버튼 클릭: 팝업만 닫고, 지도는 그 자리에 그대로 (selectedId 유지)
      setMapPopupOpen(false);
      return;
    }
    // 새로운 매체 선택: 지도 줌인 + 팝업 열기
    setMapSelectedId(id);
    setMapPopupOpen(true);
  }, []);

  return (
    <>
      {hideHero ? null : (
        <CategoryExploreHero
          code="// 01 · MEDIA"
          showBeta
          headlineBefore={isKo ? "전국 " : "Search "}
          headlineGradient={isKo ? "OOH 매체" : "OOH media"}
          headlineAfter={isKo ? " 검색" : " nationwide"}
          subtitle={t("media.subtitle")}
        >
          <div className="mx-auto mt-1 w-full max-w-xl">
            <div className="tkad-media-hero-search relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/45 sm:left-4"
                aria-hidden
              />
              <input
                type="search"
                value={catalogSearchQuery}
                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                placeholder={
                  isKo ? "매체명, 위치, 키워드로 검색" : "Search media, location, keyword"
                }
                className="h-11 w-full rounded-2xl border border-white/18 bg-white/8 pl-10 pr-3 text-sm text-white shadow-[0_18px_56px_rgba(0,0,0,0.4)] placeholder:text-white/45 backdrop-blur-md focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40 sm:h-12 sm:pl-11 sm:pr-4"
                aria-label={isKo ? "매체 검색" : "Search media"}
              />
            </div>
          </div>
          <CategoryHeroCtaRow className="mx-auto mt-2 w-full max-w-xl flex-row gap-1.5 sm:mt-2.5 sm:gap-2">
            <Link
              href="/media/packages"
              className={cn(
                categoryHeroCtaSecondaryClass,
                "h-10 min-w-0 flex-1 justify-center gap-1 whitespace-nowrap px-2 text-[10px] sm:h-11 sm:flex-none sm:gap-2 sm:px-5 sm:text-sm",
              )}
            >
              <Sparkles className="hidden h-3.5 w-3.5 shrink-0 text-violet-300 sm:inline" aria-hidden />
              {tMedia("packagesBrowseLink")}
              <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-white/75 sm:inline" aria-hidden />
            </Link>
            <Link
              href="/contact"
              className={cn(
                categoryHeroCtaPrimaryClass,
                "h-10 min-w-0 flex-1 justify-center gap-1 whitespace-nowrap px-2 text-[10px] sm:h-11 sm:flex-none sm:gap-2 sm:px-6 sm:text-sm",
              )}
            >
              {tMedia("heroCtaProposal")}
              <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 sm:inline sm:h-4 sm:w-4" aria-hidden />
            </Link>
            <Link
              href="/planner"
              className={cn(
                categoryHeroCtaSecondaryClass,
                "h-10 min-w-0 flex-1 justify-center gap-1 whitespace-nowrap px-2 text-[10px] sm:h-11 sm:flex-none sm:gap-2 sm:px-6 sm:text-sm",
              )}
            >
              {tMedia("heroCtaPlanner")}
              <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-white/75 sm:inline sm:h-4 sm:w-4" aria-hidden />
            </Link>
          </CategoryHeroCtaRow>
        </CategoryExploreHero>
      )}

      <section className="tkad-media-browse-main border-t border-border/60 bg-card py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6">
              <MediaScarcitySection
                catalog={effectiveCatalog}
                summary={availabilitySummary}
                isKo={isKo}
                imagePreparingLabel={t("media.imagePreparing")}
              />

              <aside
                className="flex items-start gap-2.5 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-3.5 py-2.5 sm:items-center sm:gap-3 sm:px-4"
                aria-label={tMedia("browseCatalogVerifiedBadge")}
              >
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-cyan-400 sm:mt-0"
                  aria-hidden
                />
                <p className="min-w-0 text-[13px] leading-snug text-foreground sm:text-sm">
                  <span className="font-semibold">
                    {tMedia("browseCatalogVerifiedBadge")}
                  </span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {tMedia("browseCatalogVerifiedListHint")}
                  </span>
                </p>
              </aside>

              {/* #MEDIA-1: 정밀필터 진입점 숨김 (코드 보존) */}
              <div className="hidden flex-col gap-3">
                <button
                  type="button"
                  onClick={togglePrecisionFilters}
                  className="inline-flex w-full items-center justify-center gap-2 border-2 border-border bg-card px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background sm:w-auto sm:self-start"
                >
                  {precisionFiltersOpen
                    ? t("media.advancedFiltersHide")
                    : t("media.advancedFiltersShow")}
                  {precisionFiltersOpen ? (
                    <ChevronUp className="size-3.5 shrink-0" aria-hidden />
                  ) : (
                    <ChevronDown className="size-3.5 shrink-0" aria-hidden />
                  )}
                </button>
                {!precisionFiltersOpen ? (
                  <div className="border-2 border-border bg-muted px-5 py-4 text-left">
                    <p className="text-[15px] font-bold leading-snug tracking-tight text-foreground sm:text-base">
                      {t("media.advancedFiltersCollapsedHint")}
                    </p>
                    <p className="mt-2 font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground">
                      {t("media.advancedFiltersCollapsedSubhint")}
                    </p>
                  </div>
                ) : null}
              </div>

              {lgUp && precisionFiltersOpen ? (
                <div className="space-y-4">
                  <div className="border-2 border-border bg-card px-5 py-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      [ {t("media.advancedFiltersSectionLabel")} ]
                    </p>
                    <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
                      {t("media.advancedFiltersSectionSubtext")}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-foreground">
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
                  className="max-h-[92vh] gap-0 overflow-y-auto border-t-2 border-border bg-card p-0"
                >
                  <SheetHeader className="sticky top-0 z-10 border-b-2 border-border bg-card px-4 pb-3 pt-3 text-left">
                    <SheetTitle className="text-left text-base font-bold tracking-tight text-foreground">
                      {t("media.advancedFiltersSectionLabel")}
                    </SheetTitle>
                    <p className="font-mono text-[11px] tracking-tight text-muted-foreground">
                      {t("media.advancedFiltersSectionSubtext")}
                    </p>
                    <p className="pt-1 text-[12px] leading-relaxed text-foreground">
                      {tMedia("precisionFilterPanelIntro")}
                    </p>
                  </SheetHeader>
                  <div className="mx-3 mb-4 mt-2 sm:mx-4">
                    <MediaPrecisionFiltersAssistant {...precisionAssistantProps} />
                  </div>
                  <div className="sticky bottom-0 border-t-2 border-border bg-card p-3">
                    <BtnBlock
                      onClick={() => setPrecisionFiltersOpen(false)}
                      variant="primary"
                      size="md"
                      className="w-full"
                    >
                      필터 적용하기
                    </BtnBlock>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <div className="mb-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground sm:text-lg">
                      {t("media.results")}:{" "}
                      <span className="tabular-nums text-accent">
                        {gridDisplayList.length}
                      </span>
                      {catalogMinPadActive ? (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {tMedia("catalogMinPadCountHint", {
                            matched: catalogListForDisplay.length,
                          })}
                        </span>
                      ) : null}
                    </p>
                    {debouncedCatalogSearch.trim() ? (
                      <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/80 px-2.5 py-1 text-xs font-medium text-foreground">
                        <Search className="size-3.5 shrink-0 text-accent" aria-hidden />
                        <span className="min-w-0 truncate">
                          {t("media.activeKeywordLabel")}: {debouncedCatalogSearch}
                        </span>
                      </span>
                    ) : null}
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/30 p-2 sm:gap-2.5"
                    role="toolbar"
                    aria-label={isKo ? "목록 필터 및 보기" : "List filters and view"}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setInstantOnlyFilter((v) => !v);
                        setCatalogPage(1);
                      }}
                      className={cn(
                        "inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-md border px-3 text-xs font-semibold leading-none transition-colors sm:text-sm",
                        instantOnlyFilter
                          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "border-border bg-card text-foreground hover:border-emerald-500/40",
                      )}
                      aria-pressed={instantOnlyFilter}
                    >
                      {tMedia("availabilityLive.filterInstant")}
                    </button>
                    {browseMode === "list" ? (
                      <label className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm text-foreground">
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {t("media.sortLabel")}
                        </span>
                        <select
                          className="h-7 max-w-[10rem] min-w-0 bg-transparent text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
                          value={sortBy}
                          onChange={(e) =>
                            setSortBy(e.target.value as typeof sortBy)
                          }
                        >
                          <option value="default">
                            {t("media.sortDefault")}
                          </option>
                          <option value="newest">
                            {t("media.sortNewest")}
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
                          <option value="ratingDesc">
                            {t("media.sortRatingDesc")}
                          </option>
                        </select>
                      </label>
                    ) : null}
                    <Link
                      href={`/media/map${
                        debouncedCatalogSearch.trim()
                          ? `?q=${encodeURIComponent(debouncedCatalogSearch.trim())}`
                          : ""
                      }`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
                    >
                      <MapIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {t("media.browseViewMap")}
                    </Link>
                    <div className="hidden border-2 border-border bg-card">
                      <button
                        type="button"
                        onClick={() => setBrowseMode("list")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                          browseMode === "list"
                            ? "bg-hero-void text-hero-fg"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <LayoutList className="h-3.5 w-3.5" />
                        {t("media.browseViewList")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrowseMode("map")}
                        className={`inline-flex items-center gap-1.5 border-l-2 border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                          browseMode === "map"
                            ? "bg-hero-void text-hero-fg"
                            : "text-foreground hover:bg-muted"
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
                      <div className="ml-auto flex flex-wrap items-center gap-2">
                        <BtnBlock
                          onClick={() =>
                            addManyToCompare(
                              pagedCatalog.filter(
                                (m) => m.catalogSource !== "network",
                              ),
                            )
                          }
                          disabled={pagedCatalog.length === 0}
                          variant="secondary"
                          size="sm"
                        >
                          {isKo ? "전체선택" : "Select page"}
                        </BtnBlock>
                        <BtnBlock
                          onClick={() => setCompareItems([])}
                          disabled={compareItems.length === 0}
                          variant="secondary"
                          size="sm"
                        >
                          {isKo ? "비교 비우기" : "Clear compare"}
                        </BtnBlock>
                      </div>
                    ) : null}
                  </div>
                </div>

                {precisionFilterRelaxed ? (
                  <div
                    role="status"
                    className="mb-4 flex flex-col gap-3 border-2 border-accent bg-card px-4 py-3 text-sm leading-relaxed text-foreground sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="min-w-0">
                      <span className="mr-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                        {`// RELAXED`}
                      </span>
                      {tMedia("precisionFilterRelaxedBanner")}
                    </p>
                    <BtnBlock
                      onClick={clearPrecisionSelections}
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                    >
                      {tMedia("clearPrecisionFilters")}
                    </BtnBlock>
                  </div>
                ) : null}

                {/* (요청) LENIENT 안내 문구 숨김 처리 */}

                {catalogMinPadActive ? (
                  <div
                    role="status"
                    className="mb-4 border-2 border-border bg-muted px-4 py-3 text-sm leading-relaxed text-foreground"
                  >
                    <span className="mr-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      {`// PADDED`}
                    </span>
                    {tMedia("catalogMinPadBanner", {
                      matched: sortedFiltered.length,
                      shown: gridDisplayList.length,
                    })}
                  </div>
                ) : null}

                {gridDisplayList.length === 0 ? (
                  <div className="flex min-h-[32rem] flex-col items-center justify-center gap-8 border-2 border-border bg-muted px-6 py-20 text-center sm:px-10">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                      {`// 0 RESULTS`}
                    </p>
                    <p className="max-w-2xl text-3xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                      {tMedia("catalogBrowseEmptyTitle")}
                    </p>
                    <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                      {tMedia("catalogBrowseEmptySubtitle")}
                    </p>
                    <BtnBlock onClick={resetFilters} variant="primary" size="lg">
                      {tMedia("resetAllBrowseFiltersProminent")}
                    </BtnBlock>
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
                      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex justify-center p-3 sm:p-4">
                        <div
                          className="pointer-events-auto w-full max-w-md max-h-[40vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-3 duration-200"
                          role="dialog"
                          aria-label={
                            isKo
                              ? mapSelectedMedia.name
                              : mapSelectedMedia.nameEn
                          }
                        >
                          <div className="overflow-hidden border-2 border-border bg-card">
                            <div className="flex items-start gap-3 border-b-2 border-border p-3 sm:p-4">
                              <div className="h-20 w-28 shrink-0 overflow-hidden border-2 border-border sm:h-24 sm:w-32">
                                <MediaCatalogThumbnail
                                  media={mapSelectedMedia}
                                  placeholderLabel={t("media.imagePreparing")}
                                  className="h-full w-full"
                                  bottomGradientClassName={null}
                                  placeholderSize="xs"
                                />
                              </div>
                              <div className="min-w-0 flex-1 pt-0.5">
                                <h3 className="line-clamp-2 text-base font-bold leading-snug tracking-tight text-foreground sm:text-lg">
                                  {isKo
                                    ? mapSelectedMedia.name
                                    : mapSelectedMedia.nameEn}
                                </h3>
                                <p className="mt-1.5 font-mono text-sm font-bold tabular-nums text-foreground">
                                  {formatMediaPriceWonWithSymbol(mapSelectedMedia.price)}
                                  <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
                                    ·{" "}
                                    {tMedia(
                                      mediaPricePeriodTranslationKey(
                                        mapSelectedMedia.pricePeriod,
                                      ),
                                    )}
                                  </span>
                                </p>
                                <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                  <Users
                                    className="h-3 w-3 shrink-0 text-accent"
                                    aria-hidden
                                  />
                                  <span>
                                    {t("media.mapPopupFootTraffic")}:{" "}
                                    <span className="font-bold text-foreground">
                                      {mapSelectedMedia.dailyFootTraffic.toLocaleString()}
                                    </span>
                                  </span>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setMapPopupOpen(false)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-border bg-card text-foreground transition-colors hover:bg-foreground hover:text-background"
                                aria-label={t("media.mapPopupClose")}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2 p-3 sm:p-4 sm:pt-3">
                              <BtnBlock
                                href={mediaItemDetailPath(mapSelectedMedia.id)}
                                variant="secondary"
                                size="sm"
                                className="flex-1 min-w-[8rem]"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                {t("media.mapCardDetail")}
                              </BtnBlock>
                              <BtnBlock
                                onClick={() => toggleCompare(mapSelectedMedia)}
                                variant={
                                  isInCompare(mapSelectedMedia.id)
                                    ? "accent"
                                    : "primary"
                                }
                                size="sm"
                                className="flex-1 min-w-[8rem]"
                              >
                                {isInCompare(mapSelectedMedia.id)
                                  ? (isKo ? "✓ 선택됨" : "✓ Selected")
                                  : (isKo ? "+ 비교 추가" : "+ Compare")}
                              </BtnBlock>
                              <BtnBlock
                                href={`/quote?media=${mapSelectedMedia.id}${
                                  (mapSelectedMedia.priceOptions?.length ?? 0) > 0
                                    ? "&po=0"
                                    : ""
                                }`}
                                variant="accent"
                                size="sm"
                                className="flex-1 min-w-[8rem]"
                              >
                                <Calculator className="h-3.5 w-3.5" />
                                {t("media.mapCardQuote")}
                              </BtnBlock>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {catalogCardLayout === "grid" ? (
                  <div className="grid grid-cols-2 gap-0 lg:grid-cols-3">
                    {pagedCatalog.map((media) => (
                      <MediaCatalogGridCard
                        key={media.id}
                        variant="link"
                        media={media}
                        isKo={isKo}
                        denseMobile
                        imagePreparingLabel={t("media.imagePreparing")}
                        popularIds={popularIds}
                        quickInquiryOverlay
                        availabilityTier={
                          availabilitySummary?.items[media.id]?.tier
                        }
                        topLeftSlot={
                          <label
                            className="absolute left-2 top-2 z-20 flex h-8 w-8 cursor-pointer select-none items-center justify-center border-2 border-border bg-card sm:left-2.5 sm:top-2.5 sm:h-9 sm:w-9"
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
                              className="h-3.5 w-3.5 accent-cta sm:h-4 sm:w-4"
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
                        popularIds={popularIds}
                        leadingSlot={
                          <label
                            className="flex h-9 w-9 cursor-pointer select-none items-center justify-center border-2 border-border bg-card"
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
                              className="h-4 w-4 accent-cta"
                            />
                          </label>
                        }
                      />
                    ))}
                  </div>
                    )}
                    {catalogPageCount > 1 ? (
                      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 border-t-2 border-border pt-6">
                        <BtnBlock
                          disabled={catalogPage <= 1}
                          onClick={() =>
                            setCatalogPage((p) => Math.max(1, p - 1))
                          }
                          variant="secondary"
                          size="sm"
                        >
                          ← {t("media.pagePrev")}
                        </BtnBlock>
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
                        <BtnBlock
                          disabled={catalogPage >= catalogPageCount}
                          onClick={() =>
                            setCatalogPage((p) =>
                              Math.min(catalogPageCount, p + 1),
                            )
                          }
                          variant="secondary"
                          size="sm"
                        >
                          {t("media.pageNext")} →
                        </BtnBlock>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>

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
