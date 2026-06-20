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
import { MediaCatalogListCard } from "@/components/media/media-catalog-list-card";
import { MediaScarcitySection } from "@/components/media-scarcity-section";
import { useMediaAvailabilitySummary } from "@/lib/use-media-availability-summary";
import { INDUSTRY_BUDGET_SESSION_KEY } from "@/lib/industry-landing";
import { BtnBlock } from "@/components/brutalist";
import { Link, useRouter } from "@/i18n/navigation";
import {
  CategoryExploreHero,
} from "@/components/category-explore-hero";
import { cn } from "@/lib/utils";
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  entriesToCompareMediaItems,
  type CompareCartEntry,
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
import { useAppToast } from "@/lib/use-toast";
import { useCartCompareMax } from "@/hooks/use-cart-compare-max";
import { cartCompareLimitToastMessage } from "@/lib/entitlements/limits";
import { resolveMediaIdFromMapPinId } from "@/lib/media-detail-map-markers";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import {
  formatCatalogPriceFieldWon,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { MobileMediaBrowseBar } from "@/components/mobile/mobile-media-browse-bar";
import { MobilePullToRefresh } from "@/components/mobile/mobile-pull-to-refresh";
import { KEYWORD_FILTER_SEARCH_DEBOUNCE_MS } from "@/lib/media-keyword-filter-logic";
import {
  MediaCategoryBrowseChips,
  type BrowseCategoryChip,
} from "@/components/media-category-browse-chips";
import { MediaCategoryFilterPanel } from "@/components/media-category-filter-panel";
import {
  chipToCategorySlugs,
  mediaMatchesCategorySlugs,
  mediaMatchesTargetSlugs,
  BROWSE_CATEGORY_CHIPS,
} from "@/lib/media-categories";
import { mediaMatchesCategorySlug, mediaMatchesTargetSlug } from "@/lib/media-category-landing";
import { MediaBrowseRegionFilter } from "@/components/media/media-browse-region-filter";
import {
  PageSubNav,
  MEDIA_SUB_NAV_ITEMS,
} from "@/components/navigation/page-sub-nav";

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
  const router = useRouter();
  const isKo = locale === "ko";
  const toast = useAppToast();
  const { maxItems: compareMax } = useCartCompareMax();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const catFromUrl = searchParams.get("cat") ?? "";
  const categoryFromUrl = searchParams.get("category") ?? "";
  const targetFromUrl = searchParams.get("target") ?? "";
  const sortFromUrl = searchParams.get("sort") ?? "";
  const regionFromUrl = searchParams.get("region") ?? "";
  const chipFromUrl = (searchParams.get("chip") ?? "all") as BrowseCategoryChip;
  const instantFromUrl = searchParams.get("instant") === "1";

  const [categoryChip, setCategoryChip] = useState<BrowseCategoryChip>("all");
  const [selectedMediaSlugs, setSelectedMediaSlugs] = useState<string[]>([]);
  const [selectedTargetSlugs, setSelectedTargetSlugs] = useState<string[]>([]);
  const [categoryFiltersOpen, setCategoryFiltersOpen] = useState(false);

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
      if (window.matchMedia("(max-width: 767px)").matches) return "compact";
    }
    return "compact";
  });
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(12);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [mapPopupOpen, setMapPopupOpen] = useState(false);
  const [compareEntries, setCompareEntries] = useState<CompareCartEntry[]>([]);
  const urlHydratedRef = useRef(false);
  const popularIds = useMemo(
    () =>
      new Set(
        catalog
          .filter((m) =>
            m.trustBadges?.some(
              (b) => b.id === "popular" || b.id === "hot_week",
            ),
          )
          .map((m) => m.id),
      ),
    [catalog],
  );
  const [sortBy, setSortBy] = useState<
    | "default"
    | "newest"
    | "priceAsc"
    | "priceDesc"
    | "trafficDesc"
    | "ratingDesc"
  >("default");
  const [instantOnlyFilter, setInstantOnlyFilter] = useState(false);
  const [mobileRegionChip, setMobileRegionChip] = useState("");
  const [activeRegionId, setActiveRegionId] = useState("all");
  const [activeSubRegionId, setActiveSubRegionId] = useState("");
  const { summary: availabilitySummary } = useMediaAvailabilitySummary();

  /**
   * 서버 카탈로그를 그대로 사용. 초기 1회만 셔플.
   * CLAUDE.md: 공개 카탈로그는 DB-backed 가 진실. 서버가 빈 배열을
   * 반환하면 빈 상태 UI 가 노출되어야지, 클라이언트가 마음대로 목업으로
   * 덮으면 안 됨 (운영 사고 은폐).
   */
  const effectiveCatalog = useMemo(() => {
    const arr = [...catalog];
    const hasUrlFilters =
      qFromUrl ||
      catFromUrl ||
      categoryFromUrl ||
      targetFromUrl ||
      (chipFromUrl && chipFromUrl !== "all");
    if (hasUrlFilters) return arr;
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

  const [budgetMin, setBudgetMin] = useState(PRECISION_BUDGET_MIN_MAN);
  const [budgetMax, setBudgetMax] = useState(PRECISION_BUDGET_MAX_MAN);

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

  useEffect(() => {
    if (chipFromUrl && chipFromUrl !== "all") {
      setCategoryChip(chipFromUrl);
    }
    const catParts = [catFromUrl, categoryFromUrl]
      .flatMap((s) => s.split(","))
      .map((s) => s.trim())
      .filter(Boolean);
    if (catParts.length > 0) {
      const first = catParts[0]!;
      if ((BROWSE_CATEGORY_CHIPS as readonly string[]).includes(first)) {
        setCategoryChip(first as BrowseCategoryChip);
      } else {
        setSelectedMediaSlugs(catParts);
      }
    }
    if (targetFromUrl) {
      setSelectedTargetSlugs(
        targetFromUrl.split(",").map((s) => s.trim()).filter(Boolean),
      );
    }
    if (instantFromUrl) {
      setInstantOnlyFilter(true);
    }
    if (regionFromUrl) {
      setMobileRegionChip(regionFromUrl);
      if (/강남|서초/.test(regionFromUrl)) {
        setActiveRegionId("seoul");
        setActiveSubRegionId("gangnam");
      } else if (/마포|홍대/.test(regionFromUrl)) {
        setActiveRegionId("seoul");
        setActiveSubRegionId("mapo");
      } else if (/성동|성수/.test(regionFromUrl)) {
        setActiveRegionId("seoul");
        setActiveSubRegionId("seongdong");
      } else if (/중구|도심/.test(regionFromUrl)) {
        setActiveRegionId("seoul");
        setActiveSubRegionId("downtown");
      } else if (regionFromUrl.includes("서울")) {
        setActiveRegionId("seoul");
      } else if (regionFromUrl.includes("경기")) {
        setActiveRegionId("gyeonggi");
      } else if (regionFromUrl.includes("부산")) {
        setActiveRegionId("busan");
      } else if (regionFromUrl.includes("대구")) {
        setActiveRegionId("daegu");
      }
    }
    if (sortFromUrl === "newest") setSortBy("newest");
    else if (sortFromUrl === "price_asc") setSortBy("priceAsc");
    else if (sortFromUrl === "price_desc") setSortBy("priceDesc");
    else if (sortFromUrl === "rating") setSortBy("ratingDesc");
    else if (sortFromUrl === "popular" || sortFromUrl === "recommended")
      setSortBy("default");
    urlHydratedRef.current = true;
  }, [catFromUrl, categoryFromUrl, targetFromUrl, chipFromUrl, instantFromUrl, regionFromUrl, sortFromUrl]);

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

  useEffect(() => {
    setCompareEntries(getCompareCartEntries(compareMax));
    return subscribeCompareCart(() => {
      setCompareEntries(getCompareCartEntries(compareMax));
    });
  }, [compareMax]);

  const compareItems = useMemo(
    () => entriesToCompareMediaItems(compareEntries, effectiveCatalog, compareMax),
    [compareEntries, effectiveCatalog, compareMax],
  );

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

  const categoryChipSlugs = useMemo(
    () => chipToCategorySlugs(categoryChip),
    [categoryChip],
  );

  const categoryFiltered = useMemo(() => {
    let data = searchFiltered;
    if (categoryChipSlugs.length > 0) {
      data = data.filter((m) =>
        categoryChipSlugs.some((slug) => mediaMatchesCategorySlug(m, slug)),
      );
    }
    if (selectedMediaSlugs.length > 0) {
      data = data.filter((m) =>
        selectedMediaSlugs.some((slug) => mediaMatchesCategorySlug(m, slug)),
      );
    }
    if (selectedTargetSlugs.length > 0) {
      data = data.filter((m) =>
        selectedTargetSlugs.some((slug) => mediaMatchesTargetSlug(m, slug)),
      );
    }
    return data;
  }, [
    searchFiltered,
    categoryChipSlugs,
    selectedMediaSlugs,
    selectedTargetSlugs,
  ]);

  const advancedFiltered = useMemo(
    () =>
      categoryFiltered.filter((m) =>
        passesMediaAdvancedFilters(m, filterState, bounds),
      ),
    [categoryFiltered, filterState, bounds],
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

  const filtersActive = useMemo(
    () =>
      categoryChip !== "all" ||
      selectedMediaSlugs.length > 0 ||
      selectedTargetSlugs.length > 0 ||
      !!debouncedCatalogSearch.trim() ||
      !!mobileRegionChip.trim() ||
      instantOnlyFilter ||
      budgetMin > PRECISION_BUDGET_MIN_MAN ||
      budgetMax < PRECISION_BUDGET_MAX_MAN ||
      precisionSelectionsActive,
    [
      categoryChip,
      selectedMediaSlugs,
      selectedTargetSlugs,
      debouncedCatalogSearch,
      mobileRegionChip,
      instantOnlyFilter,
      budgetMin,
      budgetMax,
      precisionSelectionsActive,
    ],
  );

  /** 정밀 → 고급 → 카테고리 순. 필터 활성 시 0건 폴백 금지 */
  const filtered = useMemo(() => {
    if (strictPrecisionFiltered.length > 0) return strictPrecisionFiltered;
    if (precisionSelectionsActive && advancedFiltered.length > 0) {
      return advancedFiltered;
    }
    if (advancedFiltered.length > 0) return advancedFiltered;
    if (categoryFiltered.length > 0) return categoryFiltered;
    if (filtersActive) return [];
    return effectiveCatalog;
  }, [
    strictPrecisionFiltered,
    precisionSelectionsActive,
    advancedFiltered,
    categoryFiltered,
    filtersActive,
    effectiveCatalog,
  ]);

  const toggleMediaCategorySlug = useCallback((slug: string) => {
    setSelectedMediaSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
    setCatalogPage(1);
  }, []);

  const toggleTargetCategorySlug = useCallback((slug: string) => {
    setSelectedTargetSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
    setCatalogPage(1);
  }, []);

  const clearCategoryFilters = useCallback(() => {
    setCategoryChip("all");
    setSelectedMediaSlugs([]);
    setSelectedTargetSlugs([]);
    setCatalogPage(1);
  }, []);

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
        return arr.sort((a, b) => {
          const ap = a.popularityScore ?? 0;
          const bp = b.popularityScore ?? 0;
          if (bp !== ap) return bp - ap;
          const at = a.createdAt ? Date.parse(a.createdAt) : 0;
          const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
          return bt - at;
        });
    }
  }, [filtered, sortBy]);

  const catalogListForDisplay = useMemo(() => {
    let base = sortedFiltered;
    if (instantOnlyFilter && availabilitySummary?.items) {
      base = sortedFiltered.filter(
        (m) => availabilitySummary.items[m.id]?.tier === "instant",
      );
    }
    if (mobileRegionChip.trim()) {
      const chip = mobileRegionChip.toLowerCase();
      base = base.filter((m) =>
        [m.region, m.district, m.city, m.name, m.nameEn].some((v) =>
          v?.toLowerCase().includes(chip),
        ),
      );
    }
    return base;
  }, [sortedFiltered, instantOnlyFilter, availabilitySummary, mobileRegionChip]);

  /** 필터 결과가 적을 때 카탈로그에서 부족분만큼 덧붙여 그리드·지도 최소 노출 유지 */
  const { gridDisplayList, catalogMinPadActive } = useMemo(() => {
    if (
      filtersActive ||
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
  }, [catalogListForDisplay, effectiveCatalog, filtersActive]);

  useEffect(() => {
    // 팝업이 열려있을 때만 선택된 매체가 리스트에 있는지 검증
    // (팝업이 닫혀있으면 선택 상태 유지)
    if (!mapPopupOpen || mapSelectedId == null) return;
    if (
      !gridDisplayList.some(
        (m) => m.id === resolveMediaIdFromMapPinId(mapSelectedId),
      )
    )
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
    mobileRegionChip,
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

  const resetFilters = useCallback(() => {
    setSearchTarget(null);
    setCatalogSearchQuery("");
    setDebouncedCatalogSearch("");
    setMapSelectedId(null);
    setSortBy("default");
    setBudgetMin(PRECISION_BUDGET_MIN_MAN);
    setBudgetMax(PRECISION_BUDGET_MAX_MAN);
    setInstantOnlyFilter(false);
    setMobileRegionChip("");
    setActiveRegionId("all");
    setActiveSubRegionId("");
    setCategoryChip("all");
    setSelectedMediaSlugs([]);
    setSelectedTargetSlugs([]);
    resetAdvancedFilters();
    setCatalogPage(1);
    router.replace("/media", { scroll: false });
  }, [resetAdvancedFilters, router]);

  useEffect(() => {
    if (!urlHydratedRef.current) return;

    const params = new URLSearchParams();
    const q = catalogSearchQuery.trim();
    if (q) params.set("q", q);

    if (categoryChip !== "all") {
      params.set("category", categoryChip);
    } else if (selectedMediaSlugs.length > 0) {
      params.set("category", selectedMediaSlugs.join(","));
    }

    if (selectedTargetSlugs.length > 0) {
      params.set("target", selectedTargetSlugs.join(","));
    }

    if (mobileRegionChip.trim()) {
      params.set("region", mobileRegionChip.trim());
    }

    if (instantOnlyFilter) params.set("instant", "1");

    if (sortBy === "newest") params.set("sort", "newest");
    else if (sortBy === "priceAsc") params.set("sort", "price_asc");
    else if (sortBy === "priceDesc") params.set("sort", "price_desc");
    else if (sortBy === "ratingDesc") params.set("sort", "rating");

    if (budgetMin > PRECISION_BUDGET_MIN_MAN) {
      params.set("minPrice", String(budgetMin * 10000));
    }
    if (budgetMax < PRECISION_BUDGET_MAX_MAN) {
      params.set("maxPrice", String(budgetMax * 10000));
    }

    const qs = params.toString();
    const currentQs = searchParams.toString();
    if (qs === currentQs) return;
    router.replace(qs ? `/media?${qs}` : "/media", { scroll: false });
  }, [
    catalogSearchQuery,
    categoryChip,
    selectedMediaSlugs,
    selectedTargetSlugs,
    mobileRegionChip,
    instantOnlyFilter,
    sortBy,
    budgetMin,
    budgetMax,
    router,
    searchParams,
  ]);

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
    const prev = getCompareCartEntries(compareMax);
    const exists = prev.some((e) => e.id === media.id);
    if (exists) {
      setCompareCartEntries(prev.filter((e) => e.id !== media.id), compareMax);
      return;
    }
    if (prev.length >= compareMax) {
      toast.error(cartCompareLimitToastMessage(isKo));
      return;
    }
    setCompareCartEntries(
      [
        ...prev,
        {
          id: media.id,
          name: media.name,
          nameEn: media.nameEn || media.name,
        },
      ],
      compareMax,
    );
  }, [compareMax, isKo, toast]);

  const addManyToCompare = useCallback((items: MediaItem[]) => {
    const next = [...getCompareCartEntries(compareMax)];
    for (const m of items) {
      if (next.length >= compareMax) break;
      if (!next.some((e) => e.id === m.id)) {
        next.push({
          id: m.id,
          name: m.name,
          nameEn: m.nameEn || m.name,
        });
      }
    }
    setCompareCartEntries(next, compareMax);
  }, [compareMax]);

  const isInCompare = (id: string) => compareEntries.some((e) => e.id === id);

  const mapSelectedMedia =
    mapSelectedId != null
      ? gridDisplayList.find(
          (m) => m.id === resolveMediaIdFromMapPinId(mapSelectedId),
        ) ?? null
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

  const handleMobileRefresh = useCallback(async () => {
    router.refresh();
    await new Promise((r) => setTimeout(r, 400));
  }, [router]);

  const sortOptions = useMemo(
    () => [
      { value: "default", label: t("media.sortDefault") },
      { value: "newest", label: t("media.sortNewest") },
      { value: "priceAsc", label: t("media.sortPriceAsc") },
      { value: "priceDesc", label: t("media.sortPriceDesc") },
      { value: "trafficDesc", label: t("media.sortTrafficDesc") },
      { value: "ratingDesc", label: t("media.sortRatingDesc") },
    ],
    [t],
  );

  return (
    <MobilePullToRefresh onRefresh={handleMobileRefresh}>
    <>
      {hideHero ? null : (
        <div className="hidden md:block">
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
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 dark:text-white sm:left-4"
                aria-hidden
              />
              <input
                type="search"
                value={catalogSearchQuery}
                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                placeholder={
                  isKo ? "매체명, 위치, 키워드로 검색" : "Search media, location, keyword"
                }
                className="h-11 w-full rounded-2xl border dark:border-white/18 border-gray-300 dark:bg-white/8 bg-gray-100 pl-10 pr-3 text-sm dark:text-white text-gray-900 shadow-[0_18px_56px_rgba(0,0,0,0.4)] placeholder:dark:text-white backdrop-blur-md focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-[#a855f7]/40 sm:h-12 sm:pl-11 sm:pr-4"
                aria-label={isKo ? "매체 검색" : "Search media"}
              />
            </div>
          </div>
        </CategoryExploreHero>
        <PageSubNav
          items={MEDIA_SUB_NAV_ITEMS}
          locale={locale}
          className="mx-auto max-w-6xl px-4 pb-4 sm:px-6"
          data-screenshot="media-sub-nav"
        />
        </div>
      )}

      <section className="tkad-media-browse-main border-t border-border/60 bg-card py-6 sm:py-14 md:py-10">
        <MobileMediaBrowseBar
          isKo={isKo}
          locale={locale}
          activeChip={mobileRegionChip}
          onChipChange={(chip) => {
            setMobileRegionChip(chip);
            setCatalogPage(1);
          }}
          categoryChip={categoryChip}
          onCategoryChange={(chip) => {
            setCategoryChip(chip);
            setCatalogPage(1);
          }}
          sortBy={sortBy}
          onSortChange={(v) => setSortBy(v as typeof sortBy)}
          onFilterOpen={() => setCategoryFiltersOpen(true)}
          cardLayout={catalogCardLayout}
          onCardLayoutChange={setCatalogCardLayout}
          resultCount={gridDisplayList.length}
        />
        <div className="ui-container">
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

              <div className="hidden md:block">
                <MediaBrowseRegionFilter
                  locale={locale}
                  activeRegion={activeRegionId}
                  activeSubRegion={activeSubRegionId}
                  onRegionChange={(query, regionId) => {
                    setActiveRegionId(regionId);
                    setActiveSubRegionId("");
                    setMobileRegionChip(query);
                    setCatalogPage(1);
                  }}
                  onSubRegionChange={(query, subId) => {
                    setActiveSubRegionId(subId);
                    setMobileRegionChip(query);
                    setCatalogPage(1);
                  }}
                  className="mb-4"
                />
                <div className="mb-4 rounded-2xl border border-border bg-card p-4">
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    {isKo ? "가격 범위" : "Price range"}
                  </p>
                  <p className="mb-3 text-xs tabular-nums text-violet-600 dark:text-violet-400">
                    ₩{(budgetMin * 10000).toLocaleString()} ~ ₩
                    {(budgetMax * 10000).toLocaleString()}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                      {isKo ? "최소 (100만원)" : "Min (₩1M)"}
                      <input
                        type="range"
                        min={0}
                        max={5000}
                        step={100}
                        value={budgetMin}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setBudgetMin(Math.min(v, budgetMax));
                          setCatalogPage(1);
                        }}
                        className="w-full accent-violet-500"
                      />
                    </label>
                    <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                      {isKo ? "최대 (100만원)" : "Max (₩1M)"}
                      <input
                        type="range"
                        min={0}
                        max={5000}
                        step={100}
                        value={budgetMax}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setBudgetMax(Math.max(v, budgetMin));
                          setCatalogPage(1);
                        }}
                        className="w-full accent-violet-500"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {filtersActive ? (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300"
                  >
                    {isKo ? "필터 초기화 ×" : "Reset filters ×"}
                  </button>
                </div>
              ) : null}

              <MediaCategoryBrowseChips
                locale={locale}
                active={categoryChip}
                onChange={(chip) => {
                  setCategoryChip(chip);
                  setCatalogPage(1);
                }}
                className="hidden px-0.5 md:flex"
              />

              <div className="flex flex-col gap-6 lg:flex-row">
                {lgUp ? (
                  <div className="hidden w-64 shrink-0 lg:block">
                    <MediaCategoryFilterPanel
                      locale={locale}
                      selectedMediaSlugs={selectedMediaSlugs}
                      selectedTargetSlugs={selectedTargetSlugs}
                      onToggleMedia={toggleMediaCategorySlug}
                      onToggleTarget={toggleTargetCategorySlug}
                      onClear={clearCategoryFilters}
                      className="sticky top-24 rounded-2xl border border-border bg-card p-4"
                    />
                  </div>
                ) : null}

                <div className="min-w-0 flex-1">
              {/* #MEDIA-1: 정밀필터 진입점 숨김 (코드 보존) */}
              <div className="hidden flex-col gap-3">
                <button
                  type="button"
                  onClick={togglePrecisionFilters}
                  className="inline-flex w-full items-center justify-center gap-2 border-2 border-border bg-card px-4 py-3 font-display text-xs font-medium uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background sm:w-auto sm:self-start"
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
                    <p className="mt-2 text-[12px] leading-relaxed tracking-tight text-muted-foreground">
                      {t("media.advancedFiltersCollapsedSubhint")}
                    </p>
                  </div>
                ) : null}
              </div>

              {lgUp && precisionFiltersOpen ? (
                <div className="space-y-4">
                  <div className="border-2 border-border bg-card px-5 py-4">
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      [ {t("media.advancedFiltersSectionLabel")} ]
                    </p>
                    <p className="mt-1 text-[11px] tracking-tight text-muted-foreground">
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
                    <p className="text-[11px] tracking-tight text-muted-foreground">
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

              <Sheet
                open={categoryFiltersOpen && !lgUp}
                onOpenChange={setCategoryFiltersOpen}
              >
                <SheetContent
                  side="bottom"
                  showCloseButton
                  className="max-h-[85vh] overflow-y-auto border-t-2 border-border bg-card p-4"
                >
                  <SheetHeader className="pb-3 text-left">
                    <SheetTitle>
                      {isKo ? "카테고리·캠페인 목적" : "Categories"}
                    </SheetTitle>
                  </SheetHeader>
                  <MediaCategoryFilterPanel
                    locale={locale}
                    selectedMediaSlugs={selectedMediaSlugs}
                    selectedTargetSlugs={selectedTargetSlugs}
                    onToggleMedia={toggleMediaCategorySlug}
                    onToggleTarget={toggleTargetCategorySlug}
                    onClear={() => {
                      clearCategoryFilters();
                      setCategoryFiltersOpen(false);
                    }}
                  />
                  <div className="sticky bottom-0 mt-4 border-t border-border bg-card pt-3">
                    <BtnBlock
                      type="button"
                      variant="primary"
                      size="md"
                      className="w-full"
                      onClick={() => setCategoryFiltersOpen(false)}
                    >
                      {isKo ? "적용" : "Apply"}
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
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-display text-xs font-medium uppercase tracking-[0.18em] transition-colors ${ browseMode === "list" ? "bg-hero-void text-hero-fg" : "text-foreground hover:bg-muted" }`}
                      >
                        <LayoutList className="h-3.5 w-3.5" />
                        {t("media.browseViewList")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrowseMode("map")}
                        className={`inline-flex items-center gap-1.5 border-l-2 border-border px-3 py-1.5 font-display text-xs font-medium uppercase tracking-[0.18em] transition-colors ${ browseMode === "map" ? "bg-hero-void text-hero-fg" : "text-foreground hover:bg-muted" }`}
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
                          onClick={() => setCompareCartEntries([], compareMax)}
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
                      <span className="mr-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
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
                    <span className="mr-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      {`// PADDED`}
                    </span>
                    {tMedia("catalogMinPadBanner", {
                      matched: sortedFiltered.length,
                      shown: gridDisplayList.length,
                    })}
                  </div>
                ) : null}

                {gridDisplayList.length === 0 ? (
                  <div className="flex min-h-[24rem] flex-col items-center justify-center gap-6 rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center dark:border-white/10 dark:bg-white/5 sm:px-10">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                      {isKo ? "조건에 맞는 매체가 없어요" : "No media matches your filters"}
                    </p>
                    <p className="max-w-md text-sm text-gray-500 dark:text-white/60">
                      {isKo ? "필터를 조정해보세요" : "Try adjusting your filters"}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <BtnBlock onClick={resetFilters} variant="secondary" size="md">
                        {isKo ? "필터 초기화 ×" : "Reset filters ×"}
                      </BtnBlock>
                      <BtnBlock href="/recommend" variant="primary" size="md">
                        {isKo ? "AI 매체 추천 써보기 →" : "Try AI recommend →"}
                      </BtnBlock>
                    </div>
                  </div>
                ) : browseMode === "map" ? (
                  <div className="relative">
                    <MediaBrowseMap
                      items={gridDisplayList}
                      locale={locale}
                      selectedId={mapSelectedId}
                      onSelectId={handleMapSelectId}
                      fixedMapHeightPx={420}
                      showFooterCaption={false}
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
                                <p className="mt-1.5 font-display text-sm font-bold tabular-nums text-foreground">
                                  {formatCatalogPriceFieldWon(mapSelectedMedia.price)}
                                  <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
                                    ·{" "}
                                    {tMedia(
                                      mediaPricePeriodTranslationKey(
                                        mapSelectedMedia.pricePeriod,
                                      ),
                                    )}
                                  </span>
                                </p>
                                <MediaPriceExclNote isKo={isKo} className="mt-0.5" />
                                <p className="mt-1.5 flex items-center gap-1.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
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
                                href={mediaItemDetailPath(mapSelectedMedia)}
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
                  <div className="grid grid-cols-1 gap-3 px-4 md:grid-cols-2 md:gap-0 md:px-0 lg:grid-cols-3">
                    {pagedCatalog.map((media) => (
                      <div
                        key={media.id}
                        className="transition-transform duration-150 active:scale-[0.98] md:active:scale-100"
                      >
                      <MediaCatalogGridCard
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
                                  compareItems.length >= compareMax)
                              }
                              aria-label={t("media.compareToggleAria")}
                              className="h-3.5 w-3.5 accent-cta sm:h-4 sm:w-4"
                            />
                          </label>
                        }
                      />
                      </div>
                    ))}
                  </div>
                    ) : (
                  <div className="flex flex-col gap-2 px-4 md:gap-0 md:px-0">
                    {pagedCatalog.map((media, index) => (
                      <div key={media.id}>
                        <div className="md:hidden">
                          {catalogCardLayout === "compact" ? (
                            <MediaCatalogListCard
                              media={media}
                              isKo={isKo}
                              imagePreparingLabel={t("media.imagePreparing")}
                              rank={
                                sortBy === "default" || sortBy === "ratingDesc"
                                  ? (catalogPage - 1) * catalogPageSize + index + 1
                                  : undefined
                              }
                            />
                          ) : (
                            <MediaCatalogGridCard
                              variant="link"
                              media={media}
                              isKo={isKo}
                              denseMobile
                              imagePreparingLabel={t("media.imagePreparing")}
                              popularIds={popularIds}
                              availabilityTier={
                                availabilitySummary?.items[media.id]?.tier
                              }
                            />
                          )}
                        </div>
                        <div className="hidden md:block">
                          <MediaCatalogCompactLinkRow
                            media={media}
                            isKo={isKo}
                            href={mediaItemDetailPath(media)}
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
                                      compareItems.length >= compareMax)
                                  }
                                  aria-label={t("media.compareToggleAria")}
                                  className="h-4 w-4 accent-cta"
                                />
                              </label>
                            }
                          />
                        </div>
                      </div>
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
              </div>
            </div>

          <RecentlyViewedMedia locale={locale} />
        </div>
      </section>

      <CompareBar
        items={compareItems}
        locale={locale}
        onClear={() => setCompareCartEntries([], compareMax)}
      />
    </>
    </MobilePullToRefresh>
  );
}
