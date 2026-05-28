"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Search,
  X,
  List,
  LayoutGrid,
  AlignJustify,
} from "lucide-react";
import { MediaCard } from "@/components/media/media-card";
import CompareBar from "@/components/compare-bar";
import { MediaFilterChipLabel } from "@/components/media/media-filter-chip-label";
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
import {
  MEDIA_CHIP_ACTIVE,
  MEDIA_CHIP_INACTIVE,
  MEDIA_REGION_CHIPS,
  MEDIA_SEARCH_SORT_OPTIONS,
  MEDIA_TARGET_CHIPS,
  MEDIA_TYPE_CHIPS,
} from "@/lib/media-discovery-filter-chips";

const CHIP_ACTIVE = MEDIA_CHIP_ACTIVE;
const CHIP_INACTIVE = MEDIA_CHIP_INACTIVE;
const TYPE_CHIPS = MEDIA_TYPE_CHIPS;
const TARGET_CHIPS = MEDIA_TARGET_CHIPS;
const REGION_CHIPS = MEDIA_REGION_CHIPS;
const SORT_OPTIONS = MEDIA_SEARCH_SORT_OPTIONS;

type ViewMode = "feed" | "card" | "compact";
const VIEW_MODE_STORAGE_KEY = "tkad_media_view_mode";

const VIEW_MODES: { id: ViewMode; label: string; icon: typeof List }[] = [
  { id: "feed", label: "피드", icon: List },
  { id: "card", label: "카드", icon: LayoutGrid },
  { id: "compact", label: "컴팩트", icon: AlignJustify },
];

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
  onPlannerNext?: () => void;
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
  onPlannerNext,
}: Props) {
  const locale = useLocale();
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

  const activeFilterCount = [category, target, region].filter(Boolean).length;

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
        <MediaCard
          key={item.id}
          mode="card"
          item={item}
          href={href}
          priceLabel={priceLabel}
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
      <div className="space-y-3 px-4 pt-4">
        {/* ── 검색창 ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="매체명·지역·유형 검색"
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/35 dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder-white/30"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400 dark:text-white/40" />
            </button>
          ) : null}
        </div>

        {/* ── 매체 유형 칩 ── */}
        <div>
          <p className="tkad-home-accent-text mb-2 text-xs font-bold">
            어떤 매체?
          </p>
          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
            {TYPE_CHIPS.map((chip) => (
              <button
                key={chip.value || "all"}
                type="button"
                onClick={() =>
                  setCategory(category === chip.value ? "" : chip.value)
                }
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                  category === chip.value ? CHIP_ACTIVE : CHIP_INACTIVE,
                )}
              >
                <MediaFilterChipLabel label={chip.label} icon={chip.icon} />
              </button>
            ))}
          </div>
        </div>

        {/* ── 캠페인 목적 칩 ── */}
        <div>
          <p className="mb-2 text-xs font-bold text-pink-600 dark:text-pink-400">
            왜 광고해?
          </p>
          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
            {TARGET_CHIPS.map((chip) => (
              <button
                key={chip.value || "all"}
                type="button"
                onClick={() =>
                  setTarget(target === chip.value ? "" : chip.value)
                }
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  target === chip.value
                    ? "bg-pink-500 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/70"
                }`}
              >
                <MediaFilterChipLabel label={chip.label} icon={chip.icon} />
              </button>
            ))}
          </div>
        </div>

        {/* ── 지역 + 정렬 + 뷰 모드 ── */}
        <div>
          <p className="mb-2 text-xs font-bold text-cyan-600 dark:text-cyan-400">
            어디서?
          </p>
          <div className="flex items-center gap-2">
            <div className="scrollbar-hide flex flex-1 gap-2 overflow-x-auto">
              {REGION_CHIPS.map((chip) => (
                <button
                  key={chip.value || "all"}
                  type="button"
                  onClick={() =>
                    setRegion(region === chip.value ? "" : chip.value)
                  }
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    region === chip.value
                      ? "bg-cyan-500 text-white"
                      : "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/70"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="flex-shrink-0 rounded-xl border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm text-gray-600 focus:outline-none dark:border-white/10 dark:bg-white/8 dark:text-white/70"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div
              className="flex flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10"
              data-screenshot="media-view-mode"
            >
              {VIEW_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleViewModeChange(mode.id)}
                    title={mode.label}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-all",
                      viewMode === mode.id ? CHIP_ACTIVE : CHIP_INACTIVE,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 필터 초기화 ── */}
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              setCategory("");
              setTarget("");
              setRegion("");
            }}
            className="flex items-center gap-1 text-xs text-rose-400"
          >
            <X className="h-3 w-3" />
            필터 초기화 ({activeFilterCount})
          </button>
        ) : null}

        {/* ── 결과 수 ── */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-white/50">
            {loading ? "검색 중..." : `매체 ${media.length}${total > media.length ? ` / ${total}` : ""}개`}
          </p>
          <div className="flex items-center gap-2 text-xs">
            {cartIds.length > 0 ? (
              <span className="tkad-home-accent-text font-medium">
                담김 {cartIds.length}
              </span>
            ) : null}
            {compareEntries.length > 0 ? (
              <span className="font-medium text-gray-700 dark:text-white">
                선택 {compareEntries.length}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── 매체 목록 ── */}
      <div
        className={cn(
          "mt-3 px-4",
          viewMode === "feed" && "space-y-3",
          viewMode === "card" &&
            "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4",
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
            {loadingMore ? "불러오는 중…" : "더 많은 매체 보기"}
          </button>
        </div>
      ) : null}
    </div>

    {plannerMode ? (
      <div className="sticky bottom-0 z-20 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-white">
            {isKo
              ? `담긴 매체 ${plannerSelectedIds.length}개`
              : `${plannerSelectedIds.length} in plan`}
          </p>
          <button
            type="button"
            onClick={onPlannerNext}
            disabled={plannerSelectedIds.length === 0}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {isKo ? "다음 →" : "Next →"}
          </button>
        </div>
      </div>
    ) : null}

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
