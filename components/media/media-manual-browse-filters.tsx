"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  List,
  LayoutGrid,
  LayoutList,
  AlignJustify,
  Map as MapIcon,
  RectangleVertical,
  ChevronDown,
  Monitor,
  Train,
  MapPin,
  ShoppingBag,
  Music,
  Coffee,
  Building2,
  GraduationCap,
  Landmark,
  Globe,
  Network,
  MoreHorizontal,
  SlidersHorizontal,
  Filter,
  type LucideIcon,
} from "lucide-react";
import { MediaFilterChipLabel } from "@/components/media/media-filter-chip-label";
import {
  MEDIA_CHIP_ACTIVE,
  MEDIA_CHIP_INACTIVE,
  MEDIA_SEARCH_SORT_OPTIONS,
  MEDIA_TARGET_CHIPS,
} from "@/lib/media-discovery-filter-chips";
import { MEDIA_CATEGORIES } from "@/lib/media-browse-categories";
import { MEDIA_BROWSE_REGIONS } from "@/lib/media-browse-regions";
import { NETWORK_BROWSE_TYPE_CHIPS } from "@/lib/media-network-types";
import { MediaMapActiveFiltersBar } from "@/components/media-map/media-map-active-filters-bar";
import {
  MediaFilterVaulSheet,
  MediaSortVaulSheet,
} from "@/components/discovery/media-vaul-sheets";
import {
  MEDIA_MOBILE_BOTTOM_BAR_SLOT_ID,
  MediaMobileBottomBar,
  type MediaMobileViewSegment,
} from "@/components/discovery/media-mobile-bottom-bar";
import { DiscoveryPageHeader } from "@/components/discovery/page-header";
import {
  DiscoveryFilterSheetHeader,
  DiscoveryResultSummary,
  formatMapViewCountLabel,
} from "@/components/discovery/filter-bar-parts";
import {
  buildMapBrowseActiveFilterChips,
  type MediaMapActiveFilterKey,
} from "@/lib/media-map/active-filter-chips";
import { CompositionSearchInput } from "@/components/ui/composition-input";
import { PlanCartSheet } from "@/components/plan/plan-cart-sheet";
import { HotspotRegionChips } from "@/components/media/hotspot-region-chips";
import { cn } from "@/lib/utils";

const MAP_TYPE_FILTERS_EXPANDED_KEY = "tkad-media-map-type-filters-expanded";

/** 필터·정렬 등 상단 컨트롤 — 뷰모드 토글과 동일 tkad-type-meta */
const TOOLBAR_CTRL_BTN =
  "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white tkad-type-meta font-medium text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80";
const TOOLBAR_CTRL_PAD = "px-3 py-1.5";

export type MediaManualBrowseViewMode = "feed" | "card" | "compact" | "reels" | "map";

const MAIN_ICONS: Record<string, LucideIcon> = {
  Monitor,
  Train,
  MapPin,
  ShoppingBag,
  Music,
  Coffee,
  Building2,
  GraduationCap,
  Landmark,
  Globe,
  Network,
  MoreHorizontal,
};

const MAIN_COLOR_ACTIVE: Record<string, string> = {
  violet: "bg-violet-500 text-white",
  blue: "bg-blue-500 text-white",
  cyan: "bg-cyan-500 text-white",
  pink: "bg-pink-500 text-white",
  rose: "bg-rose-500 text-white",
  amber: "bg-amber-500 text-white",
  emerald: "bg-emerald-500 text-white",
  orange: "bg-orange-500 text-white",
  teal: "bg-teal-500 text-white",
  indigo: "bg-indigo-500 text-white",
  purple: "bg-purple-500 text-white",
  gray: "bg-gray-600 text-white",
};

const FEATURE_CHIPS = [
  { value: "instant_booking", labelKo: "즉시 예약", labelEn: "Instant book" },
  { value: "network", labelKo: "네트워크", labelEn: "Network" },
  { value: "24h", labelKo: "24시간", labelEn: "24h" },
] as const;

const VIEW_MODES: {
  id: MediaManualBrowseViewMode;
  labelKo: string;
  labelEn: string;
  icon: typeof List;
}[] = [
  { id: "feed", labelKo: "피드", labelEn: "Feed", icon: List },
  { id: "card", labelKo: "카드", labelEn: "Card", icon: LayoutGrid },
  { id: "reels", labelKo: "몰입 보기", labelEn: "Immersive", icon: RectangleVertical },
  { id: "compact", labelKo: "컴팩트", labelEn: "Compact", icon: AlignJustify },
  { id: "map", labelKo: "지도", labelEn: "Map", icon: MapIcon },
];

/** `/media` 목록 — 피드·카드·컴팩트만 (지도는 별도 네비 버튼) */
const LIST_VIEW_MODES = VIEW_MODES.filter((m) => m.id !== "map");

const MAP_PAGE_VIEW_MODES: {
  id: MediaManualBrowseViewMode;
  labelKo: string;
  labelEn: string;
  icon: typeof List;
}[] = [
  { id: "feed", labelKo: "목록", labelEn: "List", icon: LayoutList },
  { id: "map", labelKo: "지도", labelEn: "Map", icon: MapIcon },
];

