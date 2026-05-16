"use client";

// 배포 테스트: v1.0 - Vercel 자동 배포 확인 중
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
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
  ArrowRight,
} from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import { FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS } from "@/components/floating-selection-bar";
import { BtnBlock } from "@/components/brutalist";
import { Link } from "@/i18n/navigation";
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

  const [mainTab, setMainTab] = useState<"search" | "ai">("search");
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
    "default" | "newest" | "priceAsc" | "priceDesc" | "trafficDesc"
  >("default");

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
    // 팝업이 열려있을 때만 선택된 매체가 리스트에 있는지 검증
    // (팝업이 닫혀있으면 선택 상태 유지)
    if (!mapPopupOpen || mapSelectedId == null) return;
    if (!gridDisplayList.some((m) => m.id === mapSelectedId))
      setMapSelectedId(null);
  }, [gridDisplayList, mapSelectedId, mapPopupOpen]);

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
        <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] text-white">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
          <div aria-hidden className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.14),rgba(0,0,0,0.58),rgba(0,0,0,0.92))]"
          />

          <div className="tkad-media-hero relative mx-auto max-w-7xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pb-28 sm:pt-28 lg:px-8 lg:pb-36 lg:pt-32">
            <p className="tkad-media-hero__eyebrow font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
              {`// ${t("media.heroEyebrow")}`}
            </p>
            <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
              <h1 className="text-balance text-[clamp(40px,5.2vw,72px)] font-[950] leading-[0.92] tracking-[-0.065em] text-white [text-shadow:0_30px_160px_rgba(0,0,0,0.9)]">
                {t("media.title")}
              </h1>
              <span className="tkad-neon-border rounded-2xl bg-white/5 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                <span className="tkad-home-accent-text">BETA</span>
              </span>
            </div>
            <p className="tkad-media-hero__subtitle mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/82 sm:text-lg">
              {t("media.subtitle")}
            </p>

            <div className="tkad-media-hero-search relative mx-auto mt-10 max-w-2xl">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/45 sm:left-5 sm:size-[1.35rem]"
                aria-hidden
              />
              <input
                type="search"
                value={catalogSearchQuery}
                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                placeholder={
                  isKo ? "매체명, 위치, 키워드로 검색" : "Search media, location, keyword"
                }
                className="h-14 w-full rounded-[20px] border border-white/18 bg-white/8 pl-12 pr-4 text-base text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] placeholder:text-white/45 backdrop-blur-md focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40 sm:h-16 sm:pl-14 sm:pr-5 sm:text-[1.05rem]"
                aria-label={isKo ? "매체 검색" : "Search media"}
              />
            </div>

            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
              <Link
                href="/contact"
                className="tkad-neon-cta-clean inline-flex h-16 items-center justify-center gap-2 rounded-[22px] px-10 text-base font-black text-white transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
              >
                {isKo ? "맞춤형 OOH 캠페인 제안 받기" : "Get Custom OOH Campaign Proposal"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/media/packages"
                className="inline-flex h-16 items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/6 px-8 text-base font-black text-white shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur transition-all hover:-translate-y-1 hover:border-white/22 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:px-10 sm:text-lg"
              >
                {t("packages.browseEntry")}
                <ArrowRight className="h-4 w-4 text-white/80" aria-hidden />
              </Link>
              <Link
                href="/planner"
                className="inline-flex h-16 items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/6 px-8 text-base font-black text-white shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur transition-all hover:-translate-y-1 hover:border-white/22 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:px-10 sm:text-lg"
              >
                {isKo ? "AI 캠페인 설계" : "AI campaign planner"}
                <ArrowRight className="h-4 w-4 text-white/80" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="tkad-media-browse-main border-t border-border/60 bg-card py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* removed: "검색 결과 · 보기 옵션" */}
          <div className="mb-10 flex justify-center">
            <div
              className="tkad-media-main-tabs inline-flex rounded-2xl border border-border/80 bg-muted/60 p-1 shadow-sm backdrop-blur-md"
              role="tablist"
              aria-label={isKo ? "매체 탐색 방식" : "Browse mode"}
            >
              <button
                type="button"
                role="tab"
                aria-selected={mainTab === "search"}
                onClick={() => setMainTab("search")}
                className={cn(
                  "touch-manipulation rounded-[14px] px-5 py-3 text-sm font-semibold transition-colors sm:px-10 sm:py-3.5",
                  mainTab === "search"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-background/70",
                )}
              >
                {t("media.ai.tabSearch")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mainTab === "ai"}
                onClick={() => setMainTab("ai")}
                className={cn(
                  "touch-manipulation rounded-[14px] px-5 py-3 text-sm font-semibold transition-colors sm:px-10 sm:py-3.5",
                  mainTab === "ai"
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-foreground hover:bg-background/70",
                )}
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
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-foreground sm:text-lg">
                      {t("media.results")}:{" "}
                      <span className="tabular-nums text-accent">
                        {gridDisplayList.length}
                      </span>
                      {catalogMinPadActive ? (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {tMedia("catalogMinPadCountHint", {
                            matched: sortedFiltered.length,
                          })}
                        </span>
                      ) : null}
                    </span>
                    {debouncedCatalogSearch.trim() ? (
                      <span className="inline-flex max-w-full items-center gap-1.5 border-2 border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground sm:text-sm">
                        <Search className="size-3.5 shrink-0 text-accent" aria-hidden />
                        <span className="min-w-0 truncate">
                          {t("media.activeKeywordLabel")}: {debouncedCatalogSearch}
                        </span>
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {browseMode === "list" ? (
                      <label className="inline-flex h-10 items-center gap-2 border-2 border-border bg-card px-3 text-sm text-foreground">
                        <span className="shrink-0 text-muted-foreground">
                          {t("media.sortLabel")}
                        </span>
                        <select
                          className="h-10 max-w-[11rem] min-w-0 border-l border-border bg-transparent pl-2 pr-1 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
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
                        </select>
                      </label>
                    ) : null}
                    {/* #MEDIA-1: 목록/지도 뷰 토글 진입점 숨김 (코드 보존) */}
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
                      <>
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
                          전체선택
                        </BtnBlock>
                        <BtnBlock
                          onClick={() => setCompareItems([])}
                          disabled={compareItems.length === 0}
                          variant="secondary"
                          size="sm"
                        >
                          전체삭제
                        </BtnBlock>
                      </>
                    ) : null}
                    <div className="flex min-w-0 max-w-full items-start gap-2 border-2 border-border bg-card px-3 py-2 sm:max-w-[24rem]">
                      <ShieldCheck
                        className="mt-0.5 h-4 w-4 shrink-0 text-hermes"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground sm:text-sm">
                          {tMedia("browseCatalogVerifiedBadge")}
                        </p>
                        <p className="mt-1 text-[10px] leading-snug text-muted-foreground sm:text-[11px]">
                          {tMedia("browseCatalogVerifiedListHint")}
                        </p>
                      </div>
                    </div>
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
