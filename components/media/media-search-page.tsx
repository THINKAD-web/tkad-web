"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { DiscoveryMediaCard } from "@/components/discovery/media-card";
import {
  DiscoveryFilterBar,
  DiscoveryEmptyState,
  type DiscoveryFilterBarViewMode,
  type MediaMobileViewSegment,
} from "@/components/discovery/filter-bar";
import CompareBar from "@/components/compare-bar";
import { MediaBrowseStickyBar } from "@/components/media/media-browse-sticky-bar";
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
import { usePlanCart } from "@/hooks/use-plan-cart";
import { useAppToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import { withSearchParamsSuspense } from "@/components/with-search-params-suspense";
import {
  MediaBrowsePageSkeleton,
  MediaCardSkeleton,
  MediaCardSkeletonGrid,
} from "@/components/media/media-card-skeleton";

function subscribeLg(cb: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useLgUp() {
  return useSyncExternalStore(
    subscribeLg,
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}
import { compareMediaByMonthlyEquivalentPrice } from "@/lib/media-metrics";
import {
  formatMediaPriceWithPeriodSuffix,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";
import { resolveBrowseCategoryParams } from "@/lib/media-browse-categories";
import {
  filterMediaByDiscoveryChips,
  discoveryFeaturesIncludeNetwork,
} from "@/lib/media-discovery-client-filter";
import { mediaItemDetailPath } from "@/lib/media-slug";
import { useRouter, Link } from "@/i18n/navigation";
import {
  buildMediaBrowseQueryString,
  type MediaBrowseFilterQueryState,
} from "@/lib/media-browse-query-string";
import {
  MEDIA_BROWSE_CARD_GRID_CLASS,
} from "@/lib/media-browse-grid";
import { MediaReelsBrowse } from "@/components/media/media-reels-browse";
import {
  DiscoveryMediaFeedCardSkeleton,
} from "@/components/discovery/discovery-route-skeletons";
import {
  mediaItemHasMapCoordinates,
  resolveMediaIdFromMapPinId,
} from "@/lib/media-detail-map-markers";

const MediaBrowseMap = dynamic(() => import("@/components/media-browse-map"), {
  ssr: false,
});

type ViewMode = DiscoveryFilterBarViewMode;
const VIEW_MODE_STORAGE_KEY = "tkad_media_view_mode";

const PAGE_SIZE = 30;
/** 플래너 Step 4 임베드 — 초기·더보기 단위 (짧은 목록) */
const PLANNER_EMBEDDED_PAGE_SIZE = 12;
/** 플래너 임베드에서 한 번에 보여줄 최대 매체 수 */
const PLANNER_EMBEDDED_MAX_ITEMS = 36;

function slicePlannerEmbeddedCatalog<T>(items: T[], page: number): T[] {
  const end = Math.min(page * PLANNER_EMBEDDED_PAGE_SIZE, PLANNER_EMBEDDED_MAX_ITEMS);
  return items.slice(0, end);
}

function plannerEmbeddedHasMore(
  shown: number,
  total: number,
): boolean {
  return shown < total && shown < PLANNER_EMBEDDED_MAX_ITEMS;
}

type BrowseFilterUrlState = MediaBrowseFilterQueryState;

function readBrowseFilterStateFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
  opts: {
    catalogVariant?: "media" | "network";
    initialCategory?: string;
    initialTarget?: string;
    initialNetworkType?: string;
  },
): BrowseFilterUrlState {
  const legacyCat = searchParams.get("category") ?? opts.initialCategory ?? "";
  const resolved = resolveBrowseCategoryParams({
    mainCategory: searchParams.get("mainCategory"),
    subCategory: searchParams.get("subCategory"),
    category: legacyCat,
  });
  const sortParam = searchParams.get("sort");
  return {
    query: searchParams.get("q") ?? "",
    mainCategory: resolved.mainCategory ?? "",
    subCategory: resolved.subCategory ?? "",
    target: searchParams.get("target") ?? opts.initialTarget ?? "",
    regionMain: searchParams.get("regionMain") ?? "",
    regionSub: searchParams.get("regionSub") ?? "",
    priceMin: searchParams.get("priceMin") ?? "",
    priceMax: searchParams.get("priceMax") ?? "",
    features: searchParams.get("features") ?? "",
    sort: sortParam ?? "popular",
    catalogVariant: opts.catalogVariant ?? "media",
    networkType: searchParams.get("networkType") ?? opts.initialNetworkType ?? "",
  };
}

function applyBrowseFilterUrlState(
  state: BrowseFilterUrlState,
  setters: {
    setQuery: (v: string) => void;
    setMainCategory: (v: string) => void;
    setSubCategory: (v: string) => void;
    setTarget: (v: string) => void;
    setRegionMain: (v: string) => void;
    setRegionSub: (v: string) => void;
    setPriceMin: (v: string) => void;
    setPriceMax: (v: string) => void;
    setFeatures: (v: string) => void;
    setSort: (v: string) => void;
    setNetworkType: (v: string) => void;
  },
) {
  setters.setQuery(state.query);
  setters.setMainCategory(state.mainCategory);
  setters.setSubCategory(state.subCategory);
  setters.setTarget(state.target);
  setters.setRegionMain(state.regionMain);
  setters.setRegionSub(state.regionSub);
  setters.setPriceMin(state.priceMin);
  setters.setPriceMax(state.priceMax);
  setters.setFeatures(state.features);
  setters.setSort(state.sort);
  setters.setNetworkType(state.networkType);
}

/** `fetchMedia` URL 파라미터 직렬화 — SSR skip 비교용 */
function buildMediaBrowseFetchKey(input: {
  query: string;
  networkBrowse: boolean;
  networkType: string;
  mainCategory: string;
  subCategory: string;
  target: string;
  regionMain: string;
  regionSub: string;
  priceMin: string;
  priceMax: string;
  features: string;
  sort: string;
  page: number;
  limit?: number;
}): string {
  const params = new URLSearchParams();
  if (input.query) params.set("q", input.query);
  if (input.networkBrowse) {
    params.set("features", input.features.trim() || "network");
    if (input.networkType) params.set("networkType", input.networkType);
  } else {
    if (input.mainCategory) params.set("mainCategory", input.mainCategory);
    if (input.subCategory) params.set("subCategory", input.subCategory);
    if (input.target) params.set("target", input.target);
    if (input.features.trim()) params.set("features", input.features.trim());
  }
  if (input.regionMain) params.set("regionMain", input.regionMain);
  if (input.regionSub) params.set("regionSub", input.regionSub);
  if (input.priceMin.trim()) params.set("priceMin", input.priceMin.trim());
  if (input.priceMax.trim()) params.set("priceMax", input.priceMax.trim());
  params.set("sort", input.sort);
  params.set("page", String(input.page));
  params.set("limit", String(input.limit ?? PAGE_SIZE));
  return params.toString();
}

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
  /** @deprecated 네트워크 목록은 `/media?features=network` — 리다이렉트 호환만 */
  catalogVariant?: "media" | "network";
  initialNetworkType?: string;
  /** `/media` 전용 — 고정 앱 셸(히어로/푸터 제거, 내부 스크롤). 이 라우트에서만 true */
  appShell?: boolean;
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
  appShell: appShellEnabled = false,
  plannerMode = false,
  embedded = false,
  plannerSelectedIds = [],
  onPlannerToggleMedia,
  onPlannerClearMedia,
}: Props) {
  const locale = useLocale();
  const tMedia = useTranslations("media");
  const lgUp = useLgUp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useAppToast();
  const { count: planCount } = usePlanCart();

  const initialFromUrl = useMemo(
    () =>
      readBrowseFilterStateFromSearchParams(searchParams, {
        catalogVariant,
        initialCategory,
        initialTarget,
        initialNetworkType,
      }),
    [
      searchParams,
      catalogVariant,
      initialCategory,
      initialTarget,
      initialNetworkType,
    ],
  );

  /** SSR `page.tsx` 와 동일 조건이면 mount fetch skip */
  const mountSsrFetchKey = useMemo(
    () =>
      buildMediaBrowseFetchKey({
        ...initialFromUrl,
        networkBrowse:
          discoveryFeaturesIncludeNetwork(initialFromUrl.features) ||
          catalogVariant === "network",
        page: 1,
      }),
    [initialFromUrl, catalogVariant],
  );

  const [query, setQuery] = useState(initialFromUrl.query);
  const [mainCategory, setMainCategory] = useState(initialFromUrl.mainCategory);
  const [subCategory, setSubCategory] = useState(initialFromUrl.subCategory);
  const [target, setTarget] = useState(initialFromUrl.target);
  const [regionMain, setRegionMain] = useState(initialFromUrl.regionMain);
  const [regionSub, setRegionSub] = useState(initialFromUrl.regionSub);
  const [priceMin, setPriceMin] = useState(initialFromUrl.priceMin);
  const [priceMax, setPriceMax] = useState(initialFromUrl.priceMax);
  const [features, setFeatures] = useState(initialFromUrl.features);
  const [networkType, setNetworkType] = useState(initialFromUrl.networkType);
  const [sort, setSort] = useState(initialFromUrl.sort);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (plannerMode) return "card";
    const urlView = searchParams.get("view");
    if (urlView === "reels") return "reels";
    return "card";
  });
  const networkBrowse = useMemo(
    () =>
      discoveryFeaturesIncludeNetwork(features) || catalogVariant === "network",
    [features, catalogVariant],
  );
  const [media, setMedia] = useState<HomeCatalogMediaItem[]>(() => {
    if (plannerMode && embedded && initialMedia.length > PLANNER_EMBEDDED_PAGE_SIZE) {
      return initialMedia.slice(0, PLANNER_EMBEDDED_PAGE_SIZE);
    }
    return initialMedia;
  });
  const [catalogItems, setCatalogItems] =
    useState<MediaItem[]>(() => {
      if (
        plannerMode &&
        embedded &&
        initialCatalogItems.length > PLANNER_EMBEDDED_PAGE_SIZE
      ) {
        return initialCatalogItems.slice(0, PLANNER_EMBEDDED_PAGE_SIZE);
      }
      return initialCatalogItems;
    });
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [mapPopupOpen, setMapPopupOpen] = useState(false);
  const [mapHeightPx, setMapHeightPx] = useState(520);
  const [total, setTotal] = useState(initialTotal ?? initialMedia.length);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(
    () => !plannerMode && initialMedia.length === 0,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const catalogFetchGeneration = useRef(0);
  const mediaCountRef = useRef(0);
  mediaCountRef.current = media.length;
  /** replaceState 로 쓴 쿼리 — popstate 외 URL→state 역동기화 방지 */
  const lastPushedBrowseQueryRef = useRef<string | null>(null);
  const browseFilterSettersRef = useRef({
    setQuery,
    setMainCategory,
    setSubCategory,
    setTarget,
    setRegionMain,
    setRegionSub,
    setPriceMin,
    setPriceMax,
    setFeatures,
    setSort,
    setNetworkType,
  });
  browseFilterSettersRef.current = {
    setQuery,
    setMainCategory,
    setSubCategory,
    setTarget,
    setRegionMain,
    setRegionSub,
    setPriceMin,
    setPriceMax,
    setFeatures,
    setSort,
    setNetworkType,
  };
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
    if (plannerMode || embedded) return;
    const applyFromWindowUrl = () => {
      if (typeof window === "undefined") return;
      const incoming = window.location.search.replace(/^\?/, "");
      if (incoming === (lastPushedBrowseQueryRef.current ?? "")) return;
      const sp = new URLSearchParams(window.location.search);
      const next = readBrowseFilterStateFromSearchParams(sp, {
        catalogVariant,
        initialCategory,
        initialTarget,
        initialNetworkType,
      });
      applyBrowseFilterUrlState(next, browseFilterSettersRef.current);
      lastPushedBrowseQueryRef.current = buildMediaBrowseQueryString({
        query: next.query,
        mainCategory: next.mainCategory,
        subCategory: next.subCategory,
        target: next.target,
        regionMain: next.regionMain,
        regionSub: next.regionSub,
        priceMin: next.priceMin,
        priceMax: next.priceMax,
        features: next.features,
        sort: next.sort,
        catalogVariant: next.catalogVariant,
        networkType: next.networkType,
      });
    };

    lastPushedBrowseQueryRef.current = buildMediaBrowseQueryString({
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
    });

    window.addEventListener("popstate", applyFromWindowUrl);
    return () => window.removeEventListener("popstate", applyFromWindowUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + back/forward only
  }, []);

  useEffect(() => {
    if (plannerMode || embedded) return;
    const qs = buildMediaBrowseQueryString({
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
    });
    lastPushedBrowseQueryRef.current = qs;
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    const cur = window.location.search.replace(/^\?/, "");
    if (cur === qs) return;
    const url = qs ? `${path}?${qs}` : path;
    try {
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* noop */
    }
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

  const openCompareSummary = useCallback(() => {
    const ids = compareEntries.map((e) => e.id).join(",");
    if (!ids) return;
    router.push(`/compare?ids=${ids}`);
  }, [compareEntries, router]);

  const fetchMedia = useCallback(
    async (
      opts: { page: number; append: boolean },
      fetchGeneration: number,
    ) => {
      const isStale = () => catalogFetchGeneration.current !== fetchGeneration;

      if (opts.append) setLoadingMore(true);
      else setLoading(true);
      try {
        if (plannerMode) {
          const source = initialCatalogItems;
          const filtered = filterMediaByDiscoveryChips(source, {
            mainCategory,
            subCategory,
            target,
            regionMain,
            regionSub,
            priceMin,
            priceMax,
            features,
            query: query.trim(),
          });
          const sorted = [...filtered].sort((a, b) => {
            if (sort === "price_asc") {
              return compareMediaByMonthlyEquivalentPrice(a, b, "asc");
            }
            if (sort === "price_desc") {
              return compareMediaByMonthlyEquivalentPrice(a, b, "desc");
            }
            return (b.dailyFootTraffic ?? 0) - (a.dailyFootTraffic ?? 0);
          });
          const pageSize =
            embedded ? PLANNER_EMBEDDED_PAGE_SIZE : PAGE_SIZE;
          const slice = embedded
            ? slicePlannerEmbeddedCatalog(sorted, opts.page)
            : sorted.slice(0, opts.page * pageSize);
          const mapped = slice.map((row) => mapMediaItemToHomeCatalog(row));
          if (isStale()) return;
          setTotal(sorted.length);
          setMedia(mapped);
          setCatalogItems(slice);
          setPage(opts.page);
          return;
        }

        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (networkBrowse) {
          params.set("features", features.trim() || "network");
          if (networkType) params.set("networkType", networkType);
        } else {
          if (mainCategory) params.set("mainCategory", mainCategory);
          if (subCategory) params.set("subCategory", subCategory);
          if (target) params.set("target", target);
          if (features.trim()) params.set("features", features.trim());
        }
        if (regionMain) params.set("regionMain", regionMain);
        if (regionSub) params.set("regionSub", regionSub);
        if (priceMin.trim()) params.set("priceMin", priceMin.trim());
        if (priceMax.trim()) params.set("priceMax", priceMax.trim());
        params.set("sort", sort);
        params.set("page", String(opts.page));
        params.set("limit", String(PAGE_SIZE));
        if (plannerMode) params.set("plannerMode", "true");

        const res = await fetch(`/api/public/media?${params}`, {
          cache: "no-store",
        });
        if (isStale()) return;
        if (res.ok) {
          const json = (await res.json()) as PublicMediaListResponse;
          if (isStale()) return;
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
        if (isStale()) return;
        if (opts.append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [
      query,
      networkBrowse,
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
      initialCatalogItems,
      embedded,
    ],
  );

  const hasMore =
    plannerMode && embedded
      ? plannerEmbeddedHasMore(media.length, total)
      : media.length < total;

  const handleHotspotRegionSelect = useCallback(
    (main: string, sub: string) => {
      setRegionMain(main);
      setRegionSub(sub);
    },
    [],
  );

  const navigateToMap = useCallback(() => {
    const qs = buildMediaBrowseQueryString({
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
    });
    router.push(qs ? `/media/map?${qs}` : "/media/map");
  }, [
    catalogVariant,
    features,
    mainCategory,
    networkType,
    priceMax,
    priceMin,
    query,
    regionMain,
    regionSub,
    router,
    sort,
    subCategory,
    target,
  ]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (
        stored === "feed" ||
        stored === "card" ||
        stored === "compact" ||
        stored === "reels"
      ) {
        setViewMode(stored);
        return;
      }
      if (stored === "map") {
        if (appShellEnabled && !embedded && !plannerMode) {
          setViewMode("feed");
        } else {
          setViewMode("map");
        }
        return;
      }
      const legacyBrowse = localStorage.getItem("mediaBrowseMode");
      if (legacyBrowse === "map" && !appShellEnabled) {
        setViewMode("map");
      }
    } catch {
      /* ignore */
    }
  }, [appShellEnabled, embedded, plannerMode]);

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
    if (mode === "map") {
      if (appShell) {
        navigateToMap();
        return;
      }
    }
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "reels") params.set("view", "reels");
    else params.delete("view");
    const qs = params.toString();
    router.replace(qs ? `/media?${qs}` : "/media", { scroll: false });
  };

  useEffect(() => {
    catalogFetchGeneration.current += 1;
    const generation = catalogFetchGeneration.current;
    const debounceMs = generation === 1 ? 0 : 300;
    const timer = setTimeout(() => {
      if (catalogFetchGeneration.current !== generation) return;

      if (generation === 1 && !plannerMode) {
        const currentKey = buildMediaBrowseFetchKey({
          query,
          networkBrowse,
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
          page: 1,
        });
        if (currentKey === mountSsrFetchKey && initialMedia.length > 0) return;
      }

      void fetchMedia({ page: 1, append: false }, generation);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [fetchMedia, mountSsrFetchKey, plannerMode, query, networkBrowse, networkType, mainCategory, subCategory, target, regionMain, regionSub, priceMin, priceMax, features, sort]);

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    const generation = catalogFetchGeneration.current;
    void fetchMedia({ page: page + 1, append: true }, generation);
  };

  const priceLocale = locale.startsWith("ko") ? "ko-KR" : "en-US";
  const renderPrice = (item: HomeCatalogMediaItem) =>
    formatPriceLabel(item.price, item.pricePeriod, priceLocale);

  const getMediaHref = (item: HomeCatalogMediaItem) => mediaItemDetailPath(item);

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
        <DiscoveryMediaCard
          key={item.id}
          variant="compact"
          compactLayout="row"
          item={item}
          href={href}
          metaLine={metaLine}
          isKo={isKo}
          inCompare={isInCompare(item.id)}
          onToggleCompare={() => toggleCompare(item)}
          plannerMode={plannerMode}
          isInPlan={inPlan}
          onTogglePlan={plannerMode ? togglePlan : undefined}
        />
      );
    }

    if (viewMode === "card") {
      return (
        <div key={item.id} className="h-full min-h-0">
          <DiscoveryMediaCard
            variant="compact"
            compactLayout="map-tile"
            item={item}
            href={href}
            priceLabel={priceLabel}
            isKo={isKo}
            inCompare={isInCompare(item.id)}
            onToggleCompare={() => toggleCompare(item)}
            plannerMode={plannerMode}
            isInPlan={inPlan}
            onTogglePlan={plannerMode ? togglePlan : undefined}
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
      <div key={item.id} className="min-w-0">
        <DiscoveryMediaCard
          variant="feed"
          item={item}
          href={href}
          highlights={highlights}
          locationLine={locationLine}
          priceLabel={priceLabel}
          isKo={isKo}
          inCompare={isInCompare(item.id)}
          onToggleCompare={() => toggleCompare(item)}
          plannerMode={plannerMode}
          isInPlan={inPlan}
          onTogglePlan={plannerMode ? togglePlan : undefined}
          showPlanButton={!plannerMode}
        />
      </div>
    );
  };

  const scrollToPlannerSelection = useCallback(() => {
    document
      .getElementById("planner-selected-media-bar")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const mobileViewSegment: MediaMobileViewSegment =
    viewMode === "map" ? "map" : "list";

  const handleMobileViewSegmentChange = useCallback(
    (segment: MediaMobileViewSegment) => {
      if (segment === "map") {
        navigateToMap();
        return;
      }
      if (viewMode === "map") {
        handleViewModeChange("feed");
      }
    },
    [handleViewModeChange, navigateToMap, viewMode],
  );

  const edgePad = embedded || plannerMode ? "px-0" : "px-4";
  /** `/media` 라우트에서 명시적으로 opt-in 했을 때만 고정 앱 셸로 렌더 (임베드/플래너 제외) */
  const appShell = appShellEnabled && !embedded && !plannerMode;

  const filtersBar = (
    <DiscoveryFilterBar
      isKo={isKo}
      variant={networkBrowse ? "network" : "media"}
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
      loading={loading && !loadingMore}
      unifiedToolbar={appShell}
      mobileBottomBar={false}
      mobileStickyToolbar={appShell}
      listPageLayout={appShell}
      onNavigateToMap={navigateToMap}
      mobileViewSegment={mobileViewSegment}
      onMobileViewSegmentChange={handleMobileViewSegmentChange}
      showHotspotRegions={appShell && !networkBrowse}
      onHotspotRegionSelect={handleHotspotRegionSelect}
      compareCount={plannerMode ? 0 : compareEntries.length}
      onCompareSummaryClick={plannerMode ? undefined : openCompareSummary}
      cartCount={plannerMode ? 0 : planCount}
      selectedCount={plannerMode ? plannerSelectedIds.length : 0}
      selectionVariant={plannerMode ? "plan" : "default"}
      onSelectedSummaryClick={
        plannerMode && plannerSelectedIds.length > 0
          ? scrollToPlannerSelection
          : undefined
      }
    />
  );

  const loadMoreButton = (
    <div className="space-y-1.5">
      {plannerMode && embedded ? (
        <p className="text-center text-[11px] text-muted-foreground">
          {isKo
            ? `${media.length.toLocaleString("ko-KR")} / ${total.toLocaleString("ko-KR")}개 표시${media.length >= PLANNER_EMBEDDED_MAX_ITEMS ? " · 필터로 범위를 좁혀 보세요" : ""}`
            : `Showing ${media.length} of ${total}${media.length >= PLANNER_EMBEDDED_MAX_ITEMS ? " · narrow filters to refine" : ""}`}
        </p>
      ) : null}
      <button
        type="button"
        onClick={handleLoadMore}
        disabled={loadingMore}
        className="tkad-type-body w-full rounded-xl border border-gray-200 py-2.5 text-sm text-tkad-muted transition hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 hover:dark:bg-white/5"
      >
        {loadingMore
          ? isKo
            ? "불러오는 중…"
            : "Loading…"
          : plannerMode && embedded
            ? isKo
              ? `더 보기 (+${Math.min(PLANNER_EMBEDDED_PAGE_SIZE, PLANNER_EMBEDDED_MAX_ITEMS - media.length)})`
              : `Load more (+${Math.min(PLANNER_EMBEDDED_PAGE_SIZE, PLANNER_EMBEDDED_MAX_ITEMS - media.length)})`
            : tMedia("loadMoreBrowse")}
      </button>
    </div>
  );

  const showListSkeleton = loading && !loadingMore && media.length === 0;
  const listRefetching = loading && !loadingMore && media.length > 0;

  const listRefetchOverlay = (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-1 px-4 pt-1"
      aria-live="polite"
    >
      <div className="h-0.5 w-full max-w-sm overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-[color:var(--qp-accent)]" />
      </div>
      <p className="tkad-type-meta text-tkad-muted">
        {isKo ? "불러오는 중…" : "Loading…"}
      </p>
    </div>
  );

  /** 본문(매체 목록/지도) — 외부 여백 없이 순수 콘텐츠만. 셸/문서 흐름 양쪽에서 재사용 */
  const bodyContent =
    viewMode === "map" && !appShell ? (
      <div
        className="relative min-w-0 overflow-x-clip"
        data-screenshot="media-view-map"
      >
        {loading && !loadingMore && mapDisplayItems.length === 0 ? (
            <div
              className="animate-pulse rounded-2xl border border-gray-100 bg-gray-200 dark:border-white/10 dark:bg-white/10"
              style={{ height: mapHeightPx, minHeight: 360 }}
            />
          ) : mapDisplayItems.length === 0 ? (
            <DiscoveryEmptyState
              variant="panel"
              title={
                isKo
                  ? "지도에 표시할 매체가 없습니다"
                  : "No media with map coordinates"
              }
              description={
                isKo
                  ? "필터를 조정하거나 목록 보기로 전환해 보세요"
                  : "Adjust filters or switch to list view"
              }
            />
          ) : (
            <div className="relative">
              {listRefetching ? listRefetchOverlay : null}
              <div
                className={cn(
                  listRefetching && "pointer-events-none opacity-50 transition-opacity",
                )}
              >
                <MediaBrowseMap
                  items={mapDisplayItems}
                  locale={locale}
                  selectedId={mapSelectedId}
                  onSelectId={handleMapSelectId}
                  fixedMapHeightPx={mapHeightPx}
                  showFooterCaption={false}
                />
              </div>
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
            <div className="mt-4">{loadMoreButton}</div>
          ) : null}
        </div>
      ) : viewMode === "reels" ? (
        <MediaReelsBrowse
          items={media}
          isKo={isKo}
          locale={locale}
          getHref={getMediaHref}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={handleLoadMore}
          inCompare={isInCompare}
          onToggleCompare={toggleCompare}
          plannerMode={plannerMode}
          plannerSelectedIds={plannerSelectedIds}
          onPlannerToggleMedia={
            onPlannerToggleMedia
              ? (id) => {
                  const raw = catalogItems.find((m) => m.id === id);
                  onPlannerToggleMedia(id, raw);
                }
              : undefined
          }
        />
      ) : (
      <>
      <div className="relative min-w-0">
        {listRefetching ? listRefetchOverlay : null}
        {showListSkeleton && viewMode === "card" && !plannerMode ? (
          <MediaCardSkeletonGrid count={8} />
        ) : (
        <div
          className={cn(
            "min-w-0 overflow-x-clip transition-opacity",
            listRefetching && "pointer-events-none opacity-50",
            viewMode === "feed" &&
              cn(
                "grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4",
                plannerMode && "gap-2 sm:gap-3",
              ),
            viewMode === "card" &&
              (plannerMode
                ? "grid auto-rows-fr items-stretch [&>*]:min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3"
                : MEDIA_BROWSE_CARD_GRID_CLASS),
            viewMode === "compact" &&
              cn(
                "grid [&>*]:min-w-0",
                plannerMode
                  ? "grid-cols-2 gap-0.5 sm:gap-x-3 lg:grid-cols-4"
                  : "grid-cols-1 gap-0.5 sm:grid-cols-2 sm:gap-x-3 lg:grid-cols-4",
              ),
          )}
          data-screenshot={`media-view-${viewMode}`}
        >
        {showListSkeleton ? (
          viewMode === "card" && plannerMode ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-full min-h-0">
                <MediaCardSkeleton />
              </div>
            ))
          ) : (
          Array.from({
            length: viewMode === "compact" ? 16 : 6,
          }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "animate-pulse",
                viewMode === "feed"
                  ? "overflow-hidden rounded-2xl border border-gray-100 dark:border-white/10"
                  : "flex min-h-[3rem] items-center gap-2.5",
              )}
            >
              {viewMode === "feed" ? (
                <DiscoveryMediaFeedCardSkeleton />
              ) : (
                <>
                  <div className="h-11 w-14 shrink-0 rounded-lg bg-gray-200 dark:bg-white/10" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="h-3 w-4/5 rounded bg-gray-200 dark:bg-white/10" />
                    <div className="h-2.5 w-1/2 rounded bg-gray-200 dark:bg-white/10" />
                  </div>
                </>
              )}
            </div>
          ))
          )
        ) : media.length === 0 ? (
          <DiscoveryEmptyState
            title={isKo ? "조건에 맞는 매체가 없어요" : "No media match your filters"}
            description={isKo ? "필터를 조정해보세요" : "Try adjusting your filters"}
            action={
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
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
                  className="tkad-type-body tkad-home-accent-text underline"
                >
                  {isKo ? "필터 초기화" : "Reset filters"}
                </button>
                <Link
                  href="/media/targets"
                  className="tkad-type-body tkad-home-accent-text underline"
                  data-screenshot="media-empty-targets-cta"
                >
                  {isKo ? "목적별로 찾아보기" : "Browse by campaign goal"}
                </Link>
              </div>
            }
          />
        ) : (
          media.map((item) => renderMediaCard(item))
        )}
        </div>
        )}
      </div>

      {hasMore && !loading ? (
        <div className="mt-4">{loadMoreButton}</div>
      ) : null}
      </>
    );

  const compareBar = !plannerMode ? (
    <>
      {appShell && !lgUp ? (
        <MediaBrowseStickyBar
          items={compareItems}
          locale={locale}
          onClearCompare={() => setCompareCartEntries([])}
        />
      ) : null}
      {lgUp || !appShell ? (
        <CompareBar
          variant="light"
          items={compareItems}
          locale={locale}
          onClear={() => setCompareCartEntries([])}
        />
      ) : null}
    </>
  ) : null;

  // ── 고정 앱 셸: 상단 sticky 컨트롤 바(flex-none) + 본문 내부 스크롤(flex-1) ──
  if (appShell) {
    return (
      <>
        <div className="tkad-media-app-shell tkad-media-list-shell relative w-full min-w-0 bg-gray-50 dark:bg-[#020202]">
          <div className="min-w-0 px-4 pt-3">{filtersBar}</div>
          <div className="min-w-0 px-4 pt-3 pb-[calc(4.25rem+1.5rem+env(safe-area-inset-bottom,0px))] lg:pb-6">
            {bodyContent}
            <div className="mt-8 border-t border-gray-200/80 pt-4 text-center dark:border-white/10">
              <Link
                href="/media/targets"
                className="tkad-type-meta inline-flex items-center gap-1 font-medium text-[color:var(--qp-accent)] underline decoration-[color:var(--qp-accent)]/50 underline-offset-2 hover:opacity-90"
                data-screenshot="media-targets-footer-link"
              >
                {isKo ? "캠페인 목적별로 매체 찾기" : "Find media by campaign goal"}
              </Link>
            </div>
          </div>
        </div>
        {compareBar}
      </>
    );
  }

  // ── 문서 흐름(플래너 임베드 등): 기존 레이아웃 유지 ──
  return (
    <>
      <div
        className={cn(
          "min-w-0 w-full max-w-full",
          !embedded && "bg-gray-50 dark:bg-[#020202]",
        )}
      >
        <div className={cn("min-w-0 overflow-x-clip pt-4", edgePad)}>
          {filtersBar}
        </div>
        <div className={cn("mt-3", edgePad)}>{bodyContent}</div>
      </div>
      {compareBar}
    </>
  );
}

export const MediaSearchPage = withSearchParamsSuspense(
  MediaSearchPageInner,
  <MediaBrowsePageSkeleton />,
);
