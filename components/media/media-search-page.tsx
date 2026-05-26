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
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import { FLOATING_SELECTION_BAR_COMPACT_SPACER_CLASS } from "@/components/floating-selection-bar";
import { typeLabels, type MediaItem } from "@/lib/media-data";
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

function formatPrice(price?: number) {
  if (!price) return null;
  const man = Math.round(price / 10000);
  if (man >= 10000) return `₩${(man / 10000).toFixed(1)}억`;
  return `₩${man.toLocaleString()}만`;
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
    price: item.price > 0 ? item.price : undefined,
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
  initialCategory?: string;
  initialTarget?: string;
  initialRegion?: string;
}

export function MediaSearchPage({
  initialMedia,
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
  const [loading, setLoading] = useState(false);
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

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      if (target) params.set("target", target);
      if (region) params.set("region", region);
      params.set("sort", sort);
      params.set("limit", "30");

      const res = await fetch(`/api/public/media?${params}`);
      if (res.ok) {
        const json = (await res.json()) as {
          data?: Record<string, unknown>[];
          media?: Record<string, unknown>[];
        };
        const rows = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.media)
            ? json.media
            : [];
        setMedia(rows.map((row) => mapApiMediaItem(row)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [query, category, target, region, sort]);

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
    const timer = setTimeout(fetchMedia, 300);
    return () => clearTimeout(timer);
  }, [fetchMedia, initialLoad]);

  const activeFilterCount = [category, target, region].filter(Boolean).length;

  const getMediaHref = (item: HomeCatalogMediaItem) =>
    item.slug ? `/ko/media/${item.slug}` : `/ko/media/${item.id}`;

  return (
    <>
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-[#020202]">
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
                {chip.icon ? `${chip.icon} ` : ""}
                {chip.label}
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
                {chip.icon ? `${chip.icon} ` : ""}
                {chip.label}
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
            {loading ? "검색 중..." : `매체 ${media.length}개`}
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
                      ? "h-32 w-full"
                      : viewMode === "feed"
                        ? "h-28 w-32 flex-shrink-0 rounded-xl"
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
                <div className="relative h-32 w-full bg-gray-100 dark:bg-gray-800">
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
                    {formatPrice(item.price) ? (
                      <p className="tkad-home-accent-text text-sm font-bold">
                        {formatPrice(item.price)}/월
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
            const meta = [item.region, item.type, formatPrice(item.price)]
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
                    {formatPrice(item.price) ? "/월" : ""}
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
            return (
              <Link
                key={item.id}
                href={href}
                className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-white/5"
              >
                <div className="relative h-28 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-300 dark:text-white/20">
                      준비중
                    </div>
                  )}
                  {idx < 3 ? (
                    <div
                      className={`absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-md text-xs font-bold text-white ${
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

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-blue-400" />
                    <p className="truncate text-base font-bold text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                  </div>
                  <p className="mb-2 text-sm text-gray-400 dark:text-white/40">
                    {[item.region, item.type].filter(Boolean).join(" · ")}
                  </p>
                  {item.reviewAvg && item.reviewAvg > 0 ? (
                    <div className="mb-2 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm text-gray-500 dark:text-white/50">
                        {item.reviewAvg.toFixed(1)}
                        {item.reviewCount ? ` (${item.reviewCount})` : ""}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {formatPrice(item.price) ? (
                        <p className="tkad-home-accent-text text-base font-bold">
                          {formatPrice(item.price)}/월
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

      {media.length >= 30 && !loading ? (
        <div className="mt-4 px-4">
          <button
            type="button"
            className="w-full rounded-2xl border border-gray-200 py-3 text-sm text-gray-500 transition hover:bg-gray-50 dark:border-white/10 dark:text-white/60 hover:dark:bg-white/5"
          >
            더 많은 매체 보기
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
    {compareEntries.length > 0 ? (
      <div className={FLOATING_SELECTION_BAR_COMPACT_SPACER_CLASS} aria-hidden />
    ) : null}
    </>
  );
}
