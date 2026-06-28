"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { DiscoveryMediaCard } from "@/components/discovery/media-card";
import {
  DiscoveryFilterBar,
  DiscoveryEmptyState,
  formatMapViewCountLabel,
  type DiscoveryFilterBarViewMode,
  type MediaMobileViewSegment,
} from "@/components/discovery/filter-bar";
import { MEDIA_MOBILE_BOTTOM_BAR_SLOT_ID } from "@/components/discovery/media-mobile-bottom-bar";
import { ClipboardCheck, Crosshair, LayoutList, Loader2, Search } from "lucide-react";
import { FieldSurveyPanel } from "@/components/media-map/field-survey-panel";
import { MediaMapVisibilityLegend } from "@/components/media-map/media-map-visibility-legend";
import { MediaMapFloatingEmptyState } from "@/components/media-map/media-map-floating-empty";
import { MapFloatingButton, mapFloatingPanelClass } from "@/components/media-map/map-floating-ui";
import { cn } from "@/lib/utils";
import type { MapBounds, MapMarker } from "@/components/public-map/map-types";
import type { DarkMapProgrammaticView } from "@/components/public-map/dark-map-view";
import {
  mapMarkersForMapCatalogItem,
  resolveMediaIdFromMapPinId,
} from "@/lib/media-detail-map-markers";
import { useAppToast } from "@/lib/use-toast";
import CompareBar from "@/components/compare-bar";
import { usePlanCart } from "@/hooks/use-plan-cart";
import type { MediaItem } from "@/lib/media-data";
import {
  entriesToCompareMediaItems,
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  type CompareCartEntry,
} from "@/lib/compare-cart-client";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { MediaMapDetailSheet } from "@/components/media-map/media-map-detail-sheet";
import type { MapMapItem } from "@/components/media-map/media-map-types";
import {
  buildMediaMapSearchString,
  parseMediaMapUrlState,
  replaceUrlSearch,
} from "@/lib/media-map/url-state";
import { resolveBrowseRegionMapView } from "@/lib/media-map/region-view";
import {
  initMapBrowseFiltersFromUrl,
  isMapTextSearchActive,
  mapBrowseFiltersToMapApiParams,
  mapBrowseFiltersToUrlState,
  type MapBrowseFilters,
} from "@/lib/media-map/browse-filters";
import { mapBrowseFiltersToMediaBrowseQueryString } from "@/lib/media-browse-query-string";
import {
  boundsFromMapCoordItems,
  mapBoundsIntersect,
} from "@/lib/media-map/map-item-bounds";
import {
  MediaMapListSheet,
  type MediaMapSheetSnap,
} from "@/components/media-map/media-map-list-sheet";

function MapViewLoadingPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-[#0a0a12]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-violet-500 dark:border-white/20 dark:border-t-violet-400" />
        <p className="tkad-type-body text-tkad-muted">지도 불러오는 중…</p>
      </div>
    </div>
  );
}

function MapListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-white/10 dark:bg-white/5"
        >
          <div className="aspect-[4/3] animate-pulse bg-gray-100 dark:bg-white/10" />
          <div className="space-y-2 p-2.5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
            <div className="h-8 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10" />
          </div>
        </li>
      ))}
    </>
  );
}

const DarkMapView = dynamic(
  () => import("@/components/public-map/dark-map-view"),
  {
    ssr: false,
    loading: () => <MapViewLoadingPlaceholder />,
  },
);

type Item = MapMapItem;

type Facets = { regions: string[]; types: string[] };

const CART_KEY = "tkad-media-cart-v1";

/** 마커/카드 선택 시 클로즈업 줌(Kakao level, 작을수록 확대). zoomInOnly 로 확대만 적용. */
const MARKER_FOCUS_ZOOM = 4;

/** 텍스트 검색 결과 fitBounds 시 Leaflet maxZoom */
const TEXT_SEARCH_FIT_MAX_ZOOM = 12;

function boundsEqual(a: MapBounds, b: MapBounds, eps = 1e-5): boolean {
  return (
    Math.abs(a.swLat - b.swLat) < eps &&
    Math.abs(a.swLng - b.swLng) < eps &&
    Math.abs(a.neLat - b.neLat) < eps &&
    Math.abs(a.neLng - b.neLng) < eps
  );
}

function readCart(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeCart(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(ids));
}

/** SSR-safe 초기 URL 파싱 (hydration warning 방지를 위해 lazy init 으로 사용) */
function readInitialUrlState() {
  if (typeof window === "undefined") return null;
  try {
    return parseMediaMapUrlState(new URLSearchParams(window.location.search));
  } catch {
    return null;
  }
}