export type MediaManualBrowseFiltersProps = {
  isKo?: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  mainCategory: string;
  onMainCategoryChange: (v: string) => void;
  subCategory: string;
  onSubCategoryChange: (v: string) => void;
  target: string;
  onTargetChange: (v: string) => void;
  regionMain: string;
  onRegionMainChange: (v: string) => void;
  regionSub: string;
  onRegionSubChange: (v: string) => void;
  priceMin: string;
  onPriceMinChange: (v: string) => void;
  priceMax: string;
  onPriceMaxChange: (v: string) => void;
  features: string;
  onFeaturesChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  viewMode: MediaManualBrowseViewMode;
  onViewModeChange: (mode: MediaManualBrowseViewMode) => void;
  resultCount: number;
  totalCount?: number;
  loading?: boolean;
  selectedCount?: number;
  selectionVariant?: "default" | "plan";
  onSelectedSummaryClick?: () => void;
  compareCount?: number;
  onCompareSummaryClick?: () => void;
  cartCount?: number;
  showSectionHeader?: boolean;
  sectionEyebrow?: string;
  sectionTitle?: string;
  sectionDesc?: string;
  toolbarEnd?: ReactNode;
  className?: string;
  /** false면 보기 모드(피드/카드/지도) 토글 숨김 — `/media/map` 등 */
  showViewModes?: boolean;
  /** `/media/map` — 유형·고급 필터 접기 + 활성 칩 스트립 */
  mapCompactFilters?: boolean;
  /** `/media/map` — [목록]/[지도] 2-way 토글 */
  mapPageViewModes?: boolean;
  /** `/media/map` 모바일 — 상단 툴바 축소(검색+필터/정렬 아이콘), 뷰모드는 시트 헤더로 이동 */
  mapMobileImmersive?: boolean;
  /** `/media` 앱 셸 — 검색+필터+정렬+뷰모드를 단일 반응형 바로 통합(데스크톱/모바일 이중 마크업 제거) */
  unifiedToolbar?: boolean;
  /** PR B — 모바일 하단 바 + vaul 필터/정렬 시트 (`/media/map` 앱 셸) */
  mobileBottomBar?: boolean;
  /** `/media` 목록 — 모바일 상단 sticky [필터·정렬·뷰모드] (하단 바 대신) */
  mobileStickyToolbar?: boolean;
  /** `/media` 목록 — 피드/카드/컴팩트 + 지도 별도 버튼 */
  listPageLayout?: boolean;
  onNavigateToMap?: () => void;
  /** 모바일 하단 바 목록/지도 세그먼트 (페이지에서 제어) */
  mobileViewSegment?: MediaMobileViewSegment;
  onMobileViewSegmentChange?: (segment: MediaMobileViewSegment) => void;
  /** `features=network` 일 때 네트워크 유형 칩(전체/디지털/고정형/이동형) */
  variant?: "media" | "network";
  networkType?: string;
  onNetworkTypeChange?: (v: string) => void;
  /** 상단 인기 지역 칩 — 패널 내 전체 지역 목록은 접힘 */
  showHotspotRegions?: boolean;
  /** 지도: flyTo 전용(자동 bounds 검색 생략). 미지정 시 목록과 동일하게 region 필터만 적용 */
  onHotspotRegionSelect?: (regionMain: string, regionSub: string) => void;
};

