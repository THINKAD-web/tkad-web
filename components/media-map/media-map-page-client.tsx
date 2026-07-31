"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { DiscoveryFilterBar, formatMapViewCountLabel, type DiscoveryFilterBarViewMode } from "@/components/discovery/filter-bar";
import { ClipboardCheck, Crosshair, LayoutList, Loader2, Map as MapIcon, Search } from "lucide-react";
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
import { MapChunkPrefetch } from "@/components/media-map/map-chunk-prefetch";
import { MapOnboardingCoachmark } from "@/components/media-map/map-onboarding-coachmark";
import {
  hasSeenMapOnboarding,
  markMapOnboardingSeen,
  MAP_ONBOARDING_KEYS,
} from "@/lib/media-map/onboarding-storage";
import { MediaMapItemList } from "@/components/media-map/media-map-item-list";
import {
  markMapPageInit,
  markMapPageUsable,
} from "@/lib/media-map/map-performance";
import { setMapHoveredMediaId } from "@/lib/media-map/map-hover-bridge";
import {
  readSubwayOverlayEnabled,
  writeSubwayOverlayEnabled,
} from "@/lib/public-map/seoul-metro-overlay-storage";
import {
  MAP_AUTO_SEARCH_BOUNDS_CHANGE_THRESHOLD,
  MAP_AUTO_SEARCH_DEBOUNCE_MS,
  mapBoundsChangeExceedsThreshold,
} from "@/lib/media-map/map-bounds-change";
import {
  resolveItemMapDisplayMode,
} from "@/lib/media-map/map-display-mode";

function itemShowsMapPin(item: MapMapItem): boolean {
  return resolveItemMapDisplayMode(item) === "pin";
}

function MapViewLoadingPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-[#0a0a12]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[color:var(--qp-accent)] dark:border-white/20" />
        <p className="tkad-type-body text-tkad-muted">지도 불러오는 중…</p>
      </div>
    </div>
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

/** 진입 시 전국 개요 검색 — 초기 뷰포트 대기 없이 핀 노출 */
const KOREA_MAP_OVERVIEW_BOUNDS: MapBounds = {
  swLat: 33.0,
  swLng: 124.5,
  neLat: 38.8,
  neLng: 132.0,
};

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
  const [mapPlottableTotal, setMapPlottableTotal] = useState<number | undefined>(
    undefined,
  );
  const [serviceRegionTotal, setServiceRegionTotal] = useState<
    number | undefined
  >(undefined);
  const [facets, setFacets] = useState<Facets>({ regions: [], types: [] });
  const [loading, setLoading] = useState(false);
  /** 자동 영역 재조회(fetch) 진행 중 — 우상단 스피너 표시용 */
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const initialUrl = useRef(readInitialUrlState());
  const [browseFilters, setBrowseFilters] = useState<MapBrowseFilters>(() =>
    initMapBrowseFiltersFromUrl(initialUrl.current),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
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
  const [sheetSnap, setSheetSnap] = useState<MediaMapSheetSnap>("peek");
  /** peek 시트 크롬 높이 — 핀 dock 오버레이 오프셋 */
  const [peekChromeHeight, setPeekChromeHeight] = useState(56);
  /** 레이아웃 전환/스냅 변경 후 map.invalidateSize() 트리거용 nonce */
  const [invalidateNonce, setInvalidateNonce] = useState(0);
  /** "이 지역에서 검색" 1회성 코치마크 */
  const [showSearchCoachmark, setShowSearchCoachmark] = useState(false);
  const [subwayOverlayEnabled, setSubwayOverlayEnabled] = useState(false);
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
  const hotspotPanOnlyRef = useRef(false);
  const forceSearchRef = useRef(false);
  const initialFetchDoneRef = useRef(false);
  const searchedBoundsRef = useRef<MapBounds | null>(null);
  const lastFocusedSelectionRef = useRef<string | null>(null);
  const browseFiltersRef = useRef(browseFilters);
  const lastTextSearchQRef = useRef("");
  const mapFetchAbortRef = useRef<AbortController | null>(null);
  const fetchGenerationRef = useRef(0);
  const autoSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const viewportDirtyRef = useRef(false);
  const boundsRef = useRef<MapBounds | null>(null);

  useEffect(() => {
    return () => {
      mapFetchAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    browseFiltersRef.current = browseFilters;
  }, [browseFilters]);

  useEffect(() => {
    viewportDirtyRef.current = viewportDirty;
  }, [viewportDirty]);

  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  const clearAutoSearchDebounce = useCallback(() => {
    if (autoSearchDebounceRef.current != null) {
      window.clearTimeout(autoSearchDebounceRef.current);
      autoSearchDebounceRef.current = null;
    }
  }, []);

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

  useEffect(() => {
    markMapPageInit();
  }, []);

  useEffect(() => {
    if (!loading && items.length > 0) {
      markMapPageUsable();
    }
  }, [loading, items.length]);

  useEffect(() => {
    setSubwayOverlayEnabled(readSubwayOverlayEnabled());
  }, []);

  const handleSubwayOverlayChange = useCallback((enabled: boolean) => {
    setSubwayOverlayEnabled(enabled);
    writeSubwayOverlayEnabled(enabled);
  }, []);

  // 레이아웃 전환(데스크톱↔모바일)·바텀시트 스냅·peek 크롬 높이 변경 후 지도 타일 재계산
  useEffect(() => {
    setInvalidateNonce((n) => n + 1);
  }, [isMobile, sheetSnap, peekChromeHeight]);

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
    async (b: MapBounds | null, f: MapBrowseFilters): Promise<boolean> => {
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
        if (generation !== fetchGenerationRef.current) return false;

        const ct = res.headers.get("content-type") ?? "";
        if (!res.ok || !ct.includes("application/json")) {
          failToast();
          return false;
        }
        let data: {
          ok?: boolean;
          data?: {
            items?: Item[];
            facets?: Facets;
            matchTotal?: number;
            mapPlottableTotal?: number;
            serviceRegionTotal?: number;
            locationUnknownTotal?: number;
            locationUnknownIds?: string[];
          };
        };
        try {
          data = (await res.json()) as typeof data;
        } catch {
          if (generation !== fetchGenerationRef.current) return false;
          failToast();
          return false;
        }
        if (generation !== fetchGenerationRef.current) return false;
        if (data?.ok && data.data) {
          const next = Array.isArray(data.data.items) ? data.data.items : [];
          setItems(next);
          setMatchTotal(
            typeof data.data.matchTotal === "number"
              ? data.data.matchTotal
              : next.length,
          );
          setMapPlottableTotal(
            typeof data.data.mapPlottableTotal === "number"
              ? data.data.mapPlottableTotal
              : next.filter(itemShowsMapPin).length,
          );
          setServiceRegionTotal(
            typeof data.data.serviceRegionTotal === "number"
              ? data.data.serviceRegionTotal
              : next.filter(
                  (i) => resolveItemMapDisplayMode(i) === "service_region",
                ).length,
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
          return true;
        }
        failToast();
        return false;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return false;
        if (generation !== fetchGenerationRef.current) return false;
        failToast();
        return false;
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
      const ok = isMapTextSearchActive(f)
        ? await fetchItems(null, f)
        : await fetchItems(b, f);
      if (!ok) return;
      setSearchedBounds(b);
      searchedBoundsRef.current = b;
      setViewportDirty(false);
    },
    [fetchItems],
  );

  /** /media/map 진입 즉시 전국 개요 영역 검색 — 빈 지도 방지 */
  useEffect(() => {
    if (initialFetchDoneRef.current) return;
    initialFetchDoneRef.current = true;
    const f = browseFiltersRef.current;
    void (async () => {
      if (isMapTextSearchActive(f)) {
        await fetchItems(null, f);
        return;
      }
      const ok = await fetchItems(KOREA_MAP_OVERVIEW_BOUNDS, f);
      if (!ok) return;
      setSearchedBounds(KOREA_MAP_OVERVIEW_BOUNDS);
      searchedBoundsRef.current = KOREA_MAP_OVERVIEW_BOUNDS;
    })();
  }, [fetchItems]);

  const handleBoundsChange = useCallback(
    (b: MapBounds) => {
      setBounds(b);
      if (forceSearchRef.current) {
        forceSearchRef.current = false;
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
    if (hotspotPanOnlyRef.current) {
      hotspotPanOnlyRef.current = false;
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
    const plottable = items.filter(itemShowsMapPin);
    const fromItems = plottable.flatMap((i) => mapMarkersForMapCatalogItem(i));
    if (!selectedItem || !itemShowsMapPin(selectedItem)) return fromItems;
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
    const mediaId = resolveMediaIdFromMapPinId(selectedId);
    const el = listItemRefs.current.get(mediaId);
    if (!el) return;
    el.scrollIntoView({
      block: isMobile ? "center" : "nearest",
      behavior: "smooth",
    });
  }, [selectedId, items, isMobile]);

  const handleUserViewportAdjusted = useCallback(() => {
    setViewportDirty(true);
  }, []);

  /** Pan/zoom 종료 후 debounce → bounds 10% 이상 변화 시 자동 재조회 */
  useEffect(() => {
    clearAutoSearchDebounce();

    if (isMapTextSearchActive(browseFilters)) return;
    if (!viewportDirty || !bounds || !searchedBounds) return;
    if (!mapBoundsChangeExceedsThreshold(searchedBounds, bounds)) return;

    autoSearchDebounceRef.current = window.setTimeout(() => {
      autoSearchDebounceRef.current = null;
      if (!viewportDirtyRef.current) return;
      const b = boundsRef.current;
      const s = searchedBoundsRef.current;
      if (!b || !s) return;
      if (isMapTextSearchActive(browseFiltersRef.current)) return;
      if (
        !mapBoundsChangeExceedsThreshold(
          s,
          b,
          MAP_AUTO_SEARCH_BOUNDS_CHANGE_THRESHOLD,
        )
      ) {
        return;
      }
      setAutoRefreshing(true);
      void runSearch(b).finally(() => setAutoRefreshing(false));
    }, MAP_AUTO_SEARCH_DEBOUNCE_MS);

    return clearAutoSearchDebounce;
  }, [
    bounds,
    viewportDirty,
    searchedBounds,
    browseFilters.q,
    runSearch,
    clearAutoSearchDebounce,
  ]);

  useEffect(() => () => clearAutoSearchDebounce(), [clearAutoSearchDebounce]);

  const dismissSearchCoachmark = useCallback(() => {
    markMapOnboardingSeen(MAP_ONBOARDING_KEYS.searchCoachmark);
    setShowSearchCoachmark(false);
  }, []);

  const handleSearchThisArea = useCallback(() => {
    dismissSearchCoachmark();
    markMapOnboardingSeen(MAP_ONBOARDING_KEYS.searchNudge);
    clearAutoSearchDebounce();
    setAutoRefreshing(false);
    if (!bounds) return;
    void runSearch(bounds);
  }, [bounds, runSearch, dismissSearchCoachmark, clearAutoSearchDebounce]);

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
      if (!item || !itemShowsMapPin(item)) return;
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

  const handleClosePinPopup = useCallback(() => {
    setSelectedId(null);
    setSelectedItem(null);
    lastFocusedSelectionRef.current = null;
    setMapHoveredMediaId(null);
  }, []);

  const selected = selectedItem;

  const isInCompare = useCallback(
    (id: string) => compareEntries.some((e) => e.id === id),
    [compareEntries],
  );
  const { count: planCount } = usePlanCart();
  const floatingBarOffset = planCount > 0 || compareEntries.length > 0;

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

  const openCompareSummary = useCallback(() => {
    const ids = compareEntries.map((e) => e.id).join(",");
    if (!ids) return;
    router.push(`/compare?ids=${ids}`);
  }, [compareEntries, router]);

  const patchBrowseFilters = useCallback((patch: Partial<MapBrowseFilters>) => {
    setBrowseFilters((f) => ({ ...f, ...patch }));
  }, []);

  const handleHotspotRegionSelect = useCallback(
    (regionMain: string, regionSub: string) => {
      hotspotPanOnlyRef.current = true;
      patchBrowseFilters({ regionMain, regionSub });
      const mapView = resolveBrowseRegionMapView(regionMain, regionSub);
      if (mapView) {
        if (mapView.fitBounds) {
          emitProgrammaticView({
            lat: mapView.lat,
            lng: mapView.lng,
            zoom: mapView.zoom,
            fitBounds: mapView.fitBounds,
            fitBoundsMaxZoom: mapView.fitBoundsMaxZoom ?? 16,
          });
        } else {
          emitProgrammaticView({
            lat: mapView.lat,
            lng: mapView.lng,
            zoom: mapView.zoom,
          });
        }
        setViewportDirty(true);
      }
    },
    [patchBrowseFilters, emitProgrammaticView],
  );

  const handleBrowseViewModeChange = useCallback(
    (mode: DiscoveryFilterBarViewMode) => {
      if (mode === "map") {
        setSheetSnap("peek");
        return;
      }
      if (mode === "feed" && isMobile) {
        setSheetSnap("full");
        return;
      }
      const qs = mapBrowseFiltersToMediaBrowseQueryString(browseFilters);
      router.push(qs ? `/media?${qs}` : "/media");
    },
    [router, browseFilters, isMobile],
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

  const mapChromeVisible = !isMobile || sheetSnap === "peek";
  const pinPreviewOpen = !!selected && isMobile && sheetSnap !== "full";

  useEffect(() => {
    if (!showSearchAreaButton || !mapChromeVisible) {
      setShowSearchCoachmark(false);
      return;
    }
    if (!hasSeenMapOnboarding(MAP_ONBOARDING_KEYS.searchCoachmark)) {
      setShowSearchCoachmark(true);
    }
  }, [showSearchAreaButton, mapChromeVisible]);

  useEffect(() => {
    if (!showSearchAreaButton || !mapChromeVisible) return;
    if (hasSeenMapOnboarding(MAP_ONBOARDING_KEYS.searchNudge)) return;
    const timer = window.setTimeout(() => {
      if (hasSeenMapOnboarding(MAP_ONBOARDING_KEYS.searchNudge)) return;
      markMapOnboardingSeen(MAP_ONBOARDING_KEYS.searchNudge);
      toast.info(
        isKo
          ? "「이 지역에서 검색」을 눌러 이 영역의 매체를 불러오세요."
          : "Tap “Search this area” to load media here.",
      );
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [showSearchAreaButton, mapChromeVisible, isKo, toast]);

  const locateFloatingButtons = (mobileCompact = false) => (
    <>
      <MapFloatingButton
        icon={Crosshair}
        onClick={handleLocateMe}
        disabled={locating}
        compact={mobileCompact}
        iconClassName={locating ? "animate-pulse" : undefined}
        className={cn("md:hidden", !mobileCompact && "gap-1 px-2.5")}
        aria-label={isKo ? "내 주변" : "Near me"}
        title={isKo ? "내 주변 매체 보기" : "Show media near me"}
      >
        {mobileCompact
          ? null
          : locating
            ? isKo
              ? "확인…"
              : "…"
            : isKo
              ? "내 주변"
              : "Near me"}
      </MapFloatingButton>
      <MapFloatingButton
        icon={Crosshair}
        onClick={handleLocateMe}
        disabled={locating}
        className="hidden md:inline-flex"
        aria-label={isKo ? "내 주변" : "Near me"}
        title={isKo ? "내 주변 매체 보기" : "Show media near me"}
      >
        {locating
          ? isKo
            ? "확인 중…"
            : "Locating…"
          : isKo
            ? "내 주변"
            : "Near me"}
      </MapFloatingButton>
    </>
  );

  // 컨트롤 바 — PR1 의 단일 반응형 컴포넌트 재사용(unifiedToolbar). 지도용으로 복제하지 않음.
  const controlBar = (
    <DiscoveryFilterBar
      isKo={isKo}
      unifiedToolbar
      mobileStickyToolbar
      mapPageViewModes
      mapMobileImmersive={isMobile}
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
      viewMode={isMobile ? (sheetSnap === "full" ? "feed" : "map") : "map"}
      onViewModeChange={handleBrowseViewModeChange}
      resultCount={items.length}
      totalCount={matchTotal}
      loading={loading || (!searchedBounds && !isMapTextSearchActive(browseFilters))}
      compareCount={compareEntries.length}
      onCompareSummaryClick={openCompareSummary}
      cartCount={planCount}
      showHotspotRegions
      onHotspotRegionSelect={handleHotspotRegionSelect}
    />
  );

  const listEl = (
    <MediaMapItemList
      items={items}
      loading={loading}
      isKo={isKo}
      locale={locale}
      isMobile={isMobile}
      selectedId={selectedId}
      searchedBounds={searchedBounds}
      isTextSearchActive={isMapTextSearchActive(browseFilters)}
      compareEntries={compareEntries}
      listItemRefs={listItemRefs}
      onSelect={handleSelect}
      onToggleCompare={toggleCompare}
      isInCompare={isInCompare}
    />
  );

  const mapPinCount =
    mapPlottableTotal ?? items.filter(itemShowsMapPin).length;
  const serviceRegionInView =
    serviceRegionTotal ??
    items.filter((i) => resolveItemMapDisplayMode(i) === "service_region")
      .length;
  const locationUnknownInView = items.filter(
    (i) => resolveItemMapDisplayMode(i) === "location_unknown",
  ).length;

  const mapResultLabel = (() => {
    const hasExtra =
      serviceRegionInView > 0 || locationUnknownInView > 0;
    if (!hasExtra) {
      return formatMapViewCountLabel(items.length, matchTotal, isKo);
    }
    const parts = [
      isKo ? `목록 ${items.length}개` : `${items.length} listed`,
      isKo ? `지도 ${mapPinCount}개` : `${mapPinCount} on map`,
    ];
    if (serviceRegionInView > 0) {
      parts.push(
        isKo
          ? `서비스지역 ${serviceRegionInView}`
          : `${serviceRegionInView} service region`,
      );
    }
    if (locationUnknownInView > 0) {
      parts.push(
        isKo
          ? `위치 미확인 ${locationUnknownInView}`
          : `${locationUnknownInView} location unknown`,
      );
    }
    return parts.join(" · ");
  })();

  const showMapEmptyOverlay =
    (searchedBounds || isMapTextSearchActive(browseFilters)) &&
    items.length === 0 &&
    !loading;

  // 모바일 시트 상단 — 결과 수 + 목록↔지도 토글 (immersive 시 상단에서 이동)
  const mobileSheetHeader = (
    <div className="flex min-h-0 items-center justify-between gap-2 leading-tight">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p className="tkad-type-meta min-w-0 truncate font-semibold text-foreground">
          {showMapEmptyOverlay
            ? isKo
              ? "이 영역 0개"
              : "0 in this area"
            : mapResultLabel}
        </p>
        {showMapEmptyOverlay ? (
          <p className="tkad-type-note shrink-0 text-tkad-muted">
            {isKo ? "지도 이동·필터 조정" : "Pan or filter"}
          </p>
        ) : null}
      </div>
      <div
        className="flex shrink-0 overflow-hidden rounded-lg border border-gray-200 dark:border-white/10"
        onPointerDown={(e) => e.stopPropagation()}
        data-screenshot="media-map-sheet-view-toggle"
      >
        <button
          type="button"
          onClick={() => handleBrowseViewModeChange("feed")}
          aria-label={isKo ? "목록 보기" : "List view"}
          aria-pressed={sheetSnap === "full"}
          className={cn(
            "flex items-center gap-1 px-2 py-1 text-xs leading-[1.375] font-medium transition-colors",
            sheetSnap === "full"
              ? "bg-[color:var(--qp-accent)] !text-white"
              : "tkad-type-meta text-gray-600 dark:text-white/70",
          )}
        >
          <LayoutList className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{isKo ? "목록" : "List"}</span>
        </button>
        <button
          type="button"
          onClick={() => handleBrowseViewModeChange("map")}
          aria-label={isKo ? "지도 보기" : "Map view"}
          aria-pressed={sheetSnap === "peek"}
          className={cn(
            "flex items-center gap-1 px-2 py-1 text-xs leading-[1.375] font-medium transition-colors",
            sheetSnap === "peek"
              ? "bg-[color:var(--qp-accent)] !text-white"
              : "tkad-type-meta text-gray-600 dark:text-white/70",
          )}
        >
          <MapIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{isKo ? "지도" : "Map"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="tkad-media-app-shell tkad-media-map-shell relative flex w-full min-w-0 flex-col bg-gray-50 dark:bg-[#020202]">
      <MapChunkPrefetch />
      {/* 상단(flex-none): 단일 반응형 컨트롤 바 (항상 고정) */}
      <div
        className={cn(
          "flex-none border-b border-gray-200/80 bg-gray-50/95 backdrop-blur dark:border-white/10 dark:bg-[#020202]/95",
          isMobile ? "px-3 py-1" : "px-3 pt-1.5 pb-1.5 md:px-4",
        )}
      >
        {controlBar}
      </div>

      {/* 본문(flex-1, min-h-0): 데스크톱 = 리스트 + 지도 / 모바일 = 지도 풀 + 바텀시트 */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
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
              onSelect={handleSelect}
              onBoundsChange={handleBoundsChange}
              onViewChange={handleViewChange}
              onUserViewportAdjusted={handleUserViewportAdjusted}
              programmaticView={programmaticView}
              userLocation={userLocation}
              invalidateNonce={invalidateNonce}
              themeAwareTiles
              subwayOverlayEnabled={subwayOverlayEnabled}
            />
          </div>

          {showMapEmptyOverlay && mapChromeVisible ? (
            <MediaMapFloatingEmptyState
              isKo={isKo}
              className="pointer-events-none absolute inset-x-4 top-[38%] z-[12] -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2"
            />
          ) : null}

          {autoRefreshing && mapChromeVisible ? (
            <div
              className={cn(
                mapFloatingPanelClass(
                  "pointer-events-none absolute z-[47] inline-flex items-center gap-1.5 px-2.5 py-1.5",
                ),
                "right-3 top-3 sm:right-4 sm:top-4 md:top-14",
              )}
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="h-3.5 w-3.5 shrink-0 animate-spin text-[color:var(--qp-accent)]"
                aria-hidden
              />
              <span className="tkad-type-meta font-medium text-foreground">
                {isKo ? "지역 데이터 갱신 중…" : "Updating area…"}
              </span>
            </div>
          ) : null}

          {showSearchAreaButton && mapChromeVisible ? (
            <div className="pointer-events-none absolute left-1/2 top-3 z-[11] -translate-x-1/2 sm:top-4">
              <div className="relative" data-map-onboarding="search-area">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-1 rounded-full bg-[color:var(--qp-accent)]/30 motion-safe:animate-ping"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSearchThisArea}
                  className="pointer-events-auto relative inline-flex h-10 items-center gap-2 rounded-full border border-[color:var(--qp-accent)]/80 bg-[color:var(--qp-accent)] px-4 text-xs leading-[1.375] font-semibold !text-white shadow-lg shadow-[color:var(--qp-accent)]/30 backdrop-blur-md transition-colors hover:bg-[color:var(--qp-accent-hover)] disabled:opacity-70 motion-safe:animate-pulse dark:border-[color:var(--qp-accent)]/70 dark:bg-[color:var(--qp-accent)] dark:hover:bg-[color:var(--qp-accent-hover)]"
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
                <MapOnboardingCoachmark
                  open={showSearchCoachmark}
                  title={
                    isKo ? "지도를 움직였나요?" : "Moved the map?"
                  }
                  description={
                    isKo
                      ? "버튼을 눌러 이 영역의 매체를 불러오세요."
                      : "Tap the button to load media in this area."
                  }
                  dismissLabel={isKo ? "알겠어요" : "Got it"}
                  onDismiss={dismissSearchCoachmark}
                />
              </div>
            </div>
          ) : null}

          {selected && !isMobile ? (
            <MediaMapDetailSheet
              variant="sheet"
              item={selected}
              onClose={handleClosePinPopup}
              isKo={isKo}
              inCompare={isInCompare(selected.id)}
              onToggleCompare={() => toggleCompare(selected)}
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

          {pinPreviewOpen ? (
            <MediaMapDetailSheet
              variant="dock"
              item={selected}
              onClose={handleClosePinPopup}
              isKo={isKo}
              inCompare={isInCompare(selected.id)}
              onToggleCompare={() => toggleCompare(selected)}
              className="z-[45] max-h-[min(32dvh,200px)]"
              style={{ bottom: peekChromeHeight + 8 }}
            />
          ) : null}

          {mapChromeVisible ? (
            <MediaMapVisibilityLegend
              isKo={isKo}
              className="absolute bottom-3 left-3 z-[10] max-w-[168px] sm:bottom-4 sm:left-4"
              showSubwayToggle
              subwayEnabled={subwayOverlayEnabled}
              onSubwayEnabledChange={handleSubwayOverlayChange}
            />
          ) : null}

          <div className="pointer-events-none absolute right-3 top-3 z-[46] hidden flex-col gap-2 sm:right-4 sm:top-4 md:flex">
            {mapChromeVisible ? (
              <>
                <MapFloatingButton
                  icon={ClipboardCheck}
                  onClick={startSurveyMode}
                  className={cn(
                    surveyMode &&
                      "border-[color:var(--qp-accent)]/45 bg-[color:var(--qp-accent-soft)] dark:bg-[color:var(--qp-accent)]/15",
                  )}
                  aria-label={isKo ? "답사 모드" : "Field survey"}
                >
                  {isKo ? "답사" : "Survey"}
                </MapFloatingButton>
                <Link
                  href="/media"
                  className={cn(
                    mapFloatingPanelClass(
                      "pointer-events-auto tkad-type-meta h-10 items-center gap-1.5 px-3.5 font-medium text-foreground transition-colors hover:bg-card inline-flex",
                    ),
                  )}
                  aria-label={isKo ? "목록으로" : "List view"}
                >
                  <LayoutList className="h-4 w-4 shrink-0" aria-hidden />
                  {isKo ? "목록" : "List"}
                </Link>
              </>
            ) : null}
            {locateFloatingButtons()}
          </div>

          {isMobile ? (
            <div className="pointer-events-none absolute right-3 top-3 z-[46] sm:right-4 sm:top-4 md:hidden">
              {locateFloatingButtons(sheetSnap === "full")}
            </div>
          ) : null}

          {mapChromeVisible ? (
            <MapFloatingButton
              icon={ClipboardCheck}
              compact
              onClick={startSurveyMode}
              className={cn(
                "pointer-events-auto absolute left-3 top-3 z-[46] md:hidden",
                surveyMode &&
                  "border-[color:var(--qp-accent)]/45 bg-[color:var(--qp-accent-soft)] dark:bg-[color:var(--qp-accent)]/15",
              )}
              aria-label={isKo ? "답사 모드" : "Field survey"}
            />
          ) : null}
        </div>

        {isMobile && sheetSnap === "full" ? (
          <button
            type="button"
            className="absolute inset-0 z-[35] bg-black/20 md:hidden"
            aria-label={isKo ? "지도로 돌아가기" : "Back to map"}
            onClick={() => setSheetSnap("peek")}
          />
        ) : null}

        {/* 모바일 리스트 바텀시트 (peek / full) */}
        {isMobile ? (
          <MediaMapListSheet
            snap={sheetSnap}
            onSnapChange={handleSheetSnapChange}
            isKo={isKo}
            header={mobileSheetHeader}
            onPeekChromeHeightChange={setPeekChromeHeight}
          >
            {listEl}
          </MediaMapListSheet>
        ) : null}
      </div>

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
