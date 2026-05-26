"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import {
  Search,
  Star,
  CheckCircle,
  X,
  List,
  LayoutGrid,
  AlignJustify,
} from "lucide-react";
import CompareBar from "@/components/compare-bar";
import { MediaFilterChipLabel } from "@/components/media/media-filter-chip-label";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import { typeLabels, type MediaItem, type MediaPriceOption } from "@/lib/media-data";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog";
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
import {
  formatMediaPriceWithPeriodSuffix,
  normalizeMediaPricePeriod,
  resolveMediaDisplayPrice,
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

function mapApiMediaItem(raw: Record<string, unknown>): HomeCatalogMediaItem {
  const price = typeof raw.price === "number" ? raw.price : 0;
  const sampleImages = Array.isArray(raw.sampleImages)
    ? raw.sampleImages.filter((x): x is string => typeof x === "string")
    : [];
  const image =
    typeof raw.image === "string"
      ? raw.image
      : sampleImages[0] ?? undefined;
  const typeKey = typeof raw.type === "string" ? raw.type : "";
  const typeLabel = typeLabels[typeKey as keyof typeof typeLabels]?.ko ?? typeKey;

  const priceOptions = Array.isArray(raw.priceOptions)
    ? (raw.priceOptions as MediaPriceOption[])
    : undefined;
  const display = resolveMediaDisplayPrice({
    price,
    pricePeriod: normalizeMediaPricePeriod(
      typeof raw.pricePeriod === "string" ? raw.pricePeriod : undefined,
    ),
    priceOptions,
  });

  const item = {
    id: String(raw.id ?? ""),
    slug: typeof raw.slug === "string" ? raw.slug : undefined,
    name: String(raw.name ?? ""),
    type: typeKey,
    region:
      (typeof raw.region === "string" && raw.region) ||
      (typeof raw.district === "string" && raw.district) ||
      (typeof raw.city === "string" && raw.city) ||
      undefined,
    price,
    image,
    sampleImages,
    pricePeriod:
      typeof raw.pricePeriod === "string" ? raw.pricePeriod : undefined,
    availability:
      typeof raw.availability === "string" ? raw.availability : undefined,
    catalogSource:
      typeof raw.catalogSource === "string" ? raw.catalogSource : undefined,
    averageRating:
      typeof raw.averageRating === "number" ? raw.averageRating : undefined,
    reviewCount:
      typeof raw.reviewCount === "number" ? raw.reviewCount : undefined,
  };

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    type: typeLabel,
    region: item.region,
    location:
      (typeof raw.location === "string" && raw.location.trim()) || undefined,
    size: (typeof raw.size === "string" && raw.size.trim()) || undefined,
    dailyFootTraffic:
      typeof raw.dailyFootTraffic === "number" && raw.dailyFootTraffic > 0
        ? raw.dailyFootTraffic
        : undefined,
    visibilityScore:
      typeof raw.visibilityScore === "number" && raw.visibilityScore > 0
        ? raw.visibilityScore
        : undefined,
    features:
      (typeof raw.features === "string" && raw.features.trim()) ||
      (typeof raw.catalogDescription === "string" &&
        raw.catalogDescription.trim()) ||
      (typeof raw.description === "string" && raw.description.trim()) ||
      undefined,
    advertiserHistory:
      (typeof raw.advertiserHistory === "string" &&
        raw.advertiserHistory.trim()) ||
      undefined,
    price: display.priceWon > 0 ? display.priceWon : undefined,
    pricePeriod: display.period,
    thumbnailUrl: item.image,
    reviewAvg: item.averageRating,
    reviewCount: item.reviewCount,
    isInstantBooking: isInstantBookingEligible({
      type: item.type,
      price: item.price,
      pricePeriod: item.pricePeriod as "month" | "week" | "day" | "biweekly" | undefined,
      availability: item.availability as
        | "available"
        | "reserved"
        | "maintenance"
        | undefined,
      catalogSource: item.catalogSource as "network" | undefined,
    }).eligible,
  };
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
}