export default function MediaMapPageClient() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const toast = useAppToast();
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  /** 마지막 API 검색에 사용한 bounds — "이 지역 검색" 버튼 노출 판단용 */
  const [searchedBounds, setSearchedBounds] = useState<MapBounds | null>(null);
  /** 사용자가 직접 지도를 이동/줌한 뒤 true — 프로그램matic 이동은 제외 */
  const [viewportDirty, setViewportDirty] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [matchTotal, setMatchTotal] = useState<number | undefined>(undefined);
  const [facets, setFacets] = useState<Facets>({ regions: [], types: [] });
  const [loading, setLoading] = useState(false);
  const initialUrl = useRef(readInitialUrlState());
  const [browseFilters, setBrowseFilters] = useState<MapBrowseFilters>(() =>
    initMapBrowseFiltersFromUrl(initialUrl.current),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [compareEntries, setCompareEntriesState] = useState<CompareCartEntry[]>([]);
  /** 마지막으로 idle 한 지도 중심/줌 — URL 동기화용 */
  const [view, setView] = useState<{ lat: number; lng: number; zoom: number } | null>(
    () => {
      const init = initialUrl.current;
      if (init && init.lat != null && init.lng != null && init.zoom != null) {
        return { lat: init.lat, lng: init.lng, zoom: init.zoom };
      }
      return null;
    },
  );
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [surveyMode, setSurveyMode] = useState(false);
  const [surveyCheckedIds, setSurveyCheckedIds] = useState<Set<string>>(
    () => new Set(),
  );
  /** 모바일(<md) 여부 — 리스트를 사이드 패널/바텀시트 중 한 곳에만 마운트(단일 인스턴스) */
  const [isMobile, setIsMobile] = useState(false);
  /** 모바일 리스트 바텀시트 스냅 단계 */
  const [sheetSnap, setSheetSnap] = useState<MediaMapSheetSnap>("half");
  /** 레이아웃 전환/스냅 변경 후 map.invalidateSize() 트리거용 nonce */
  const [invalidateNonce, setInvalidateNonce] = useState(0);
  const pvNonceRef = useRef(0);
  const [programmaticView, setProgrammaticView] =
    useState<DarkMapProgrammaticView | null>(() => {
      const init = initialUrl.current;
      if (init && init.lat != null && init.lng != null) {
        pvNonceRef.current = 1;
        return {
          lat: init.lat,
          lng: init.lng,
          zoom: init.zoom ?? 8,
          nonce: 1,
        };
      }
      return null;
    });
  const emitProgrammaticView = useCallback(
    (cmd: {
      lat: number;
      lng: number;
      zoom: number;
      zoomInOnly?: boolean;
      maxZoom?: number;
      fitBounds?: MapBounds;
      fitBoundsMaxZoom?: number;
      /** true면 다음 bounds 갱신 시 즉시 검색 + dirty 리셋 */
      resetUserViewport?: boolean;
    }) => {
      if (cmd.resetUserViewport) {
        setViewportDirty(false);
        forceSearchRef.current = true;
      }
      pvNonceRef.current += 1;
      setProgrammaticView({
        lat: cmd.lat,
        lng: cmd.lng,
        zoom: cmd.zoom,
        nonce: pvNonceRef.current,
        zoomInOnly: cmd.zoomInOnly,
        maxZoom: cmd.maxZoom,
        fitBounds: cmd.fitBounds,
        fitBoundsMaxZoom: cmd.fitBoundsMaxZoom,
      });
    },
    [],
  );
  const itemsRef = useRef<Item[]>([]);
  const markersRef = useRef<MapMarker[]>([]);
  const listItemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const regionPanSkipRef = useRef(true);
  const forceSearchRef = useRef(false);
  const initialFetchDoneRef = useRef(false);
  const searchedBoundsRef = useRef<MapBounds | null>(null);
  const lastFocusedSelectionRef = useRef<string | null>(null);
  const browseFiltersRef = useRef(browseFilters);
  const lastTextSearchQRef = useRef("");
  const mapFetchAbortRef = useRef<AbortController | null>(null);
  const fetchGenerationRef = useRef(0);

  useEffect(() => {
    return () => {
      mapFetchAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    browseFiltersRef.current = browseFilters;
  }, [browseFilters]);

  const applyTextSearchMapView = useCallback(
    (
      nextItems: Item[],
      f: MapBrowseFilters,
      queryRegion: { regionMain: string; regionSub: string } | null,
      viewport: MapBounds | null,
    ) => {
      if (!isMapTextSearchActive(f)) return;

      const regionMain = queryRegion?.regionMain ?? f.regionMain;
      const regionSub = queryRegion?.regionSub ?? f.regionSub;
      const regionView = resolveBrowseRegionMapView(regionMain, regionSub);
      if (regionView) {
        emitProgrammaticView({
          lat: regionView.lat,
          lng: regionView.lng,
          zoom: regionView.zoom,
          resetUserViewport: true,
        });
        return;
      }

      const resultBounds = boundsFromMapCoordItems(nextItems);
      if (!resultBounds) return;
      if (viewport && mapBoundsIntersect(resultBounds, viewport)) return;

      const centerLat = (resultBounds.swLat + resultBounds.neLat) / 2;
      const centerLng = (resultBounds.swLng + resultBounds.neLng) / 2;
      emitProgrammaticView({
        lat: centerLat,
        lng: centerLng,
        zoom: 8,
        fitBounds: resultBounds,
        fitBoundsMaxZoom: TEXT_SEARCH_FIT_MAX_ZOOM,
        resetUserViewport: true,
      });
    },
    [emitProgrammaticView],
  );

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const init = initialUrl.current;
    if (!init || (init.lat != null && init.lng != null)) return;
    const bf = initMapBrowseFiltersFromUrl(init);
    const mapView = resolveBrowseRegionMapView(bf.regionMain, bf.regionSub);
    if (!mapView) return;
    emitProgrammaticView({
      lat: mapView.lat,
      lng: mapView.lng,
      zoom: mapView.zoom,
      resetUserViewport: true,
    });
  }, [emitProgrammaticView]);

  useEffect(() => {
    setCartIds(readCart());
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("survey") === "1") {
        setSurveyMode(true);
      }
    }
  }, []);

  useEffect(() => {
    setCompareEntriesState(getCompareCartEntries());
    return subscribeCompareCart(() => {
      setCompareEntriesState(getCompareCartEntries());
    });
  }, []);

  // 모바일 여부 추적 (md 브레이크포인트)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // 레이아웃 전환(데스크톱↔모바일)·바텀시트 스냅 변경 후 지도 타일 재계산
  useEffect(() => {
    setInvalidateNonce((n) => n + 1);
  }, [isMobile, sheetSnap]);

  // URL 상태 동기화 — view + filter 변경 시 history.replaceState
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    urlSyncTimerRef.current = setTimeout(() => {
      const next = buildMediaMapSearchString({
        lat: view?.lat,
        lng: view?.lng,
        zoom: view?.zoom,
        ...mapBrowseFiltersToUrlState(browseFilters),
      });
      replaceUrlSearch(next);
    }, 300);
    return () => {
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    };
  }, [
    view?.lat,
    view?.lng,
    view?.zoom,
    browseFilters.q,
    browseFilters.mainCategory,
    browseFilters.subCategory,
    browseFilters.target,
    browseFilters.regionMain,
    browseFilters.regionSub,
    browseFilters.priceMin,
    browseFilters.priceMax,
    browseFilters.features,
    browseFilters.sort,
  ]);

  const fetchItems = useCallback(
    async (b: MapBounds | null, f: MapBrowseFilters) => {
      mapFetchAbortRef.current?.abort();
      const controller = new AbortController();
      mapFetchAbortRef.current = controller;
      const generation = ++fetchGenerationRef.current;

      setLoading(true);
      const failToast = () => {
        toast.error(
          isKo
            ? "지도 검색에 실패했습니다. 잠시 후 다시 시도해주세요."
            : "Map search failed. Please try again.",
        );
      };
      try {
        const { params, nationalScope, queryRegion } =
          mapBrowseFiltersToMapApiParams(f);
        if (!nationalScope && b) {
          params.set("swLat", String(b.swLat));
          params.set("swLng", String(b.swLng));
          params.set("neLat", String(b.neLat));
          params.set("neLng", String(b.neLng));
        }

        const res = await fetch(`/api/media/map?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (generation !== fetchGenerationRef.current) return;

        const ct = res.headers.get("content-type") ?? "";
        if (!res.ok || !ct.includes("application/json")) {
          failToast();
          return;
        }
        let data: {
          ok?: boolean;
          data?: { items?: Item[]; facets?: Facets; matchTotal?: number };
        };
        try {
          data = (await res.json()) as typeof data;
        } catch {
          if (generation !== fetchGenerationRef.current) return;
          failToast();
          return;
        }
        if (generation !== fetchGenerationRef.current) return;
        if (data?.ok && data.data) {
          const next = Array.isArray(data.data.items) ? data.data.items : [];
          setItems(next);
          setMatchTotal(
            typeof data.data.matchTotal === "number"
              ? data.data.matchTotal
              : next.length,
          );
          setFacets(
            data.data.facets ?? {
              regions: [],
              types: [],
            },
          );

          const qTrim = f.q.trim();
          if (nationalScope && qTrim && qTrim !== lastTextSearchQRef.current) {
            lastTextSearchQRef.current = qTrim;
            applyTextSearchMapView(
              next,
              f,
              queryRegion,
              searchedBoundsRef.current ?? b,
            );
          } else if (!nationalScope) {
            lastTextSearchQRef.current = "";
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (generation !== fetchGenerationRef.current) return;
        failToast();
      } finally {
        if (generation === fetchGenerationRef.current) {
          setLoading(false);
        }
      }
    },
    [applyTextSearchMapView, isKo, toast],
  );

  const runSearch = useCallback(
    async (b: MapBounds) => {
      const f = browseFiltersRef.current;
      if (isMapTextSearchActive(f)) {
        await fetchItems(null, f);
      } else {
        await fetchItems(b, f);
      }
      setSearchedBounds(b);
      searchedBoundsRef.current = b;
      setViewportDirty(false);
    },
    [fetchItems],
  );

  const handleBoundsChange = useCallback(
    (b: MapBounds) => {
      setBounds(b);
      if (forceSearchRef.current) {
        forceSearchRef.current = false;
        void runSearch(b);
        return;
      }
      if (!initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        void runSearch(b);
      }
    },
    [runSearch],
  );

  useEffect(() => {
    searchedBoundsRef.current = searchedBounds;
  }, [searchedBounds]);

  // 필터 변경(지역 제외) — 텍스트 검색은 전국, 그 외는 현재 검색 영역
  useEffect(() => {
    const b = searchedBoundsRef.current;
    const f = browseFilters;
    if (!b && !isMapTextSearchActive(f)) return;
    void fetchItems(isMapTextSearchActive(f) ? null : b, f);
  }, [
    browseFilters.q,
    browseFilters.mainCategory,
    browseFilters.subCategory,
    browseFilters.target,
    browseFilters.priceMin,
    browseFilters.priceMax,
    browseFilters.features,
    browseFilters.sort,
    fetchItems,
  ]);

  // 지역 필터만 변경 + 지도 이동 없는 경우(전국 등) — bounds 유지 재조회
  useEffect(() => {
    const b = searchedBoundsRef.current;
    if (!b) return;
    const mapView = resolveBrowseRegionMapView(
      browseFilters.regionMain,
      browseFilters.regionSub,
    );
    if (mapView) return;
    void fetchItems(b, browseFilters);
  }, [browseFilters.regionMain, browseFilters.regionSub, fetchItems, browseFilters]);

  useEffect(() => {
    if (regionPanSkipRef.current) {
      regionPanSkipRef.current = false;
      return;
    }
    const mapView = resolveBrowseRegionMapView(
      browseFilters.regionMain,
      browseFilters.regionSub,
    );
    if (!mapView) return;
    emitProgrammaticView({
      lat: mapView.lat,
      lng: mapView.lng,
      zoom: mapView.zoom,
      resetUserViewport: true,
    });
  }, [browseFilters.regionMain, browseFilters.regionSub, emitProgrammaticView]);

  const markers: MapMarker[] = useMemo(() => {
    const fromItems = items.flatMap((i) => mapMarkersForMapCatalogItem(i));
    if (!selectedItem) return fromItems;
    const selectedPins = mapMarkersForMapCatalogItem(selectedItem);
    if (selectedPins.length === 0) return fromItems;
    const existingIds = new Set(fromItems.map((m) => m.id));
    const extra = selectedPins.filter((m) => !existingIds.has(m.id));
    return extra.length > 0 ? [...fromItems, ...extra] : fromItems;
  }, [items, selectedItem]);

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  // selected를 state에 pin — bounds 변경으로 items가 갱신돼도 팝업 유지
  useEffect(() => {
    if (!selectedId) {
      setSelectedItem(null);
      return;
    }
    const mediaId = resolveMediaIdFromMapPinId(selectedId);
    const hit = items.find((i) => i.id === mediaId);
    if (hit) setSelectedItem(hit);
  }, [selectedId, items]);

  useEffect(() => {
    if (!selectedId) return;
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      return;
    }
    const mediaId = resolveMediaIdFromMapPinId(selectedId);
    const el = listItemRefs.current.get(mediaId);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId, items]);

  const handleUserViewportAdjusted = useCallback(() => {
    setViewportDirty(true);
  }, []);

  const handleSearchThisArea = useCallback(() => {
    if (!bounds) return;
    void runSearch(bounds);
  }, [bounds, runSearch]);

  const showSearchAreaButton =
    !isMapTextSearchActive(browseFilters) &&
    viewportDirty &&
    bounds != null &&
    searchedBounds != null &&
    !boundsEqual(bounds, searchedBounds);

  // 마커 클릭 시 즉시 selectedId + selectedItem을 한 번에 set (지연 없이 카드 표시)
  const handleSelect = useCallback(
    (id: string) => {
      lastFocusedSelectionRef.current = id;
      setSelectedId(id);
      const mediaId = resolveMediaIdFromMapPinId(id);
      const item = itemsRef.current.find((i) => i.id === mediaId);
      if (item) setSelectedItem(item);
      const mk =
        markersRef.current.find((m) => m.id === id) ??
        markersRef.current.find(
          (m) => resolveMediaIdFromMapPinId(m.id) === mediaId,
        );
      if (mk) {
        emitProgrammaticView({
          lat: mk.lat,
          lng: mk.lng,
          zoom: MARKER_FOCUS_ZOOM,
          zoomInOnly: true,
        });
      }
    },
    [emitProgrammaticView],
  );

  const selected = selectedItem;

  const inCart = useCallback((id: string) => cartIds.includes(id), [cartIds]);
  const isInCompare = useCallback(
    (id: string) => compareEntries.some((e) => e.id === id),
    [compareEntries],
  );
  const { count: planCount } = usePlanCart();
  const floatingBarOffset = planCount > 0 || compareEntries.length > 0;

  const toggleCart = useCallback(
    (id: string) => {
      const item = items.find((x) => x.id === id);
      const name = item?.name;
      const prev = readCart();
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      writeCart(next);
      setCartIds(next);
      if (exists) {
        toast.warning(
          name ? `${name}이(가) 장바구니에서 제거되었습니다.` : "장바구니에서 제거되었습니다.",
        );
      } else {
        toast.success(name ? `${name}이(가) 장바구니에 담겼습니다.` : "매체가 장바구니에 담겼습니다.");
      }
    },
    [items, toast],
  );

  const mapCatalog = useMemo<MediaItem[]>(() => {
    const fromItem = (it: Item): MediaItem => ({
      id: it.id,
      name: it.name,
      nameEn: it.name,
      location: it.location,
      locationEn: it.location,
      region: (it.region as MediaItem["region"]) ?? "seoul",
      type: (it.type as MediaItem["type"]) ?? "digital",
      price: it.price,
      pricePeriod: (it.pricePeriod as MediaItem["pricePeriod"]) ?? "month",
      lat: it.lat,
      lng: it.lng,
      dailyFootTraffic: 0,
      sampleImages: it.image ? [it.image] : [],
    });
    const base = items.map(fromItem);
    if (selectedItem && !base.some((m) => m.id === selectedItem.id)) {
      base.push(fromItem(selectedItem));
    }
    return base;
  }, [items, selectedItem]);

  const compareItems = useMemo<MediaItem[]>(
    () => entriesToCompareMediaItems(compareEntries, mapCatalog),
    [compareEntries, mapCatalog],
  );

  const patchBrowseFilters = useCallback((patch: Partial<MapBrowseFilters>) => {
    setBrowseFilters((f) => ({ ...f, ...patch }));
  }, []);

  const handleBrowseViewModeChange = useCallback(
    (mode: DiscoveryFilterBarViewMode) => {
      if (mode === "map") return;
      const qs = mapBrowseFiltersToMediaBrowseQueryString(browseFilters);
      router.push(qs ? `/media?${qs}` : "/media");
    },
    [router, browseFilters],
  );

  const toggleCompare = useCallback(
    (it: Item) => {
      const prev = getCompareCartEntries();
      const exists = prev.some((e) => e.id === it.id);
      const next = exists
        ? prev.filter((e) => e.id !== it.id)
        : [...prev, { id: it.id, name: it.name, nameEn: it.name }];
      setCompareCartEntries(next);
    },
    [],
  );

  // "내 주변" 버튼 — Geolocation API
  const handleLocateMe = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.warning("이 브라우저에서는 현위치를 사용할 수 없습니다.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // 한국 영역 밖이면 거부 (해외에서 접근 시 지도가 엉뚱한 곳으로 튀는 것 방지)
        if (lat < 33 || lat > 39.5 || lng < 124 || lng > 132.5) {
          toast.warning("현위치가 한국 영역 밖이라 적용하지 않았습니다.");
          setLocating(false);
          return;
        }
        setUserLocation({ lat, lng });
        emitProgrammaticView({ lat, lng, zoom: 5, resetUserViewport: true });
        toast.success("현위치를 지도에 표시했습니다.");
        setLocating(false);
      },
      (err) => {
        const map: Record<number, string> = {
          1: "위치 권한이 거부됐습니다. 브라우저 설정에서 허용해주세요.",
          2: "현위치를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.",
          3: "위치 요청이 시간 초과됐습니다.",
        };
        toast.error(map[err.code] ?? "현위치 요청에 실패했습니다.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }, [toast, emitProgrammaticView]);

  const startSurveyMode = useCallback(() => {
    setSurveyMode(true);
    handleLocateMe();
  }, [handleLocateMe]);

  // 지도 idle 시 view state 갱신 → URL 동기화 effect 가 받아 처리
  const handleViewChange = useCallback(
    (v: { lat: number; lng: number; zoom: number }) => {
      setView((cur) => {
        if (
          cur &&
          Math.abs(cur.lat - v.lat) < 1e-5 &&
          Math.abs(cur.lng - v.lng) < 1e-5 &&
          cur.zoom === v.zoom
        ) {
          return cur;
        }
        return v;
      });
    },
    [],
  );

  const handleSheetSnapChange = useCallback((next: MediaMapSheetSnap) => {
    setSheetSnap(next);
  }, []);

  const mobileViewSegment: MediaMobileViewSegment =
    isMobile && sheetSnap !== "peek" ? "list" : "map";

  const handleMobileViewSegmentChange = useCallback(
    (segment: MediaMobileViewSegment) => {
      if (segment === "list") {
        setSheetSnap((cur) => (cur === "peek" ? "half" : cur));
        return;
      }
      setSheetSnap("peek");
    },
    [],
  );

  // 컨트롤 바 — PR1 의 단일 반응형 컴포넌트 재사용(unifiedToolbar). 지도용으로 복제하지 않음.
  const controlBar = (
    <DiscoveryFilterBar
      isKo={isKo}
      unifiedToolbar
      mobileBottomBar
      mobileViewSegment={mobileViewSegment}
      onMobileViewSegmentChange={handleMobileViewSegmentChange}
      mapPageViewModes
      query={browseFilters.q}
      onQueryChange={(q) => patchBrowseFilters({ q })}
      mainCategory={browseFilters.mainCategory}
      onMainCategoryChange={(mainCategory) =>
        patchBrowseFilters({ mainCategory, subCategory: "" })
      }
      subCategory={browseFilters.subCategory}
      onSubCategoryChange={(subCategory) => patchBrowseFilters({ subCategory })}
      target={browseFilters.target}
      onTargetChange={(target) => patchBrowseFilters({ target })}
      regionMain={browseFilters.regionMain}
      onRegionMainChange={(regionMain) =>
        patchBrowseFilters({ regionMain, regionSub: "" })
      }
      regionSub={browseFilters.regionSub}
      onRegionSubChange={(regionSub) => patchBrowseFilters({ regionSub })}
      priceMin={browseFilters.priceMin}
      onPriceMinChange={(priceMin) => patchBrowseFilters({ priceMin })}
      priceMax={browseFilters.priceMax}
      onPriceMaxChange={(priceMax) => patchBrowseFilters({ priceMax })}
      features={browseFilters.features}
      onFeaturesChange={(features) => patchBrowseFilters({ features })}
      sort={browseFilters.sort}
      onSortChange={(sort) =>
        patchBrowseFilters({ sort: sort as MapBrowseFilters["sort"] })
      }
      viewMode="map"
      onViewModeChange={handleBrowseViewModeChange}
      resultCount={items.length}
      totalCount={matchTotal}
      loading={loading || (!searchedBounds && !isMapTextSearchActive(browseFilters))}
      compareCount={compareEntries.length}
      cartCount={cartIds.length}
    />
  );

  // 리스트 — 데스크톱 사이드/모바일 시트 중 한 곳에만 마운트(단일 인스턴스, ref 싱크 보존)
  const listEl = (
    <ul className="relative z-0 grid grid-cols-2 gap-3 p-3 pb-8 md:gap-4 md:p-4">
      {(!searchedBounds && !isMapTextSearchActive(browseFilters)) || loading ? (
        <MapListSkeleton
          count={!searchedBounds && !isMapTextSearchActive(browseFilters) ? 4 : 6}
        />
      ) : (
        items.map((it) => (
          <DiscoveryMediaCard
            key={it.id}
            ref={(el) => {
              if (el) listItemRefs.current.set(it.id, el);
              else listItemRefs.current.delete(it.id);
            }}
            variant="compact"
            compactLayout="map-tile"
            item={it}
            isKo={isKo}
            locale={locale}
            selected={resolveMediaIdFromMapPinId(selectedId ?? "") === it.id}
            hovered={resolveMediaIdFromMapPinId(hoveredId ?? "") === it.id}
            inCompare={isInCompare(it.id)}
            inCart={inCart(it.id)}
            onSelect={handleSelect}
            onToggleCompare={() => toggleCompare(it)}
            onToggleCart={() => toggleCart(it.id)}
            onMouseEnter={() => setHoveredId(it.id)}
            onMouseLeave={() =>
              setHoveredId((cur) => (cur === it.id ? null : cur))
            }
            onFocus={() => setHoveredId(it.id)}
            onBlur={() => setHoveredId((cur) => (cur === it.id ? null : cur))}
          />
        ))
      )}
      {(searchedBounds || isMapTextSearchActive(browseFilters)) &&
      items.length === 0 &&
      !loading ? (
        <li className="col-span-2 list-none">
          <DiscoveryEmptyState
            title={isKo ? "검색 결과가 없습니다" : "No results"}
            description={
              isKo
                ? "필터를 조정하거나 지도를 이동해보세요."
                : "Adjust filters or pan the map."
            }
          />
        </li>
      ) : null}
    </ul>
  );

  const mapResultLabel = formatMapViewCountLabel(
    items.length,
    matchTotal,
    isKo,
  );

  // 모바일 시트 상단 — 결과 수만 (목록/지도 토글은 하단 바)
  const mobileSheetHeader = (
    <div className="flex items-center justify-between gap-2">
      <p className="tkad-type-meta min-w-0 truncate font-medium text-tkad-muted">
        {mapResultLabel}
      </p>
    </div>
  );

  const showMapEmptyOverlay =
    (searchedBounds || isMapTextSearchActive(browseFilters)) &&
    items.length === 0 &&
    !loading;

  return (
    <div className="tkad-media-app-shell relative flex w-full min-w-0 flex-col bg-gray-50 dark:bg-[#020202]">
      {/* 상단(flex-none): 단일 반응형 컨트롤 바 (항상 고정) */}
      <div className="flex-none border-b border-gray-200/80 bg-gray-50/95 px-3 pt-2 pb-2 backdrop-blur dark:border-white/10 dark:bg-[#020202]/95 md:px-4">
        {controlBar}
      </div>

      {/* 본문(flex-1, min-h-0): 데스크톱 = 리스트 + 지도 / 모바일 = 지도 풀 + 바텀시트 */}
      <div className="relative flex min-h-0 flex-1">
        {!isMobile ? (
          <aside className="flex w-[440px] shrink-0 flex-col overflow-y-auto border-r border-gray-200/80 bg-gray-50 lg:w-[520px] dark:border-white/10 dark:bg-[#020202]">
            {listEl}
          </aside>
        ) : null}

        {/* 지도 (flex-1) — 인스턴스 1개, 나머지 영역 전부 차지 */}
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0">
            <DarkMapView
              markers={markers}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={handleSelect}
              onBoundsChange={handleBoundsChange}
              onViewChange={handleViewChange}
              onUserViewportAdjusted={handleUserViewportAdjusted}
              programmaticView={programmaticView}
              userLocation={userLocation}
              invalidateNonce={invalidateNonce}
              themeAwareTiles
            />
          </div>

          {showMapEmptyOverlay ? (
            <MediaMapFloatingEmptyState
              isKo={isKo}
              className="pointer-events-none absolute inset-x-4 top-[38%] z-[12] -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2"
            />
          ) : null}

          {showSearchAreaButton ? (
            <div className="pointer-events-none absolute left-1/2 top-3 z-[11] -translate-x-1/2 sm:top-4">
              <button
                type="button"
                disabled={loading}
                onClick={handleSearchThisArea}
                className="pointer-events-auto tkad-type-meta inline-flex h-10 items-center gap-2 rounded-full border border-border/80 bg-card/90 px-4 font-semibold text-foreground shadow-lg shadow-black/10 backdrop-blur-md transition-colors hover:bg-card disabled:opacity-70 dark:border-white/12 dark:bg-[#0a0a12]/88 dark:shadow-black/40"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Search className="h-3.5 w-3.5" aria-hidden />
                )}
                {loading
                  ? isKo
                    ? "검색 중…"
                    : "Searching…"
                  : isKo
                    ? "이 지역에서 검색"
                    : "Search this area"}
              </button>
            </div>
          ) : null}

          {selected ? (
            <MediaMapDetailSheet
              variant="sheet"
              item={selected}
              onClose={() => {
                setSelectedId(null);
                setSelectedItem(null);
                lastFocusedSelectionRef.current = null;
              }}
              isKo={isKo}
              inCompare={isInCompare(selected.id)}
              inCart={inCart(selected.id)}
              onToggleCompare={() => toggleCompare(selected)}
              onToggleCart={() => toggleCart(selected.id)}
              floatingBarOffset={floatingBarOffset}
            />
          ) : null}

          {surveyMode ? (
            <FieldSurveyPanel
              items={items}
              userLocation={userLocation}
              isKo={isKo}
              onClose={() => setSurveyMode(false)}
              onLocationTick={setUserLocation}
              onCenterMap={(loc) =>
                emitProgrammaticView({
                  lat: loc.lat,
                  lng: loc.lng,
                  zoom: 4,
                  resetUserViewport: true,
                })
              }
              checkedIds={surveyCheckedIds}
              onCheckedChange={setSurveyCheckedIds}
            />
          ) : null}

          <MediaMapVisibilityLegend
            isKo={isKo}
            className="absolute bottom-3 left-3 z-[10] max-w-[168px] sm:bottom-4 sm:left-4"
          />

          <div className="pointer-events-none absolute right-3 top-3 z-[10] flex flex-col gap-2 sm:right-4 sm:top-4">
            <MapFloatingButton
              icon={ClipboardCheck}
              onClick={startSurveyMode}
              className={cn(
                "hidden md:inline-flex",
                surveyMode && "border-violet-400/50 bg-violet-50 dark:bg-violet-500/15",
              )}
              aria-label={isKo ? "답사 모드" : "Field survey"}
            >
              {isKo ? "답사" : "Survey"}
            </MapFloatingButton>
            <MapFloatingButton
              icon={ClipboardCheck}
              compact
              onClick={startSurveyMode}
              className={cn(
                "md:hidden",
                surveyMode && "border-violet-400/50 bg-violet-50 dark:bg-violet-500/15",
              )}
              aria-label={isKo ? "답사 모드" : "Field survey"}
            />
            <MapFloatingButton
              icon={Crosshair}
              compact
              onClick={handleLocateMe}
              disabled={locating}
              iconClassName={locating ? "animate-pulse" : undefined}
              className="md:hidden"
              aria-label={isKo ? "내 주변" : "Near me"}
            />
            <MapFloatingButton
              icon={Crosshair}
              onClick={handleLocateMe}
              disabled={locating}
              className="hidden md:inline-flex"
              aria-label={isKo ? "내 주변" : "Near me"}
            >
              {locating
                ? isKo
                  ? "확인 중…"
                  : "Locating…"
                : isKo
                  ? "내 주변"
                  : "Near me"}
            </MapFloatingButton>
            <Link
              href="/media"
              className={cn(
                mapFloatingPanelClass(
                  "pointer-events-auto tkad-type-meta hidden h-10 items-center gap-1.5 px-3.5 font-medium text-foreground transition-colors hover:bg-card md:inline-flex",
                ),
              )}
              aria-label={isKo ? "목록으로" : "List view"}
            >
              <LayoutList className="h-4 w-4 shrink-0" aria-hidden />
              {isKo ? "목록" : "List"}
            </Link>
          </div>
        </div>

        {/* 모바일 리스트 바텀시트 (3단 스냅: peek/half/full) */}
        {isMobile ? (
          <MediaMapListSheet
            snap={sheetSnap}
            onSnapChange={handleSheetSnapChange}
            isKo={isKo}
            header={mobileSheetHeader}
          >
            {listEl}
          </MediaMapListSheet>
        ) : null}
      </div>

      <div
        id={MEDIA_MOBILE_BOTTOM_BAR_SLOT_ID}
        className="flex-none shrink-0 md:hidden"
      />

      {selected ? (
        <MediaMapDetailSheet
          variant="bottom-sheet"
          item={selected}
          onClose={() => {
            setSelectedId(null);
            setSelectedItem(null);
          }}
          isKo={isKo}
          inCompare={isInCompare(selected.id)}
          inCart={inCart(selected.id)}
          onToggleCompare={() => toggleCompare(selected)}
          onToggleCart={() => toggleCart(selected.id)}
        />
      ) : null}

      <CompareBar
        variant="light"
        items={compareItems}
        locale={typeof document !== "undefined" ? document.documentElement.lang || "ko" : "ko"}
        onClear={() => {
          setCompareCartEntries([]);
        }}
      />
    </div>
  );
}