export function MediaManualBrowseFilters({
  isKo = true,
  query,
  onQueryChange,
  mainCategory,
  onMainCategoryChange,
  subCategory,
  onSubCategoryChange,
  target,
  onTargetChange,
  regionMain,
  onRegionMainChange,
  regionSub,
  onRegionSubChange,
  priceMin,
  onPriceMinChange,
  priceMax,
  onPriceMaxChange,
  features,
  onFeaturesChange,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  resultCount,
  totalCount,
  loading = false,
  selectedCount = 0,
  selectionVariant = "default",
  onSelectedSummaryClick,
  compareCount = 0,
  onCompareSummaryClick,
  cartCount = 0,
  showSectionHeader = false,
  sectionEyebrow = "Manual Browse",
  sectionTitle,
  sectionDesc,
  toolbarEnd,
  className,
  showViewModes = true,
  mapCompactFilters = false,
  mapPageViewModes = false,
  mapMobileImmersive = false,
  unifiedToolbar = false,
  mobileBottomBar = false,
  mobileStickyToolbar = false,
  listPageLayout = false,
  onNavigateToMap,
  mobileViewSegment = "list",
  onMobileViewSegmentChange,
  variant = "media",
  networkType = "",
  onNetworkTypeChange,
  showHotspotRegions = false,
  onHotspotRegionSelect,
}: MediaManualBrowseFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [regionPanelOpen, setRegionPanelOpen] = useState(false);
  /** 모바일 필터 바텀시트 (vaul) */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [bottomBarSlot, setBottomBarSlot] = useState<HTMLElement | null>(null);
  /** 데스크탑(sm+) 접이형 필터 패널 */
  const [desktopPanelOpen, setDesktopPanelOpen] = useState(false);
  /** `/media/map` — 유형·고급 필터 인라인 아코디언 */
  const [mapFiltersExpanded, setMapFiltersExpanded] = useState(false);
  const [mapFiltersExpandedHydrated, setMapFiltersExpandedHydrated] =
    useState(false);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const desktopPanelRef = useRef<HTMLDivElement>(null);
  const advancedSectionRef = useRef<HTMLDivElement>(null);

  /** `/media` 목록 — 유형 칩은 툴바 밖 노출, 필터 패널·시트에도 전체 축(어떤 매체 포함) */
  const showListTypeChipRow =
    listPageLayout &&
    unifiedToolbar &&
    (mobileBottomBar || mobileStickyToolbar) &&
    !mapCompactFilters &&
    !mapPageViewModes;

  const activeMain = MEDIA_CATEGORIES.find((m) => m.id === mainCategory);
  const activeRegion = MEDIA_BROWSE_REGIONS.find((r) => r.id === regionMain);

  // 네트워크 매체는 `features=network` 로 전용 유형 칩 표시 — 일반 유형 목록의 network id 는 제외
  const mediaTypeCategories = MEDIA_CATEGORIES.filter((m) => m.id !== "network");

  /** 모바일 바텀시트 — 전체 축 카운트 (PR #207) */
  const activeFilterCount = [
    variant === "network" ? networkType : mainCategory,
    variant === "media" ? subCategory : "",
    variant === "media" ? target : "",
    regionMain,
    regionSub,
    priceMin,
    priceMax,
    variant === "media" ? features : "",
  ].filter(Boolean).length;

  const mobileVaulSheets = mobileBottomBar || mobileStickyToolbar;

  /** 데스크탑 [필터] 뱃지 — 노출된 유형 칩 제외, 접힌 축만 */
  const collapsedFilterCount = [
    variant === "media" ? target : "",
    regionMain,
    regionSub,
    priceMin,
    priceMax,
    variant === "media" ? features : "",
  ].filter(Boolean).length;

  const filterOutRegionChips = (chips: ReturnType<typeof buildMapBrowseActiveFilterChips>) =>
    showHotspotRegions
      ? chips.filter(
          (c) => c.key !== "regionMain" && c.key !== "regionSub",
        )
      : chips;

  const mapBrowseFilterChips = filterOutRegionChips(
    mapCompactFilters
      ? buildMapBrowseActiveFilterChips(
          {
            mainCategory,
            subCategory,
            target,
            regionMain,
            regionSub,
            priceMin,
            priceMax,
            features,
          },
          isKo,
        )
      : [],
  );

  const mediaBrowseActiveChips = filterOutRegionChips(
    mobileVaulSheets && variant === "media"
      ? buildMapBrowseActiveFilterChips(
          {
            mainCategory,
            subCategory,
            target,
            regionMain,
            regionSub,
            priceMin,
            priceMax,
            features,
          },
          isKo,
        )
      : mapBrowseFilterChips,
  );

  const sortLabel =
    MEDIA_SEARCH_SORT_OPTIONS.find((o) => o.value === sort)?.label ??
    (isKo ? "정렬" : "Sort");

  /** 지도 compact — 접힌 상태 배지 (유형·고급 필터 전체) */
  const mapCompactFilterCount = mapBrowseFilterChips.length;

  const desktopFilterBadgeCount = mapCompactFilters
    ? mapCompactFilterCount
    : collapsedFilterCount;

  const showMapActiveFilterStrip =
    mapCompactFilters &&
    !mapFiltersExpanded &&
    mapBrowseFilterChips.length > 0 &&
    !(mobileBottomBar && unifiedToolbar);

  const showMobileActiveSummary =
    unifiedToolbar &&
    (mobileStickyToolbar || mobileBottomBar) &&
    mediaBrowseActiveChips.length > 0;

  const showDesktopTypeChipRow = !mapCompactFilters && !unifiedToolbar;

  const showMapInlineFilterAccordion =
    mapCompactFilters && mapFiltersExpanded;

  const showResultCountLabel = !mapPageViewModes;
  const showResultSummaryRow =
    showResultCountLabel ||
    selectedCount > 0 ||
    (!mapPageViewModes && cartCount > 0) ||
    (!mapPageViewModes && compareCount > 0);

  const mapMobileImmersiveMode =
    mapMobileImmersive &&
    mapPageViewModes &&
    unifiedToolbar &&
    mobileStickyToolbar;

  const mapToolbarCompact =
    (mapPageViewModes && !(unifiedToolbar && mobileStickyToolbar)) ||
    mapMobileImmersiveMode;

  const total = totalCount;

  const mapCountLabel =
    viewMode === "map" && variant !== "network"
      ? formatMapViewCountLabel(resultCount, total, isKo)
      : null;

  const resultLabel = loading
    ? isKo
      ? "검색 중…"
      : "Searching…"
    : mapCountLabel ??
      (isKo
        ? variant === "network"
          ? `네트워크 ${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""}개`
          : `매체 ${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""}개`
        : variant === "network"
          ? `${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""} networks`
          : `${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""} media`);

  // 바텀시트 "결과 보기" 버튼 라벨
  const sheetCtaLabel = loading
    ? isKo
      ? "검색 중…"
      : "Searching…"
    : mapCountLabel
      ? isKo
        ? `${mapCountLabel} 결과 보기`
        : `Show ${mapCountLabel}`
      : isKo
        ? `${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""}개 결과 보기`
        : `Show ${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""}`;

  const desktopPanelCtaLabel = loading
    ? isKo
      ? "검색 중…"
      : "Searching…"
    : mapCountLabel
      ? isKo
        ? `적용 (${mapCountLabel})`
        : `Apply (${mapCountLabel})`
      : isKo
        ? `적용 (${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""})`
        : `Apply (${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""})`;

  const toggleFeature = (value: string) => {
    const parts = new Set(
      features
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
    if (parts.has(value)) parts.delete(value);
    else parts.add(value);
    onFeaturesChange([...parts].join(","));
  };

  const featureSet = new Set(
    features
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const clearAllFilters = () => {
    onMainCategoryChange("");
    onSubCategoryChange("");
    onTargetChange("");
    onRegionMainChange("");
    onRegionSubChange("");
    onPriceMinChange("");
    onPriceMaxChange("");
    onFeaturesChange("");
    if (variant === "network") onNetworkTypeChange?.("");
  };

  const clearCollapsedFilters = () => {
    onTargetChange("");
    onRegionMainChange("");
    onRegionSubChange("");
    onPriceMinChange("");
    onPriceMaxChange("");
    onFeaturesChange("");
  };

  const persistMapFiltersExpanded = (next: boolean) => {
    setMapFiltersExpanded(next);
    if (typeof window !== "undefined") {
      if (next) {
        window.localStorage.setItem(MAP_TYPE_FILTERS_EXPANDED_KEY, "1");
      } else {
        window.localStorage.removeItem(MAP_TYPE_FILTERS_EXPANDED_KEY);
      }
    }
  };

  const toggleMapFiltersExpanded = () => {
    persistMapFiltersExpanded(!mapFiltersExpanded);
  };

  const removeMapBrowseFilterChip = (key: MediaMapActiveFilterKey) => {
    if (key === "mainCategory") {
      onMainCategoryChange("");
      onSubCategoryChange("");
      return;
    }
    if (key === "subCategory") {
      onSubCategoryChange("");
      return;
    }
    if (key === "target") {
      onTargetChange("");
      return;
    }
    if (key === "regionMain") {
      onRegionMainChange("");
      onRegionSubChange("");
      return;
    }
    if (key === "regionSub") {
      onRegionSubChange("");
      return;
    }
    if (key === "price") {
      onPriceMinChange("");
      onPriceMaxChange("");
      return;
    }
    if (key.startsWith("feature:")) {
      const featureId = key.slice("feature:".length);
      const parts = new Set(
        features
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean),
      );
      parts.delete(featureId);
      onFeaturesChange([...parts].join(","));
    }
  };

  // `/media/map` — 펼침 상태 localStorage 복원 (기본 접힘)
  useEffect(() => {
    if (!mapCompactFilters || mapFiltersExpandedHydrated) return;
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(MAP_TYPE_FILTERS_EXPANDED_KEY);
    setMapFiltersExpanded(stored === "1");
    setMapFiltersExpandedHydrated(true);
  }, [mapCompactFilters, mapFiltersExpandedHydrated]);

  // 바텀시트 열림 동안 배경 스크롤 잠금 (레거시 오버레이만 — vaul 은 자체 처리)
  useEffect(() => {
    if (!sheetOpen || mobileVaulSheets) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen, mobileVaulSheets]);

  useEffect(() => {
    if (!mobileBottomBar || typeof document === "undefined") return;
    setBottomBarSlot(document.getElementById(MEDIA_MOBILE_BOTTOM_BAR_SLOT_ID));
  }, [mobileBottomBar]);

  // 데스크탑 패널: 바깥 클릭 닫기
  useEffect(() => {
    if (!desktopPanelOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!desktopPanelRef.current?.contains(e.target as Node)) {
        setDesktopPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [desktopPanelOpen]);

  useEffect(() => {
    if (!advancedOpen || !desktopPanelOpen) return;
    const frame = requestAnimationFrame(() => {
      advancedSectionRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [advancedOpen, desktopPanelOpen]);

  const chipRowScroll = "scrollbar-hide flex gap-2 overflow-x-auto pb-0.5";
  const chipRowWrap = "flex flex-wrap gap-2 pb-1";

  const renderTypeAxis = (wrap: boolean) => {
    const chipRow = wrap ? chipRowWrap : chipRowScroll;
    return (
      <div data-screenshot="media-main-category">
        {wrap ? (
          <p className="tkad-home-accent-text mb-2 text-xs font-bold">
            {isKo
              ? variant === "network"
                ? "네트워크 유형"
                : "어떤 매체?"
              : variant === "network"
                ? "Network type"
                : "Media type"}
          </p>
        ) : null}
        <div className={chipRow}>
          {variant === "network"
            ? NETWORK_BROWSE_TYPE_CHIPS.map((chip) => {
                const Icon = MAIN_ICONS[chip.icon] ?? Network;
                const selected = networkType === chip.value;
                return (
                  <button
                    key={chip.value || "all"}
                    type="button"
                    onClick={() =>
                      onNetworkTypeChange?.(selected ? "" : chip.value)
                    }
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                      selected ? MEDIA_CHIP_ACTIVE : MEDIA_CHIP_INACTIVE,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {isKo ? chip.labelKo : chip.labelEn}
                  </button>
                );
              })
            : mediaTypeCategories.map((main) => {
                const Icon = MAIN_ICONS[main.icon] ?? Monitor;
                const selected = mainCategory === main.id;
                return (
                  <button
                    key={main.id}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        onMainCategoryChange("");
                        onSubCategoryChange("");
                      } else {
                        onMainCategoryChange(main.id);
                        onSubCategoryChange("");
                      }
                    }}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                      selected
                        ? MAIN_COLOR_ACTIVE[main.color] ?? MEDIA_CHIP_ACTIVE
                        : MEDIA_CHIP_INACTIVE,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {isKo ? main.label : main.labelEn ?? main.label}
                  </button>
                );
              })}
        </div>

        {variant === "media" && activeMain && activeMain.id !== "network" ? (
          <div
            className={cn(
              "mt-2 flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-2 dark:border-white/10 dark:bg-white/5",
              !wrap && "sm:mt-1.5 sm:p-1.5",
            )}
            data-screenshot="media-sub-category"
          >
            {activeMain.sub.map((sub) => {
              const selected = subCategory === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSubCategoryChange(selected ? "" : sub.id)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-all",
                    selected ? MEDIA_CHIP_ACTIVE : MEDIA_CHIP_INACTIVE,
                  )}
                >
                  {isKo ? sub.label : sub.labelEn ?? sub.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  const renderRegionAxis = (wrap: boolean) => {
    const chipRow = wrap ? chipRowWrap : chipRowScroll;
    return (
      <div data-screenshot="media-region-filter">
        <p className="mb-2 text-xs font-bold text-cyan-600 dark:text-cyan-400">
          {isKo ? "어디서?" : "Where"}
        </p>
        <div className={chipRow}>
          {MEDIA_BROWSE_REGIONS.map((main) => {
            const selected = regionMain === main.id;
            return (
              <button
                key={main.id}
                type="button"
                onClick={() => {
                  if (selected) {
                    onRegionMainChange("");
                    onRegionSubChange("");
                  } else {
                    onRegionMainChange(main.id);
                    onRegionSubChange("");
                  }
                }}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                  selected
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/70",
                )}
              >
                {isKo ? main.label : main.labelEn ?? main.label}
              </button>
            );
          })}
        </div>

        {activeRegion ? (
          <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-cyan-100 bg-cyan-50/50 p-2 dark:border-cyan-500/20 dark:bg-cyan-500/5">
            {activeRegion.sub.map((sub) => {
              const selected = regionSub === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onRegionSubChange(selected ? "" : sub.id)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-all",
                    selected
                      ? "bg-cyan-500 text-white"
                      : "bg-white text-gray-600 dark:bg-white/10 dark:text-white/70",
                  )}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  const handleHotspotSelect = (main: string, sub: string) => {
    if (onHotspotRegionSelect) {
      onHotspotRegionSelect(main, sub);
      return;
    }
    onRegionMainChange(main);
    onRegionSubChange(sub);
  };

  const handleHotspotClear = () => {
    onRegionMainChange("");
    onRegionSubChange("");
  };

  const renderHotspotRow = () => (
    <HotspotRegionChips
      isKo={isKo}
      regionSub={regionSub}
      compact={mapMobileImmersiveMode}
      onSelect={handleHotspotSelect}
      onClear={handleHotspotClear}
    />
  );

  const renderCollapsedAxes = (wrap: boolean) => {
    const chipRow = wrap ? chipRowWrap : chipRowScroll;
    return (
      <>
        {variant === "media" ? (
          <div>
            <p className="mb-2 text-xs font-bold text-pink-600 dark:text-pink-400">
              {isKo ? "광고 목적" : "Campaign goal"}
            </p>
            <div className={chipRow}>
              {MEDIA_TARGET_CHIPS.map((chip) => (
                <button
                  key={chip.value || "all"}
                  type="button"
                  onClick={() =>
                    onTargetChange(target === chip.value ? "" : chip.value)
                  }
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                    target === chip.value
                      ? "bg-pink-500 text-white"
                      : "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/70",
                  )}
                >
                  <MediaFilterChipLabel label={chip.label} icon={chip.icon} />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showHotspotRegions ? (
          <div>
            <button
              type="button"
              onClick={() => setRegionPanelOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-xl border border-cyan-100 bg-cyan-50/40 px-3 py-2 text-sm font-medium text-cyan-800 dark:border-cyan-500/20 dark:bg-cyan-500/5 dark:text-cyan-200"
            >
              <span>{isKo ? "전체 지역" : "All regions"}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  regionPanelOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {regionPanelOpen ? (
              <div className="mt-2">{renderRegionAxis(wrap)}</div>
            ) : null}
          </div>
        ) : (
          renderRegionAxis(wrap)
        )}

        <div ref={advancedSectionRef}>
          <button
            type="button"
            onClick={() => setAdvancedOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
          >
            <span>{isKo ? "추가 필터" : "More filters"}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                advancedOpen && "rotate-180",
              )}
            />
          </button>

          {advancedOpen ? (
            <div className="mt-2 space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="tkad-type-note font-medium text-tkad-muted">
                    {isKo ? "최소 가격(원)" : "Min price (KRW)"}
                  </span>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => onPriceMinChange(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/8 dark:text-white"
                    placeholder="0"
                  />
                </label>
                <label className="space-y-1">
                  <span className="tkad-type-note font-medium text-tkad-muted">
                    {isKo ? "최대 가격(원)" : "Max price (KRW)"}
                  </span>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => onPriceMaxChange(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/8 dark:text-white"
                    placeholder="∞"
                  />
                </label>
              </div>
              {variant === "media" ? (
                <div>
                  <p className="tkad-type-note mb-1.5 font-medium text-tkad-muted">
                    {isKo ? "매체 특성" : "Features"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FEATURE_CHIPS.map((chip) => {
                      const selected = featureSet.has(chip.value);
                      return (
                        <button
                          key={chip.value}
                          type="button"
                          onClick={() => toggleFeature(chip.value)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-all",
                            selected ? MEDIA_CHIP_ACTIVE : MEDIA_CHIP_INACTIVE,
                          )}
                        >
                          {isKo ? chip.labelKo : chip.labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </>
    );
  };

  const renderFilterAxes = (wrap: boolean) => (
    <>
      {renderTypeAxis(wrap)}
      {renderCollapsedAxes(wrap)}
    </>
  );

  const searchInput = (
    <div
      className={cn(
        "relative min-w-0",
        mapPageViewModes
          ? "w-auto max-w-[9.5rem] flex-1 sm:max-w-44"
          : "flex-1 sm:min-w-[12rem] sm:max-w-md",
      )}
    >
      <Search
        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-white/30"
        aria-hidden
      />
      <CompositionSearchInput
        value={query}
        onValueChange={onQueryChange}
        placeholder={
          isKo
            ? variant === "network"
              ? "네트워크명·지역·유형 검색"
              : "매체명·지역·유형 검색"
            : "Search name, region, type"
        }
        className={cn(
          "w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/35 dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder-white/30",
          mapToolbarCompact ? "py-2" : "py-3 sm:py-2.5",
        )}
      />
      {query ? (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          aria-label={isKo ? "검색어 지우기" : "Clear search"}
        >
          <X className="h-4 w-4 text-gray-400 dark:text-white/40" />
        </button>
      ) : null}
    </div>
  );

  const sortSelect = (
    <select
      value={sort}
      onChange={(e) => onSortChange(e.target.value)}
      aria-label={isKo ? "정렬" : "Sort"}
      className={cn(
        "tkad-type-meta min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-100 px-3 font-medium text-gray-600 focus:outline-none sm:w-auto sm:shrink-0 sm:flex-none dark:border-white/10 dark:bg-white/8 dark:text-white/70",
        mapToolbarCompact ? "py-1" : "py-1.5",
      )}
    >
      {MEDIA_SEARCH_SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  const viewModeOptions = listPageLayout
    ? LIST_VIEW_MODES
    : mapPageViewModes
      ? MAP_PAGE_VIEW_MODES
      : VIEW_MODES;

  const viewModeToggle = showViewModes ? (
    <div
      className={cn(
        "scrollbar-hide flex min-w-0 shrink-0 overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10",
        listPageLayout && "rounded-lg",
      )}
      data-screenshot={
        mapPageViewModes ? "media-view-mode-map-split" : "media-view-mode"
      }
    >
      {viewModeOptions.map((mode) => {
        const Icon = mode.icon;
        const active = mapPageViewModes
          ? mode.id === "map"
          : viewMode === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onViewModeChange(mode.id)}
            title={isKo ? mode.labelKo : mode.labelEn}
            aria-label={isKo ? mode.labelKo : mode.labelEn}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-1 font-medium transition-all tkad-type-meta",
              listPageLayout ? "px-2 py-1" : "px-2.5 py-1.5",
              active ? MEDIA_CHIP_ACTIVE : MEDIA_CHIP_INACTIVE,
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className={listPageLayout ? "sr-only sm:not-sr-only" : "hidden sm:inline"}>
              {isKo ? mode.labelKo : mode.labelEn}
            </span>
          </button>
        );
      })}
    </div>
  ) : null;

  const mapNavButton =
    listPageLayout && onNavigateToMap ? (
      <button
        type="button"
        onClick={onNavigateToMap}
        className={cn(
          TOOLBAR_CTRL_BTN,
          TOOLBAR_CTRL_PAD,
          "transition-colors hover:bg-gray-50 dark:hover:bg-white/10",
        )}
        aria-label={isKo ? "지도에서 보기" : "Open map"}
      >
        <MapIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{isKo ? "지도" : "Map"}</span>
      </button>
    ) : null;

  const summaryChipClass =
    "tkad-type-meta tkad-home-accent-text inline-flex shrink-0 items-center rounded-full border border-violet-300/45 bg-violet-500/10 px-2.5 py-1 font-semibold underline decoration-violet-400/50 underline-offset-2 hover:opacity-90";

  const cartSummaryButton =
    cartCount > 0 ? (
      <button
        type="button"
        onClick={() => setPlanSheetOpen(true)}
        className={summaryChipClass}
        aria-label={isKo ? `담은 매체 ${cartCount}개 보기` : `View ${cartCount} items in cart`}
      >
        {isKo ? `담김 ${cartCount}` : `${cartCount} in cart`}
      </button>
    ) : null;

  const compareSummaryButton =
    mapPageViewModes && compareCount > 0 && onCompareSummaryClick ? (
      <button
        type="button"
        onClick={onCompareSummaryClick}
        className={summaryChipClass}
        aria-label={isKo ? `비교함 ${compareCount}개 보기` : `View ${compareCount} items to compare`}
      >
        {isKo ? `비교 ${compareCount}` : `${compareCount} compare`}
      </button>
    ) : null;

  const mapToolbarSummaryChips =
    mapPageViewModes && (cartSummaryButton || compareSummaryButton) ? (
      <div className="flex shrink-0 items-center gap-1.5">
        {cartSummaryButton}
        {compareSummaryButton}
      </div>
    ) : null;

  const mobileSortButton = (
    <button
      type="button"
      onClick={() => {
        if (mobileVaulSheets) {
          setSortSheetOpen(true);
          return;
        }
      }}
      className={cn(TOOLBAR_CTRL_BTN, TOOLBAR_CTRL_PAD)}
      aria-label={isKo ? "정렬" : "Sort"}
    >
      <Filter className="h-4 w-4 rotate-90" aria-hidden />
      <span className="max-w-[5.5rem] truncate">{sortLabel}</span>
    </button>
  );

  const mobileFilterButton = (
    <button
      type="button"
      onClick={() => setSheetOpen(true)}
      className={cn(TOOLBAR_CTRL_BTN, TOOLBAR_CTRL_PAD)}
      aria-haspopup="dialog"
      aria-expanded={sheetOpen}
      aria-label={isKo ? "필터 열기" : "Open filters"}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      {isKo ? "필터" : "Filter"}
      {activeFilterCount > 0 ? (
        <span className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-500 px-1.5 text-[11px] font-bold leading-none text-white">
          {activeFilterCount}
        </span>
      ) : null}
    </button>
  );

  const TOOLBAR_ICON_BTN = cn(
    TOOLBAR_CTRL_BTN,
    "relative h-9 w-9 justify-center gap-0 p-0",
  );

  const mobileFilterButtonIcon = (
    <button
      type="button"
      onClick={() => setSheetOpen(true)}
      className={TOOLBAR_ICON_BTN}
      aria-haspopup="dialog"
      aria-expanded={sheetOpen}
      aria-label={isKo ? "필터 열기" : "Open filters"}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      {activeFilterCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold leading-none text-white">
          {activeFilterCount}
        </span>
      ) : null}
    </button>
  );

  const mobileSortButtonIcon = (
    <button
      type="button"
      onClick={() => {
        if (mobileVaulSheets) {
          setSortSheetOpen(true);
        }
      }}
      className={TOOLBAR_ICON_BTN}
      aria-label={isKo ? "정렬" : "Sort"}
    >
      <Filter className="h-4 w-4 rotate-90" aria-hidden />
    </button>
  );

  const mobileImmersiveControlRow = mapMobileImmersiveMode ? (
    <div
      className="flex min-w-0 items-center gap-1.5 md:hidden"
      data-screenshot="media-map-mobile-immersive-toolbar"
    >
      {searchInput}
      {mobileFilterButtonIcon}
      {mobileSortButtonIcon}
      {mapPageViewModes ? mapToolbarSummaryChips : null}
    </div>
  ) : null;

  const mobileStickyControlRow =
    mobileStickyToolbar && unifiedToolbar && !mapMobileImmersiveMode ? (
      <div
        className="sticky top-14 z-30 -mx-4 flex min-w-0 items-center gap-2 border-b border-gray-200/80 bg-gray-50/95 px-4 py-2 backdrop-blur-md md:hidden dark:border-white/10 dark:bg-[#020202]/95"
        data-screenshot="media-mobile-sticky-controls"
      >
        {mobileFilterButton}
        {mobileSortButton}
        <div className="min-w-0 flex-1">{viewModeToggle}</div>
        {mapPageViewModes ? mapToolbarSummaryChips : null}
        {mapNavButton}
      </div>
    ) : null;

  return (
    <div
      className={cn(
        "min-w-0",
        mapPageViewModes ? "space-y-1.5" : "space-y-3",
        className,
      )}
      data-screenshot="media-browse-filters"
    >
      <DiscoveryPageHeader
        showHeader={showSectionHeader}
        eyebrow={sectionEyebrow}
        title={sectionTitle}
        description={sectionDesc}
        titleAs="h3"
      />

      {/* `/media` 앱 셸 — 목록: 상단 검색 + sticky 컨트롤 / 지도: PR B 하단 바 */}
      {unifiedToolbar && (mobileBottomBar || mobileStickyToolbar) ? (
        <>
          <div
            className={cn(
              "md:hidden",
              mapMobileImmersiveMode ? "space-y-1.5" : "space-y-2",
            )}
          >
            {mapMobileImmersiveMode ? (
              <>
                {mobileImmersiveControlRow}
                {showHotspotRegions && variant === "media"
                  ? renderHotspotRow()
                  : null}
              </>
            ) : (
              searchInput
            )}
            {!mapMobileImmersiveMode ? mobileStickyControlRow : null}
            {showHotspotRegions && variant === "media" && !mapMobileImmersiveMode ? (
              <div className="md:hidden">{renderHotspotRow()}</div>
            ) : null}
            {showListTypeChipRow && !mapMobileImmersiveMode ? (
              <div className="min-w-0 md:hidden" data-screenshot="media-main-category-mobile">
                {renderTypeAxis(false)}
              </div>
            ) : null}
            {showMobileActiveSummary ? (
              <MediaMapActiveFiltersBar
                chips={mediaBrowseActiveChips}
                onRemove={removeMapBrowseFilterChip}
                onClearAll={clearAllFilters}
                isKo={isKo}
              />
            ) : activeFilterCount > 0 &&
              !mobileStickyToolbar &&
              !mobileBottomBar ? (
              <p className="tkad-type-meta text-tkad-muted">
                <span className="inline-flex items-center rounded-full bg-violet-500/15 px-2.5 py-0.5 font-semibold text-tkad-accent">
                  {isKo ? `필터 ${activeFilterCount}` : `${activeFilterCount} filters`}
                </span>
              </p>
            ) : null}
          </div>
          <div className="hidden min-w-0 flex-wrap items-center gap-2 md:flex">
            {searchInput}
            <div className="relative shrink-0" ref={desktopPanelRef}>
              <button
                type="button"
                onClick={() => setDesktopPanelOpen((o) => !o)}
                className={cn(TOOLBAR_CTRL_BTN, TOOLBAR_CTRL_PAD)}
                aria-expanded={desktopPanelOpen}
                aria-haspopup="dialog"
                aria-label={isKo ? "필터 열기" : "Open filters"}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                {isKo ? "필터" : "Filters"}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 opacity-60 transition-transform",
                    desktopPanelOpen && "rotate-180",
                  )}
                  aria-hidden
                />
                {activeFilterCount > 0 ? (
                  <span className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-500 px-1.5 text-[11px] font-bold leading-none text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              {desktopPanelOpen ? (
                <div
                  role="dialog"
                  aria-modal="false"
                  className="absolute right-0 top-[calc(100%+0.35rem)] z-50 flex max-h-[min(80vh,36rem)] w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#0a0a0a]"
                >
                  <div className="shrink-0 border-b border-gray-100 px-4 py-3 dark:border-white/10">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {isKo ? "필터" : "Filters"}
                    </p>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                    <div className="space-y-4 pb-2">{renderFilterAxes(true)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 px-4 py-3 dark:border-white/10">
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      disabled={activeFilterCount === 0}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 disabled:opacity-40 dark:border-white/10 dark:text-white/70"
                    >
                      {isKo ? "초기화" : "Reset"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDesktopPanelOpen(false)}
                      className="tkad-neon-cta-clean flex-1 rounded-xl px-4 py-2 text-sm font-bold text-white"
                    >
                      {desktopPanelCtaLabel}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {sortSelect}
            {viewModeToggle}
            {mapPageViewModes ? mapToolbarSummaryChips : null}
            {mapNavButton}
            {toolbarEnd}
          </div>
          {showHotspotRegions && variant === "media" ? (
            <div className="hidden min-w-0 md:block">{renderHotspotRow()}</div>
          ) : null}
          {showListTypeChipRow ? (
            <div className="hidden min-w-0 md:block" data-screenshot="media-main-category">
              {renderTypeAxis(false)}
            </div>
          ) : null}
        </>
      ) : unifiedToolbar ? (
        <>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {searchInput}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className={cn(TOOLBAR_CTRL_BTN, TOOLBAR_CTRL_PAD)}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-label={isKo ? "필터 열기" : "Open filters"}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              {isKo ? "필터" : "Filters"}
              {activeFilterCount > 0 ? (
                <span className="tkad-type-note ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-500 px-1.5 font-bold leading-none text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            {sortSelect}
            {viewModeToggle}
            {toolbarEnd}
          </div>
          <div className="min-w-0">{renderTypeAxis(false)}</div>
        </>
      ) : null}

      {/* 모바일: 검색 전체 너비 (PR #207 레이아웃 유지) */}
      {!unifiedToolbar ? <div className="sm:hidden">{searchInput}</div> : null}

      {/* 데스크탑: 검색 + [필터] + 정렬 + 보기 (한 줄) */}
      {!unifiedToolbar ? (
      <div className="hidden min-w-0 flex-wrap items-center gap-2 sm:flex">
        {searchInput}
        <div className="relative shrink-0" ref={desktopPanelRef}>
          <button
            type="button"
            onClick={() => {
              if (mapCompactFilters) {
                toggleMapFiltersExpanded();
                return;
              }
              setDesktopPanelOpen((o) => !o);
            }}
            className={cn(
              TOOLBAR_CTRL_BTN,
              TOOLBAR_CTRL_PAD,
              mapToolbarCompact && "py-1",
            )}
            aria-expanded={mapCompactFilters ? mapFiltersExpanded : desktopPanelOpen}
            aria-haspopup={mapCompactFilters ? undefined : "dialog"}
            aria-label={isKo ? "필터 열기" : "Open filters"}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {isKo ? "필터" : "Filters"}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 opacity-60 transition-transform",
                (mapCompactFilters ? mapFiltersExpanded : desktopPanelOpen) &&
                  "rotate-180",
              )}
              aria-hidden
            />
            {desktopFilterBadgeCount > 0 ? (
              <span className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-500 px-1.5 text-[11px] font-bold leading-none text-white">
                {desktopFilterBadgeCount}
              </span>
            ) : null}
          </button>

          {!mapCompactFilters && desktopPanelOpen ? (
            <div
              role="dialog"
              aria-modal="false"
              className="absolute right-0 top-[calc(100%+0.35rem)] z-50 flex max-h-[min(80vh,36rem)] w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#0a0a0a]"
            >
              <div className="shrink-0 border-b border-gray-100 px-4 py-3 dark:border-white/10">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {isKo ? "필터" : "Filters"}
                  {collapsedFilterCount > 0 ? (
                    <span className="ml-1.5 text-sm font-semibold text-violet-500">
                      {collapsedFilterCount}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                <div className="space-y-4 pb-2">{renderCollapsedAxes(true)}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2 border-t border-gray-100 px-4 py-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={clearCollapsedFilters}
                  disabled={collapsedFilterCount === 0}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 disabled:opacity-40 dark:border-white/10 dark:text-white/70"
                >
                  {isKo ? "초기화" : "Reset"}
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopPanelOpen(false)}
                  className="tkad-neon-cta-clean flex-1 rounded-xl px-4 py-2 text-sm font-bold text-white"
                >
                  {desktopPanelCtaLabel}
                </button>
              </div>
            </div>
          ) : null}
        </div>
        {sortSelect}
        {viewModeToggle}
        {toolbarEnd}
      </div>
      ) : null}

      {showMapActiveFilterStrip ? (
        <MediaMapActiveFiltersBar
          chips={mapBrowseFilterChips}
          onRemove={removeMapBrowseFilterChip}
          onClearAll={clearAllFilters}
          isKo={isKo}
        />
      ) : null}

      {showDesktopTypeChipRow ? (
        <div className="hidden min-w-0 sm:block">{renderTypeAxis(false)}</div>
      ) : null}

      {showMapInlineFilterAccordion ? (
        <div className="hidden min-w-0 space-y-4 rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/5 sm:block">
          {renderTypeAxis(true)}
          {renderCollapsedAxes(true)}
          <div className="flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={clearAllFilters}
              disabled={mapCompactFilterCount === 0}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 disabled:opacity-40 dark:border-white/10 dark:text-white/70"
            >
              {isKo ? "초기화" : "Reset"}
            </button>
            <button
              type="button"
              onClick={() => persistMapFiltersExpanded(false)}
              className="tkad-neon-cta-clean flex-1 rounded-xl px-4 py-2 text-sm font-bold text-white"
            >
              {desktopPanelCtaLabel}
            </button>
          </div>
        </div>
      ) : null}

      {/* 모바일 툴바: [필터] · [정렬] · [보기] (PR #207) — PR B 하단 바 사용 시 숨김 */}
      {!unifiedToolbar ? (
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(TOOLBAR_CTRL_BTN, TOOLBAR_CTRL_PAD, mapToolbarCompact && "py-1")}
          aria-label={isKo ? "필터 열기" : "Open filters"}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {isKo ? "필터" : "Filters"}
          {activeFilterCount > 0 ? (
            <span className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-500 px-1.5 text-[11px] font-bold leading-none text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        {sortSelect}
        {viewModeToggle}
        {toolbarEnd}
      </div>
      ) : null}

      {showResultSummaryRow ? (
        <DiscoveryResultSummary
          resultLabel={resultLabel}
          showResultCount={showResultCountLabel}
          isKo={isKo}
          selectedCount={selectedCount}
          selectionVariant={selectionVariant}
          onSelectedSummaryClick={onSelectedSummaryClick}
          cartCount={mapPageViewModes ? 0 : cartCount}
          onCartSummaryClick={
            !mapPageViewModes && cartCount > 0
              ? () => setPlanSheetOpen(true)
              : undefined
          }
          compareCount={mapPageViewModes ? 0 : compareCount}
          onCompareSummaryClick={
            mapPageViewModes || compareCount === 0 ? undefined : onCompareSummaryClick
          }
        />
      ) : null}

      <PlanCartSheet
        open={planSheetOpen}
        onOpenChange={setPlanSheetOpen}
        isKo={isKo}
      />

      {/* PR B — vaul 필터/정렬 + (지도 전용) 하단 바 포털 */}
      {mobileVaulSheets && unifiedToolbar ? (
        <>
          <MediaFilterVaulSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            isKo={isKo}
            activeFilterCount={activeFilterCount}
            onReset={clearAllFilters}
            applyLabel={sheetCtaLabel}
          >
            {renderFilterAxes(true)}
          </MediaFilterVaulSheet>
          <MediaSortVaulSheet
            open={sortSheetOpen}
            onOpenChange={setSortSheetOpen}
            isKo={isKo}
            sort={sort}
            onSortChange={onSortChange}
          />
          {mobileBottomBar && bottomBarSlot
            ? createPortal(
                <MediaMobileBottomBar
                  isKo={isKo}
                  activeFilterCount={activeFilterCount}
                  sortLabel={sortLabel}
                  viewSegment={mobileViewSegment}
                  onViewSegmentChange={onMobileViewSegmentChange}
                  onOpenFilters={() => setSheetOpen(true)}
                  onOpenSort={() => setSortSheetOpen(true)}
                />,
                bottomBarSlot,
              )
            : null}
        </>
      ) : sheetOpen ? (
        <div
          className={cn("fixed inset-0 z-50", !unifiedToolbar && "sm:hidden")}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label={isKo ? "필터 닫기" : "Close filters"}
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl border-t border-gray-200 bg-white dark:border-white/10 dark:bg-[#0a0a0a]">
            <DiscoveryFilterSheetHeader
              isKo={isKo}
              activeFilterCount={activeFilterCount}
              onClose={() => setSheetOpen(false)}
            />

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {renderFilterAxes(true)}
            </div>

            <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 dark:border-white/10">
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 disabled:opacity-40 dark:border-white/10 dark:text-white/70"
              >
                {isKo ? "초기화" : "Reset"}
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="tkad-neon-cta-clean flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
              >
                {sheetCtaLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