export function MediaSearchPage({
  initialMedia,
  initialTotal,
  initialCategory,
  initialTarget,
  initialRegion,
}: Props) {
  const locale = useLocale();
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
  const [initialLoad, setInitialLoad] = useState(true);
  const [compareEntries, setCompareEntriesState] = useState<CompareCartEntry[]>(
    [],
  );

  useEffect(() => {
    setCompareEntriesState(getCompareCartEntries());
    return subscribeCompareCart(() => {
      setCompareEntriesState(getCompareCartEntries());
    });
  }, []);

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

        const res = await fetch(`/api/public/media?${params}`);
        if (res.ok) {
          const json = (await res.json()) as {
            data?: Record<string, unknown>[];
            media?: Record<string, unknown>[];
            pagination?: { total?: number };
          };
          const rows = Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.media)
              ? json.media
              : [];
          const mapped = rows.map((row) => mapApiMediaItem(row));
          setTotal(json.pagination?.total ?? mapped.length);
          setMedia((prev) => (opts.append ? [...prev, ...mapped] : mapped));
          setPage(opts.page);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (opts.append) setLoadingMore(false);
        else setLoading(false);
        setInitialLoad(false);
      }
    },
    [query, category, target, region, sort],
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
    if (initialLoad) {
      setInitialLoad(false);
      return;
    }
    const timer = setTimeout(() => {
      void fetchMedia({ page: 1, append: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchMedia, initialLoad]);

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    void fetchMedia({ page: page + 1, append: true });
  };

  const priceLocale = locale.startsWith("ko") ? "ko-KR" : "en-US";
  const renderPrice = (item: HomeCatalogMediaItem) =>
    formatPriceLabel(item.price, item.pricePeriod, priceLocale);

  const activeFilterCount = [category, target, region].filter(Boolean).length;

  const getMediaHref = (item: HomeCatalogMediaItem) =>
    item.slug ? `/ko/media/${item.slug}` : `/ko/media/${item.id}`;

  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-[#020202]">
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
          viewMode === "feed" && "space-y-4",
          viewMode === "card" &&
            "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4",
          viewMode === "compact" && "divide-y divide-gray-100 dark:divide-white/5",
        )}
        data-screenshot={`media-view-${viewMode}`}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "animate-pulse",
                viewMode === "card"
                  ? "overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10"
                  : "flex gap-3",
              )}
            >
              {viewMode !== "compact" ? (
                <div
                  className={cn(
                    "bg-gray-200 dark:bg-white/10",
                    viewMode === "card"
                      ? "aspect-square w-full"
                      : viewMode === "feed"
                        ? "h-36 w-36 flex-shrink-0 rounded-xl md:h-44 md:w-44"
                        : "h-12 w-16 flex-shrink-0 rounded-xl",
                  )}
                />
              ) : (
                <div className="h-12 w-16 flex-shrink-0 rounded-xl bg-gray-200 dark:bg-white/10" />
              )}
              <div
                className={cn(
                  "space-y-2",
                  viewMode === "card" ? "p-3" : "flex-1 pt-1",
                )}
              >
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-white/10" />
              </div>
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
        ) : viewMode === "card" ? (
          media.map((item) => {
            const href = getMediaHref(item);
            return (
              <Link
                key={item.id}
                href={href}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-white/5"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.name}
                      fill
                      className="rounded-t-2xl object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-300 dark:text-white/20">
                      준비중
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-white/40">
                    {[item.region, item.type].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {renderPrice(item) ? (
                      <p className="tkad-home-accent-text text-sm font-bold">
                        {renderPrice(item)}
                      </p>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-1">
                      <MediaCompareSelectButton
                        selected={isInCompare(item.id)}
                        onToggle={() => toggleCompare(item)}
                      />
                      <MediaCartAddButton
                        inCart={isInCart(item.id)}
                        onToggle={() => toggleCart(item)}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        ) : viewMode === "compact" ? (
          media.map((item) => {
            const href = getMediaHref(item);
            const meta = [item.region, item.type, renderPrice(item)]
              .filter(Boolean)
              .join(" · ");
            return (
              <Link
                key={item.id}
                href={href}
                className="flex items-center gap-2.5 border-b border-gray-100 py-2.5 dark:border-white/5"
              >
                <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-300 dark:text-white/20">
                      준비중
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </p>
                  <p className="truncate text-xs text-gray-400 dark:text-white/40">
                    {meta}
                  </p>
                </div>
                <MediaCompareSelectButton
                  selected={isInCompare(item.id)}
                  onToggle={() => toggleCompare(item)}
                  className="flex-shrink-0"
                />
                <MediaCartAddButton
                  inCart={isInCart(item.id)}
                  onToggle={() => toggleCart(item)}
                  className="flex-shrink-0"
                />
                {item.isInstantBooking ? (
                  <span className="flex-shrink-0 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    즉시예약
                  </span>
                ) : null}
              </Link>
            );
          })
        ) : (
          media.map((item, idx) => {
            const href = getMediaHref(item);
            const highlights = feedHighlightChips(item);
            const locationLine =
              item.location &&
              item.location !== item.region &&
              !item.location.includes(item.region ?? "")
                ? item.location
                : null;
            return (
              <Link
                key={item.id}
                href={href}
                className="flex gap-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-white/5 md:gap-6"
              >
                <div className="relative h-36 w-36 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 md:h-44 md:w-44">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 144px, 176px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-300 dark:text-white/20">
                      준비중
                    </div>
                  )}
                  {idx < 3 ? (
                    <div
                      className={`absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white ${
                        idx === 0
                          ? "bg-amber-500"
                          : idx === 1
                            ? "bg-gray-400"
                            : "bg-amber-700"
                      }`}
                    >
                      {idx + 1}
                    </div>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 py-0.5">
                  <div className="mb-1.5 flex items-start gap-1.5">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
                    <p className="line-clamp-2 text-lg font-bold leading-snug text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                  </div>
                  <p className="mb-2 text-sm text-gray-500 dark:text-white/45">
                    {[item.region, item.type].filter(Boolean).join(" · ")}
                  </p>
                  {locationLine ? (
                    <p className="mb-2 line-clamp-1 text-sm text-gray-500 dark:text-white/45">
                      {locationLine}
                    </p>
                  ) : null}
                  {highlights.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {highlights.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/8 dark:text-white/65"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {item.features ? (
                    <p className="mb-2 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-white/55">
                      {item.features}
                    </p>
                  ) : null}
                  {item.advertiserHistory ? (
                    <p className="mb-2 line-clamp-1 text-xs text-gray-400 dark:text-white/35">
                      집행 {item.advertiserHistory}
                    </p>
                  ) : null}
                  {item.reviewAvg && item.reviewAvg > 0 ? (
                    <div className="mb-3 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm text-gray-500 dark:text-white/50">
                        {item.reviewAvg.toFixed(1)}
                        {item.reviewCount ? ` (${item.reviewCount})` : ""}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      {renderPrice(item) ? (
                        <p className="tkad-home-accent-text text-lg font-bold">
                          {renderPrice(item)}
                        </p>
                      ) : null}
                      {item.isInstantBooking ? (
                        <span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          즉시예약
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <MediaCompareSelectButton
                        selected={isInCompare(item.id)}
                        onToggle={() => toggleCompare(item)}
                      />
                      <MediaCartAddButton
                        inCart={isInCart(item.id)}
                        onToggle={() => toggleCart(item)}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
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

    <CompareBar
      variant="light"
      items={compareItems}
      locale={locale}
      onClear={() => setCompareCartEntries([])}
    />
    </>
  );
}
