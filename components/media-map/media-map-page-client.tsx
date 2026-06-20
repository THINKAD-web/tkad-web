"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ClipboardCheck, Crosshair, LayoutList } from "lucide-react";
import { FieldSurveyPanel } from "@/components/media-map/field-survey-panel";
import {
  formatMediaPriceWithPeriodSuffix,
} from "@/lib/media-price-format";
import { cn } from "@/lib/utils";
import type { MapBounds, MapMarker } from "@/components/public-map/map-types";
import type { MapViewCommand } from "@/components/media-map/kakao-map-view";
import {
  mapMarkersForMapCatalogItem,
  resolveMediaIdFromMapPinId,
} from "@/lib/media-detail-map-markers";
import { useAppToast } from "@/lib/use-toast";
import { MediaThumbnailTrustOverlay } from "@/components/media/media-thumbnail-trust-overlay";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import CompareBar from "@/components/compare-bar";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
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
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
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
  mapBrowseFiltersToApiParams,
  mapBrowseFiltersToUrlState,
  type MapBrowseFilters,
} from "@/lib/media-map/browse-filters";
import {
  MediaManualBrowseFilters,
  type MediaManualBrowseViewMode,
} from "@/components/media/media-manual-browse-filters";

function MapViewLoadingPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-[#0a0a12]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-violet-500 dark:border-white/20 dark:border-t-violet-400" />
        <p className="text-sm text-gray-500 dark:text-white/50">지도 불러오는 중…</p>
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
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
          </div>
        </li>
      ))}
    </>
  );
}

const KakaoMapView = dynamic(
  () => import("@/components/media-map/kakao-map-view"),
  {
    ssr: false,
    loading: () => <MapViewLoadingPlaceholder />,
  },
);

type Item = MapMapItem;

type Facets = { regions: string[]; types: string[] };

const VIEW_MODE_STORAGE_KEY = "tkad_media_view_mode";

const CART_KEY = "tkad-media-cart-v1";

/** 마커/카드 선택 시 클로즈업 줌(카카오 레벨, 작을수록 확대). 현재보다 확대만 적용. */
const MARKER_FOCUS_ZOOM = 4;

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

