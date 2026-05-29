"use client";

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

function catalogItemToMediaItem(item: HomeCatalogMediaItem): MediaItem {
  return {
    id: item.id,
    name: item.name,
    nameEn: item.name,
    location: item.region ?? "",
    locationEn: item.region ?? "",
    region: "seoul",
    type: "digital",
    price: item.price ?? 0,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: item.thumbnailUrl ? [item.thumbnailUrl] : [],
  };
}

interface Props {
  initialMedia: HomeCatalogMediaItem[];
  initialTotal?: number;
  initialCategory?: string;
  initialTarget?: string;
  initialRegion?: string;
  /** 플래너 Step 4 임베드 — 동일 카드 + 플랜 담기 */
  plannerMode?: boolean;
  embedded?: boolean;
  plannerSelectedIds?: string[];
  onPlannerToggleMedia?: (mediaId: string) => void;
}

function MediaSearchPageInner({
  initialMedia,
  initialTotal,
  initialCategory,
  initialTarget,
  initialRegion,
  plannerMode = false,
  embedded = false,
  plannerSelectedIds = [],
  onPlannerToggleMedia,
}: Props) {
  const locale = useLocale();
  const tMedia = useTranslations("media");
  const searchParams = useSearchParams();
  const toast = useAppToast();
  const { ids: cartIds, toggle: toggleCartId } = useCart();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory || "");
  const [target, setTarget] = useState(initialTarget || "");
  const [region, setRegion] = useState(initialRegion || "");
  const [sort, setSort] = useState("popular");
  const [viewMode, setViewMode] = useState<ViewMode>("feed");
  const [media, setMedia] = useState<HomeCatalogMediaItem[]>(initialMedia);
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
    setCategory(searchParams.get("category") ?? "");
    setTarget(searchParams.get("target") ?? "");
    setRegion(searchParams.get("region") ?? "");
  }, [searchParams]);

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

  const searchCatalog = useMemo<MediaItem[]>(
    () => media.map(catalogItemToMediaItem),
    [media],
  );

  const compareItems = useMemo(
    () => entriesToCompareMediaItems(compareEntries, searchCatalog),
    [compareEntries, searchCatalog],
  );

  const fetchMedia = useCallback(
    async (opts: { page: number; append: boolean }) => {
      if (opts.append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (category) params.set("category", category);
        if (target) params.set("target", target);
        if (region) params.set("region", region);
        params.set("sort", sort);
        params.set("page", String(opts.page));
        params.set("limit", String(PAGE_SIZE));
        if (plannerMode) params.set("plannerMode", "true");

        const res = await fetch(`/api/public/media?${params}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = (await res.json()) as PublicMediaListResponse;
          const rows = Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.media)
              ? json.media
              : [];
          const mapped = rows.map((row) =>
            mapMediaItemToHomeCatalog(row as MediaItem),
          );
          setTotal(json.pagination?.total ?? mapped.length);
          setMedia((prev) => (opts.append ? [...prev, ...mapped] : mapped));
          setPage(opts.page);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (opts.append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [query, category, target, region, sort, plannerMode],
  );

  const hasMore = media.length < total;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (stored === "feed" || stored === "card" || stored === "compact") {
        setViewMode(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

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

  const getMediaHref = (item: HomeCatalogMediaItem) =>
    item.slug
      ? `/${locale}/media/${item.slug}`
      : `/${locale}/media/${item.id}`;

  const isKo = locale === "ko";

  const renderMediaCard = (item: HomeCatalogMediaItem) => {
    const href = getMediaHref(item);
    const priceLabel = renderPrice(item);
    const inPlan = plannerSelectedIds.includes(item.id);
    const togglePlan = () => onPlannerToggleMedia?.(item.id);

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

  return (
    <>
    <div className={cn(!embedded && "bg-gray-50 dark:bg-[#020202]")}>
      <div className="min-w-0 overflow-x-clip px-4 pt-4">
        <MediaManualBrowseFilters
          isKo={isKo}
          query={query}
          onQueryChange={setQuery}
          category={category}
          onCategoryChange={setCategory}
          target={target}
          onTargetChange={setTarget}
          region={region}
          onRegionChange={setRegion}
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
        />
      </div>

      {/* ── 매체 목록 ── */}
      <div
        className={cn(
          "mt-3 px-4",
          viewMode === "feed" && "space-y-3",
          viewMode === "card" &&
            "grid auto-rows-fr grid-cols-2 items-stretch gap-3 md:grid-cols-3 lg:grid-cols-4",
          viewMode === "compact" &&
            "grid grid-cols-1 gap-0.5 sm:grid-cols-2 sm:gap-x-3 lg:grid-cols-3 xl:grid-cols-4",
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
                setCategory("");
                setTarget("");
                setRegion("");
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
        <div className="mt-4 px-4">
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
