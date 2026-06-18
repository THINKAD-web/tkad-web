"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MediaCard } from "@/components/media/media-card";
import {
  MediaManualBrowseFilters,
  type MediaManualBrowseViewMode,
} from "@/components/media/media-manual-browse-filters";
import CompareBar from "@/components/compare-bar";
import type { HomeCatalogMediaItem, PublicMediaListResponse } from "@/types/media";
import type { MediaItem } from "@/lib/media-data";
import {
  mapMediaItemToHomeCatalog,
} from "@/lib/media-catalog-map";
import {
  entriesToCompareMediaItems,
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  type CompareCartEntry,
} from "@/lib/compare-cart-client";
import { useCart } from "@/lib/cart";
import { useAppToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import { withSearchParamsSuspense } from "@/components/with-search-params-suspense";
import {
  formatMediaPriceWithPeriodSuffix,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";
import { resolveBrowseCategoryParams } from "@/lib/media-browse-categories";
import { MEDIA_BROWSE_REGIONS } from "@/lib/media-browse-regions";
import { mediaItemDetailPath } from "@/lib/media-slug";
import { useRouter, usePathname } from "@/i18n/navigation";
import { MediaPinPopup } from "@/components/media-pin-popup";
import { PlannerSelectedMediaBar } from "@/components/planner/planner-selected-media-bar";
import {
  mediaItemHasMapCoordinates,
  resolveMediaIdFromMapPinId,
} from "@/lib/media-detail-map-markers";

const MediaBrowseMap = dynamic(() => import("@/components/media-browse-map"), {
  ssr: false,
});

type ViewMode = MediaManualBrowseViewMode;
const VIEW_MODE_STORAGE_KEY = "tkad_media_view_mode";

const PAGE_SIZE = 30;

function formatPriceLabel(
  price?: number,
  period?: string,
  locale = "ko-KR",
) {
  if (!price) return null;
  return formatMediaPriceWithPeriodSuffix(
    price,
    normalizeMediaPricePeriod(period),
    locale,
  );
}

function formatFeedFootTraffic(value?: number) {
  if (!value || value <= 0) return null;
  return `일 ${value.toLocaleString("ko-KR")}명+`;
}

function feedHighlightChips(item: HomeCatalogMediaItem) {
  const chips: string[] = [];
  if (item.size) chips.push(item.size);
  const foot = formatFeedFootTraffic(item.dailyFootTraffic);
  if (foot) chips.push(foot);
  if (item.visibilityScore != null && item.visibilityScore > 0) {
    chips.push(`가시성 ${item.visibilityScore}`);
  }
  return chips;
}

interface Props {
  initialMedia: HomeCatalogMediaItem[];
  initialCatalogItems?: MediaItem[];
  initialTotal?: number;
  initialCategory?: string;
  initialTarget?: string;
  initialRegion?: string;
  /** `/media/network` — 네트워크 매체 전용 카탈로그 */
  catalogVariant?: "media" | "network";
  initialNetworkType?: string;
  /** 플래너 Step 4 임베드 — 동일 카드 + 플랜 담기 */
  plannerMode?: boolean;
  embedded?: boolean;
  plannerSelectedIds?: string[];
  onPlannerToggleMedia?: (mediaId: string, media?: MediaItem) => void;
  onPlannerClearMedia?: () => void;
}

function MediaSearchPageInner({
  initialMedia,
  initialCatalogItems = [],
  initialTotal,
  initialCategory,
  initialTarget,
  initialRegion,
  catalogVariant = "media",
  initialNetworkType,
  plannerMode = false,
  embedded = false,
  plannerSelectedIds = [],
  onPlannerToggleMedia,
  onPlannerClearMedia,
}: Props) {
  const locale = useLocale();
  const tMedia = useTranslations("media");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useAppToast();
  const { ids: cartIds, toggle: toggleCartId } = useCart();

  const initialFromUrl = useMemo(() => {
    const legacyCat =
      searchParams.get("category") ?? initialCategory ?? "";
    const resolved = resolveBrowseCategoryParams({
      mainCategory: searchParams.get("mainCategory"),
      subCategory: searchParams.get("subCategory"),
      category: legacyCat,
    });
    return {
      mainCategory: resolved.mainCategory ?? "",
      subCategory: resolved.subCategory ?? "",
      target: searchParams.get("target") ?? initialTarget ?? "",
      regionMain: searchParams.get("regionMain") ?? "",
      regionSub: searchParams.get("regionSub") ?? "",
      regionLegacy: searchParams.get("region") ?? initialRegion ?? "",
      priceMin: searchParams.get("priceMin") ?? "",
      priceMax: searchParams.get("priceMax") ?? "",
      features: searchParams.get("features") ?? "",
    };
  }, [searchParams, initialCategory, initialTarget, initialRegion]);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [mainCategory, setMainCategory] = useState(
    initialFromUrl.mainCategory,
  );
  const [subCategory, setSubCategory] = useState(initialFromUrl.subCategory);
  const [target, setTarget] = useState(initialFromUrl.target);
  const [regionMain, setRegionMain] = useState(initialFromUrl.regionMain);
  const [regionSub, setRegionSub] = useState(initialFromUrl.regionSub);
  const [priceMin, setPriceMin] = useState(initialFromUrl.priceMin);
  const [priceMax, setPriceMax] = useState(initialFromUrl.priceMax);
  const [features, setFeatures] = useState(initialFromUrl.features);
  const [networkType, setNetworkType] = useState(
    searchParams.get("networkType") ?? initialNetworkType ?? "",
  );
  const [sort, setSort] = useState(searchParams.get("sort") ?? "popular");
  const [viewMode, setViewMode] = useState<ViewMode>("feed");
  const [media, setMedia] = useState<HomeCatalogMediaItem[]>(initialMedia);
  const [catalogItems, setCatalogItems] =
    useState<MediaItem[]>(initialCatalogItems);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [mapPopupOpen, setMapPopupOpen] = useState(false);
  const [mapHeightPx, setMapHeightPx] = useState(520);
  const [total, setTotal] = useState(initialTotal ?? initialMedia.length);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const catalogFetchGeneration = useRef(0);
  const [compareEntries, setCompareEntriesState] = useState<CompareCartEntry[]>(
    [],
  );

  useEffect(() => {
    setCompareEntriesState(getCompareCartEntries());
    return subscribeCompareCart(() => {
      setCompareEntriesState(getCompareCartEntries());
    });
  }, []);

  useEffect(() => {
    const legacyCat = searchParams.get("category") ?? "";
    const resolved = resolveBrowseCategoryParams({
      mainCategory: searchParams.get("mainCategory"),
      subCategory: searchParams.get("subCategory"),
      category: legacyCat,
    });
    setMainCategory(resolved.mainCategory ?? "");
    setSubCategory(resolved.subCategory ?? "");
    setTarget(searchParams.get("target") ?? "");
    setRegionMain(searchParams.get("regionMain") ?? "");
    setRegionSub(searchParams.get("regionSub") ?? "");
    setQuery(searchParams.get("q") ?? "");
    setPriceMin(searchParams.get("priceMin") ?? "");
    setPriceMax(searchParams.get("priceMax") ?? "");
    setFeatures(searchParams.get("features") ?? "");
    setNetworkType(searchParams.get("networkType") ?? "");
    const sortParam = searchParams.get("sort");
    if (sortParam) setSort(sortParam);
  }, [searchParams]);

  useEffect(() => {
    if (plannerMode || embedded) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (mainCategory) params.set("mainCategory", mainCategory);
    if (subCategory) params.set("subCategory", subCategory);
    if (target) params.set("target", target);
    if (regionMain) params.set("regionMain", regionMain);
    if (regionSub) params.set("regionSub", regionSub);
    if (priceMin.trim()) params.set("priceMin", priceMin.trim());
    if (priceMax.trim()) params.set("priceMax", priceMax.trim());
    if (features.trim()) params.set("features", features.trim());
    if (catalogVariant === "network" && networkType) {
      params.set("networkType", networkType);
    }
    if (sort && sort !== "popular") params.set("sort", sort);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [
    query,
    mainCategory,
    subCategory,
    target,
    regionMain,
    regionSub,
    priceMin,
    priceMax,
    features,
    sort,
    catalogVariant,
    networkType,
    plannerMode,
    embedded,
    pathname,
    router,
  ]);

  const isInCompare = useCallback(
    (id: string) => compareEntries.some((e) => e.id === id),
    [compareEntries],
  );

  const toggleCompare = useCallback((item: HomeCatalogMediaItem) => {
    const prev = getCompareCartEntries();
    const exists = prev.some((e) => e.id === item.id);
    const next = exists
      ? prev.filter((e) => e.id !== item.id)
      : [...prev, { id: item.id, name: item.name, nameEn: item.name }];
    setCompareCartEntries(next);
  }, []);

  const toggleCart = useCallback(
    (item: HomeCatalogMediaItem) => {
      const inCart = cartIds.includes(item.id);
      toggleCartId(item.id);
      if (inCart) {
        toast.warning(
          item.name
            ? `${item.name}이(가) 장바구니에서 제거되었습니다.`
            : "장바구니에서 제거되었습니다.",
        );
      } else {
        toast.success(
          item.name
            ? `${item.name}이(가) 장바구니에 담겼습니다.`
            : "매체가 장바구니에 담겼습니다.",
        );
      }
    },
    [cartIds, toggleCartId, toast],
  );

  const isInCart = useCallback(
    (id: string) => cartIds.includes(id),
    [cartIds],
  );

  const mapDisplayItems = useMemo(
    () => catalogItems.filter(mediaItemHasMapCoordinates),
    [catalogItems],
  );

  const mapSelectedMedia = useMemo(() => {
    if (mapSelectedId == null) return null;
    const mediaId = resolveMediaIdFromMapPinId(mapSelectedId);
    return catalogItems.find((m) => m.id === mediaId) ?? null;
  }, [catalogItems, mapSelectedId]);

  const handleMapSelectId = useCallback((id: string | null) => {
    if (id == null) {
      setMapPopupOpen(false);
      return;
    }
    setMapSelectedId(id);
    setMapPopupOpen(true);
  }, []);

  const compareItems = useMemo(
    () => entriesToCompareMediaItems(compareEntries, catalogItems),
    [compareEntries, catalogItems],
  );

  const resolveRegionMainLabel = useCallback((id: string) => {
    if (!id) return "";
    return MEDIA_BROWSE_REGIONS.find((r) => r.id === id)?.label ?? id;
  }, []);

  const resolveRegionSubLabel = useCallback(
    (mainId: string, subId: string) => {
      if (!subId) return "";
      const main = MEDIA_BROWSE_REGIONS.find((r) => r.id === mainId);
      return main?.sub.find((s) => s.id === subId)?.label ?? subId;
    },
    [],
  );

  const fetchMedia = useCallback(
    async (opts: { page: number; append: boolean }) => {
      if (opts.append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (catalogVariant === "network") {
          if (networkType) params.set("networkType", networkType);
        } else {
          if (mainCategory) params.set("mainCategory", mainCategory);
          if (subCategory) params.set("subCategory", subCategory);
          if (target) params.set("target", target);
          if (features.trim()) params.set("features", features.trim());
        }
        if (regionMain) {
          params.set(
            "regionMain",
            catalogVariant === "network"
              ? resolveRegionMainLabel(regionMain)
              : regionMain,
          );
        }
        if (regionSub) {
          params.set(
            "regionSub",
            catalogVariant === "network"
              ? resolveRegionSubLabel(regionMain, regionSub)
              : regionSub,
          );
        }
        if (priceMin.trim()) params.set("priceMin", priceMin.trim());
        if (priceMax.trim()) params.set("priceMax", priceMax.trim());
        params.set("sort", sort);
        params.set("page", String(opts.page));
        params.set("limit", String(PAGE_SIZE));
        if (plannerMode) params.set("plannerMode", "true");

        const apiPath =
          catalogVariant === "network"
            ? "/api/public/media-network"
            : "/api/public/media";
        const res = await fetch(`${apiPath}?${params}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = (await res.json()) as PublicMediaListResponse;
          const rows = Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.media)
              ? json.media
              : [];
          const items = rows as MediaItem[];
          const mapped = items.map((row) => mapMediaItemToHomeCatalog(row));
          setTotal(json.pagination?.total ?? mapped.length);
          setMedia((prev) => (opts.append ? [...prev, ...mapped] : mapped));
          setCatalogItems((prev) =>
            opts.append ? [...prev, ...items] : items,
          );
          setPage(opts.page);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (opts.append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [
      query,
      catalogVariant,
      networkType,
      mainCategory,
      subCategory,
      target,
      regionMain,
      regionSub,
      priceMin,
      priceMax,
      features,
      sort,
      plannerMode,
      resolveRegionMainLabel,
      resolveRegionSubLabel,
    ],
  );

  const hasMore = media.length < total;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (
        stored === "feed" ||
        stored === "card" ||
        stored === "compact" ||
        stored === "map"
      ) {
        setViewMode(stored);
        return;
      }
      const legacyBrowse = localStorage.getItem("mediaBrowseMode");
      if (legacyBrowse === "map") {
        setViewMode("map");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const updateMapHeight = () => {
      if (typeof window === "undefined") return;
      setMapHeightPx(Math.min(Math.round(window.innerHeight * 0.72), 640));
    };
    updateMapHeight();
    window.addEventListener("resize", updateMapHeight);
    return () => window.removeEventListener("resize", updateMapHeight);
  }, []);

  useEffect(() => {
    if (viewMode !== "map" || mapSelectedId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapPopupOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewMode, mapSelectedId]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    catalogFetchGeneration.current += 1;
    const generation = catalogFetchGeneration.current;
    const debounceMs = generation === 1 ? 0 : 300;
    const timer = setTimeout(() => {
      if (catalogFetchGeneration.current !== generation) return;
      void fetchMedia({ page: 1, append: false });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [fetchMedia]);

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    void fetchMedia({ page: page + 1, append: true });
  };

  const priceLocale = locale.startsWith("ko") ? "ko-KR" : "en-US";
  const renderPrice = (item: HomeCatalogMediaItem) =>
    formatPriceLabel(item.price, item.pricePeriod, priceLocale);

  const getMediaHref = (item: HomeCatalogMediaItem) => {
    const path = mediaItemDetailPath(item.id);
    return `/${locale}${path}`;
  };

  const isKo = locale === "ko";

  const renderMediaCard = (item: HomeCatalogMediaItem) => {
    const href = getMediaHref(item);
    const priceLabel = renderPrice(item);
    const inPlan = plannerSelectedIds.includes(item.id);
    const togglePlan = () => {
      const raw = catalogItems.find((m) => m.id === item.id);
      onPlannerToggleMedia?.(item.id, raw);
    };

    if (viewMode === "compact") {
      const metaLine = [item.region, item.type, priceLabel]
        .filter(Boolean)
        .join(" · ");
      return (
        <MediaCard
          key={item.id}
          mode="compact"
          item={item}
          href={href}
          metaLine={metaLine}
          isKo={isKo}
          inCompare={isInCompare(item.id)}
          inCart={isInCart(item.id)}
          onToggleCompare={() => toggleCompare(item)}
          onToggleCart={() => toggleCart(item)}
          plannerMode={plannerMode}
          isInPlan={inPlan}
          onTogglePlan={plannerMode ? togglePlan : undefined}
        />
      );
    }

    if (viewMode === "card") {
      return (
        <div key={item.id} className="h-full min-h-0">
          <MediaCard
            mode="card"
            item={item}
            href={href}
            priceLabel={priceLabel}
            isKo={isKo}
            className="h-full"
            inCompare={isInCompare(item.id)}
            inCart={isInCart(item.id)}
            onToggleCompare={() => toggleCompare(item)}
            onToggleCart={() => toggleCart(item)}
            plannerMode={plannerMode}
            isInPlan={inPlan}
            onTogglePlan={plannerMode ? togglePlan : undefined}
            showPlanButton={!plannerMode}
          />
        </div>
      );
    }

    const highlights = feedHighlightChips(item);
    const locationLine =
      item.location &&
      item.location !== item.region &&
      !item.location.includes(item.region ?? "")
        ? item.location
        : null;

    return (
      <MediaCard
        key={item.id}
        mode="feed"
        item={item}
        href={href}
        highlights={highlights}
        locationLine={locationLine}
        isKo={isKo}
        inCompare={isInCompare(item.id)}
        inCart={isInCart(item.id)}
        onToggleCompare={() => toggleCompare(item)}
        onToggleCart={() => toggleCart(item)}
        plannerMode={plannerMode}
        isInPlan={inPlan}
        onTogglePlan={plannerMode ? togglePlan : undefined}
        showPlanButton={!plannerMode}
      />
    );
  };

  const scrollToPlannerSelection = useCallback(() => {
    document
      .getElementById("planner-browse-selected-media")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const edgePad = embedded || plannerMode ? "px-0" : "px-4";

  return (
    <>
    <div
      className={cn(
        "min-w-0 w-full max-w-full",
        !embedded && "bg-gray-50 dark:bg-[#020202]",
      )}
    >
      <div className={cn("min-w-0 overflow-x-clip pt-4", edgePad)}>
        <MediaManualBrowseFilters
          isKo={isKo}
          variant={catalogVariant}
          networkType={networkType}
          onNetworkTypeChange={setNetworkType}
          query={query}
          onQueryChange={setQuery}
          mainCategory={mainCategory}
          onMainCategoryChange={setMainCategory}
          subCategory={subCategory}
          onSubCategoryChange={setSubCategory}
          target={target}
          onTargetChange={setTarget}
          regionMain={regionMain}
          onRegionMainChange={setRegionMain}
          regionSub={regionSub}
          onRegionSubChange={setRegionSub}
          priceMin={priceMin}
          onPriceMinChange={setPriceMin}
          priceMax={priceMax}
          onPriceMaxChange={setPriceMax}
          features={features}
          onFeaturesChange={setFeatures}
          sort={sort}
          onSortChange={setSort}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          resultCount={media.length}
          totalCount={total}
          loading={loading}
          compareCount={plannerMode ? 0 : compareEntries.length}
          cartCount={plannerMode ? 0 : cartIds.length}
          selectedCount={plannerMode ? plannerSelectedIds.length : 0}
          selectionVariant={plannerMode ? "plan" : "default"}
          onSelectedSummaryClick={
            plannerMode && plannerSelectedIds.length > 0
              ? scrollToPlannerSelection
              : undefined
          }
        />

        {plannerMode &&
        plannerSelectedIds.length > 0 &&
        onPlannerClearMedia &&
        onPlannerToggleMedia ? (
          <PlannerSelectedMediaBar
            id="planner-browse-selected-media"
            catalog={initialCatalogItems}
            campaignMediaIds={plannerSelectedIds}
            onRemove={onPlannerToggleMedia}
            onClearAll={onPlannerClearMedia}
            isKo={isKo}
            className="mt-3"
          />
        ) : null}
      </div>

      {/* ── 매체 목록 / 지도 ── */}
      {viewMode === "map" ? (
        <div
          className={cn("relative mt-3 min-w-0 overflow-x-clip", edgePad)}
          data-screenshot="media-view-map"
        >
          {loading ? (
            <div
              className="animate-pulse rounded-2xl border border-gray-100 bg-gray-200 dark:border-white/10 dark:bg-white/10"
              style={{ height: mapHeightPx, minHeight: 360 }}
            />
          ) : mapDisplayItems.length === 0 ? (
            <div className="flex min-h-[24rem] flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center dark:border-white/10 dark:bg-white/5">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {isKo
                  ? "지도에 표시할 매체가 없습니다"
                  : "No media with map coordinates"}
              </p>
              <p className="text-sm text-gray-500 dark:text-white/60">
                {isKo
                  ? "필터를 조정하거나 목록 보기로 전환해 보세요"
                  : "Adjust filters or switch to list view"}
              </p>
            </div>
          ) : (
            <div className="relative">
              <MediaBrowseMap
                items={mapDisplayItems}
                locale={locale}
                selectedId={mapSelectedId}
                onSelectId={handleMapSelectId}
                fixedMapHeightPx={mapHeightPx}
                showFooterCaption={false}
              />
              {mapPopupOpen && mapSelectedMedia ? (
                <MediaPinPopup
                  media={mapSelectedMedia}
                  isKo={isKo}
                  isSelected={isInCompare(mapSelectedMedia.id)}
                  onToggleSelect={(id) => {
                    const row = media.find((m) => m.id === id);
                    if (row) toggleCompare(row);
                  }}
                />
              ) : null}
            </div>
          )}
          {hasMore && !loading ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full rounded-2xl border border-gray-200 py-3 text-sm text-gray-500 transition hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:text-white/60 hover:dark:bg-white/5"
              >
                {loadingMore
                  ? isKo
                    ? "불러오는 중…"
                    : "Loading…"
                  : tMedia("loadMoreBrowse")}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
      <>
      <div
        className={cn(
          "mt-3 min-w-0 overflow-x-clip",
          edgePad,
          viewMode === "feed" && "space-y-3",
          viewMode === "card" &&
            cn(
              "grid auto-rows-fr items-stretch gap-3",
              plannerMode
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
            ),
          viewMode === "compact" &&
            "grid grid-cols-1 gap-0.5 sm:grid-cols-2 sm:gap-x-3 lg:grid-cols-4",
        )}
        data-screenshot={`media-view-${viewMode}`}
      >
        {loading ? (
          Array.from({
            length: viewMode === "compact" ? 16 : 6,
          }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "animate-pulse",
                viewMode === "card"
                  ? "overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10"
                  : viewMode === "feed"
                    ? "space-y-3 py-4"
                    : viewMode === "compact"
                      ? "flex min-h-[3rem] items-center gap-2.5"
                      : "flex gap-3",
              )}
            >
              {viewMode === "feed" ? (
                <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 p-4 dark:border-white/10 md:flex-row md:items-stretch">
                  <div className="aspect-[4/3] w-full rounded-xl bg-gray-200 dark:bg-white/10 md:w-[48%] md:aspect-auto md:min-h-[12rem]" />
                  <div className="space-y-2">
                    <div className="h-3 w-12 rounded bg-gray-200 dark:bg-white/10" />
                    <div className="h-5 w-4/5 rounded bg-gray-200 dark:bg-white/10" />
                    <div className="h-16 w-full rounded-xl bg-gray-200 dark:bg-white/10" />
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="h-12 rounded-xl bg-gray-200 dark:bg-white/10" />
                      <div className="h-12 rounded-xl bg-gray-200 dark:bg-white/10" />
                      <div className="h-12 rounded-xl bg-gray-200 dark:bg-white/10" />
                    </div>
                  </div>
                </div>
              ) : viewMode === "compact" ? (
                <>
                  <div className="h-11 w-14 shrink-0 rounded-lg bg-gray-200 dark:bg-white/10" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="h-3 w-4/5 rounded bg-gray-200 dark:bg-white/10" />
                    <div className="h-2.5 w-1/2 rounded bg-gray-200 dark:bg-white/10" />
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      "bg-gray-200 dark:bg-white/10",
                      viewMode === "card"
                        ? "aspect-square w-full"
                        : "h-12 w-16 flex-shrink-0 rounded-xl",
                    )}
                  />
                  {viewMode === "card" ? (
                    <div className="space-y-2 p-3">
                      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-white/10" />
                      <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-white/10" />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ))
        ) : media.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <p className="mb-3 text-4xl">🔍</p>
            <p className="mb-1 font-medium text-gray-500 dark:text-white/50">
              조건에 맞는 매체가 없어요
            </p>
            <p className="mb-4 text-sm text-gray-400 dark:text-white/30">
              필터를 조정해보세요
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setMainCategory("");
                setSubCategory("");
                setTarget("");
                setRegionMain("");
                setRegionSub("");
                setPriceMin("");
                setPriceMax("");
                setFeatures("");
              }}
              className="tkad-home-accent-text text-sm underline"
            >
              필터 초기화
            </button>
          </div>
        ) : (
          media.map((item) => renderMediaCard(item))
        )}
      </div>

      {hasMore && !loading ? (
        <div className={cn("mt-4", edgePad)}>
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full rounded-2xl border border-gray-200 py-3 text-sm text-gray-500 transition hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:text-white/60 hover:dark:bg-white/5"
          >
            {loadingMore
              ? isKo
                ? "불러오는 중…"
                : "Loading…"
              : tMedia("loadMoreBrowse")}
          </button>
        </div>
      ) : null}
      </>
      )}
    </div>

    {!plannerMode ? (
    <CompareBar
      variant="light"
      items={compareItems}
      locale={locale}
      onClear={() => setCompareCartEntries([])}
    />
    ) : null}
    </>
  );
}

export const MediaSearchPage = withSearchParamsSuspense(MediaSearchPageInner);