function formatPrice(v: number, period: string, locale: string): string {
  return formatMediaPriceWithPeriodSuffix(v, period, locale);
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
  const [bounds, setBounds] = useState<MapBounds | null>(null);
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
  // 단일 명령형 뷰 채널(KakaoMapView.command) — 모든 지도 이동(focus)을 한 곳에서 nonce 로
  // 보낸다. 기존 programmaticView/panOnSelect 의 effect 경쟁(드래그·줌 리셋, 마커 클릭 줌인
  // 누락)을 제거. "내 주변"·지역 이동·답사·URL 하이드레이션·마커 선택이 모두 이 채널을 경유.
  const cmdNonceRef = useRef(0);
  const [mapCommand, setMapCommand] = useState<MapViewCommand>(() => {
    const init = initialUrl.current;
    if (init && init.lat != null && init.lng != null) {
      cmdNonceRef.current = 1;
      return {
        type: "focusMarker",
        lat: init.lat,
        lng: init.lng,
        level: init.zoom ?? 8,
        nonce: 1,
      };
    }
    return null;
  });
  const emitMapCommand = useCallback(
    (cmd: { lat: number; lng: number; level: number }) => {
      cmdNonceRef.current += 1;
      setMapCommand({
        type: "focusMarker",
        lat: cmd.lat,
        lng: cmd.lng,
        level: cmd.level,
        nonce: cmdNonceRef.current,
      });
    },
    [],
  );
  const itemsRef = useRef<Item[]>([]);
  const markersRef = useRef<MapMarker[]>([]);
  const viewRef = useRef<{ lat: number; lng: number; zoom: number } | null>(
    null,
  );
  const listItemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const regionPanSkipRef = useRef(true);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const init = initialUrl.current;
    if (!init || (init.lat != null && init.lng != null)) return;
    const bf = initMapBrowseFiltersFromUrl(init);
    const mapView = resolveBrowseRegionMapView(bf.regionMain, bf.regionSub);
    if (!mapView) return;
    emitMapCommand({ lat: mapView.lat, lng: mapView.lng, level: mapView.zoom });
  }, [emitMapCommand]);

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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchItems = useCallback(
    async (b: MapBounds | null, f: MapBrowseFilters) => {
      setLoading(true);
      try {
        const qs = mapBrowseFiltersToApiParams(f);
        if (b) {
          qs.set("swLat", String(b.swLat));
          qs.set("swLng", String(b.swLng));
          qs.set("neLat", String(b.neLat));
          qs.set("neLng", String(b.neLng));
        }

        const res = await fetch(`/api/media/map?${qs.toString()}`, { cache: "no-store" });
        const ct = res.headers.get("content-type") ?? "";
        if (!res.ok || !ct.includes("application/json")) {
          return;
        }
        let data: {
          ok?: boolean;
          data?: { items?: Item[]; facets?: Facets; matchTotal?: number };
        };
        try {
          data = (await res.json()) as typeof data;
        } catch {
          return;
        }
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
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!bounds) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchItems(bounds, browseFilters), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [bounds, browseFilters, fetchItems]);

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
    emitMapCommand({ lat: mapView.lat, lng: mapView.lng, level: mapView.zoom });
  }, [browseFilters.regionMain, browseFilters.regionSub, emitMapCommand]);

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

  // 마커 클릭 시 즉시 selectedId + selectedItem을 한 번에 set (지연 없이 카드 표시)
  // itemsRef/markersRef 를 사용해 stale closure 를 회피한다 (items가 자주 바뀌어도 안전)
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      const mediaId = resolveMediaIdFromMapPinId(id);
      const item = itemsRef.current.find((i) => i.id === mediaId);
      if (item) setSelectedItem(item);
      // 선택한 핀으로 클로즈업(pan + zoom-in). 명령 채널의 focusMarker 가 단일 실행.
      // 현재보다 확대만 — 이미 가까우면 줌아웃하지 않는다.
      // 지도 마커 클릭은 핀 id 가 정확히 일치하고, 목록 카드 클릭(매체 id)은 복수 설치
      // 매체의 첫 핀으로 폴백한다.
      const mk =
        markersRef.current.find((m) => m.id === id) ??
        markersRef.current.find(
          (m) => resolveMediaIdFromMapPinId(m.id) === mediaId,
        );
      if (mk) {
        const cur = viewRef.current?.zoom;
        const level =
          cur != null ? Math.min(cur, MARKER_FOCUS_ZOOM) : MARKER_FOCUS_ZOOM;
        emitMapCommand({ lat: mk.lat, lng: mk.lng, level });
      }
    },
    [emitMapCommand],
  );

  const selected = selectedItem;

  const inCart = useCallback((id: string) => cartIds.includes(id), [cartIds]);
  const isInCompare = useCallback(
    (id: string) => compareEntries.some((e) => e.id === id),
    [compareEntries],
  );
  const toast = useAppToast();
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
    (mode: MediaManualBrowseViewMode) => {
      if (mode === "map") return;
      try {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
      } catch {
        /* ignore */
      }
      router.push("/media");
    },
    [router],
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
        emitMapCommand({ lat, lng, level: 5 });
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
  }, [toast, emitMapCommand]);

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

  // 마커 선택 시 클로즈업 줌을 "현재보다 확대만"으로 계산하기 위해 최신 view 를 ref 로 보관
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  return (
    <>
    <div className="flex flex-col md:h-[calc(100vh-72px)] md:flex-row md:min-h-0">
        {/* 지도 — 모바일: 상단 / 데스크톱: 우측 */}
        <div className="relative order-1 h-[min(50dvh,400px)] min-h-[280px] w-full shrink-0 md:order-2 md:h-auto md:min-h-0 md:flex-1">
          <div className="absolute inset-0 min-h-[280px]">
            <KakaoMapView
              markers={markers}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={handleSelect}
              onBoundsChange={setBounds}
              onViewChange={handleViewChange}
              command={mapCommand}
              userLocation={userLocation}
              monochromeTiles
            />
          </div>

          {selected ? (
            <MediaMapDetailSheet
              variant="sheet"
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
                emitMapCommand({ lat: loc.lat, lng: loc.lng, level: 4 })
              }
              checkedIds={surveyCheckedIds}
              onCheckedChange={setSurveyCheckedIds}
            />
          ) : null}

          <div className="pointer-events-none absolute right-3 top-3 z-[10] flex flex-col gap-2 sm:right-4 sm:top-4">
            <button
              type="button"
              onClick={startSurveyMode}
              className={cn(
                "pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-lg border bg-white/95 px-2.5 text-xs font-medium text-gray-800 shadow-sm backdrop-blur transition-colors hover:bg-white dark:border-white/12 dark:bg-[#0a0a12]/90 dark:text-white dark:hover:bg-[#0a0a12]",
                surveyMode && "border-violet-400/50 bg-violet-50 dark:bg-violet-500/15",
              )}
              aria-label={isKo ? "답사 모드" : "Field survey"}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{isKo ? "답사" : "Survey"}</span>
            </button>
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locating}
              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-gray-800 shadow-sm backdrop-blur transition-colors hover:bg-white disabled:opacity-60 dark:border-white/12 dark:bg-[#0a0a12]/90 dark:text-white md:w-auto md:gap-1.5 md:px-2.5"
              aria-label={isKo ? "내 주변" : "Near me"}
            >
              <Crosshair className={cn("h-3.5 w-3.5", locating && "animate-pulse")} />
              <span className="hidden text-xs font-medium md:inline">
                {locating ? (isKo ? "확인 중…" : "Locating…") : isKo ? "내 주변" : "Near me"}
              </span>
            </button>
            <Link
              href="/media"
              className="pointer-events-auto hidden h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white/95 px-2.5 text-xs font-medium text-gray-800 shadow-sm backdrop-blur transition-colors hover:bg-white dark:border-white/12 dark:bg-[#0a0a12]/90 dark:text-white md:inline-flex"
              aria-label={isKo ? "목록으로" : "List view"}
            >
              <LayoutList className="h-3.5 w-3.5" />
              {isKo ? "목록" : "List"}
            </Link>
          </div>
        </div>

        {/* 매체 리스트 — 모바일: 지도 아래 */}
        <aside className="order-3 w-full border-t border-gray-200/80 bg-gray-50 md:order-1 md:w-[560px] lg:w-[640px] md:flex-shrink-0 md:border-r md:overflow-y-auto dark:border-white/10 dark:bg-[#020202]">
          <div className="sticky top-0 z-10 border-b border-gray-200/80 bg-gray-50/95 backdrop-blur-md dark:border-white/10 dark:bg-[#020202]/95">
            <div className="min-w-0 overflow-x-clip p-3 md:p-4">
              <MediaManualBrowseFilters
                isKo={isKo}
                query={browseFilters.q}
                onQueryChange={(q) => patchBrowseFilters({ q })}
                mainCategory={browseFilters.mainCategory}
                onMainCategoryChange={(mainCategory) =>
                  patchBrowseFilters({ mainCategory, subCategory: "" })
                }
                subCategory={browseFilters.subCategory}
                onSubCategoryChange={(subCategory) =>
                  patchBrowseFilters({ subCategory })
                }
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
                  patchBrowseFilters({
                    sort: sort as MapBrowseFilters["sort"],
                  })
                }
                viewMode="map"
                onViewModeChange={handleBrowseViewModeChange}
                resultCount={items.length}
                totalCount={matchTotal}
                loading={loading || !bounds}
                compareCount={compareEntries.length}
                cartCount={cartIds.length}
              />
            </div>
          </div>

        <ul className="grid grid-cols-2 gap-3 p-3 pb-8 md:gap-4 md:p-4">
          {!bounds || loading ? (
            <MapListSkeleton count={!bounds ? 4 : 6} />
          ) : (
            items.map((it) => {
            const thumb = catalogThumbnailImageProps(it.image);
            const locationLine = [it.district, it.region].filter(Boolean).join(" · ") || it.location;
            return (
            <li
              key={it.id}
              ref={(el) => {
                if (el) listItemRefs.current.set(it.id, el);
                else listItemRefs.current.delete(it.id);
              }}
              role="button"
              tabIndex={0}
              className={cn(
                "cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-white/5",
                resolveMediaIdFromMapPinId(selectedId ?? "") === it.id
                  ? "border-violet-400/60 ring-2 ring-violet-400/20"
                  : resolveMediaIdFromMapPinId(hoveredId ?? "") === it.id
                    ? "border-cyan-400/40"
                    : "",
              )}
              onClick={() => handleSelect(it.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(it.id);
                }
              }}
              onMouseEnter={() => setHoveredId(it.id)}
              onMouseLeave={() => setHoveredId((cur) => (cur === it.id ? null : cur))}
              onFocus={() => setHoveredId(it.id)}
              onBlur={() => setHoveredId((cur) => (cur === it.id ? null : cur))}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                {thumb ? (
                  <Image
                    src={thumb.src}
                    alt={it.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 280px"
                    unoptimized={thumb.unoptimized}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-300 dark:text-white/20">
                    {isKo ? "준비중" : "No image"}
                  </div>
                )}
                <MediaThumbnailTrustOverlay
                  item={{
                    isVerified: it.isVerified,
                    isInstantBooking: it.isInstantBooking,
                  }}
                  isKo={isKo}
                  variant="card"
                />
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {it.name}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-white/45">
                  {locationLine}
                </p>
                <p className="mt-2 text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                  {formatPrice(it.price, it.pricePeriod, locale)}
                </p>
                <MediaPriceExclNote isKo={isKo} className="mt-0.5" />
              </div>
            </li>
            );
          })
          )}
          {bounds && items.length === 0 && !loading && (
            <li className="col-span-2 p-8 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm font-medium text-foreground mb-1">검색 결과가 없습니다</p>
              <p className="text-xs text-muted-foreground">필터를 조정하거나 지도를 이동해보세요.</p>
            </li>
          )}
          </ul>
        </aside>

      </div>

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
    </>
  );
}
