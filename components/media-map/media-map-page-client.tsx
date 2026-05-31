"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ClipboardCheck, Crosshair, LayoutList, Search, X } from "lucide-react";
import { FieldSurveyPanel } from "@/components/media-map/field-survey-panel";
import {
  formatMediaPriceWithPeriodSuffix,
} from "@/lib/media-price-format";
import { cn } from "@/lib/utils";
import type { MapBounds, MapMarker } from "@/components/public-map/map-types";
import {
  mapMarkersForMapCatalogItem,
  resolveMediaIdFromMapPinId,
} from "@/lib/media-detail-map-markers";
import { useAppToast } from "@/lib/use-toast";
import {
  MEDIA_CHIP_ACTIVE,
  MEDIA_CHIP_INACTIVE,
  MEDIA_REGION_CHIPS,
  MEDIA_SEARCH_SORT_OPTIONS,
  MEDIA_TYPE_CHIPS,
} from "@/lib/media-discovery-filter-chips";
import { MediaFilterChipLabel } from "@/components/media/media-filter-chip-label";
import { MediaThumbnailTrustOverlay } from "@/components/media/media-thumbnail-trust-overlay";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import CompareBar from "@/components/compare-bar";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { planCartItemFromCatalog } from "@/lib/plan-cart-item-builders";
import type { MediaItem } from "@/lib/media-data";
import {
  entriesToCompareMediaItems,
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  type CompareCartEntry,
} from "@/lib/compare-cart-client";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { MediaMapDetailSheet } from "@/components/media-map/media-map-detail-sheet";
import type { MapMapItem } from "@/components/media-map/media-map-types";
import {
  buildMediaMapSearchString,
  parseMediaMapUrlState,
  replaceUrlSearch,
} from "@/lib/media-map/url-state";

function NeonLoadingCard({ label }: { label: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[22px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/40 dark:bg-white/8 bg-gray-100 px-6 py-10 dark:text-white text-gray-900 shadow-[0_28px_120px_rgba(0,0,0,0.55)] backdrop-blur">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-16 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.28),transparent_55%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.22),transparent_55%),radial-gradient(circle_at_left,rgba(236,72,153,0.18),transparent_60%)]"
      />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-4">
        <div className="rounded-2xl border dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 px-3 py-1 font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-700">
          LOADING
        </div>
        <div className="text-sm font-semibold dark:text-white text-gray-800">{label}</div>
        <div className="h-2 w-full overflow-hidden rounded-full border dark:border-white/12 border-gray-200 dark:bg-black bg-white/20">
          <div className="h-full w-[42%] animate-[tkadShimmer_1.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,#a855f7,#22d3ee,#ec4899)]" />
        </div>
      </div>
    </div>
  );
}

const DarkMapView = dynamic(() => import("@/components/public-map/dark-map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-transparent p-4">
      <NeonLoadingCard label="지도 불러오는 중…" />
    </div>
  ),
});

type Item = MapMapItem;

type Facets = { regions: string[]; types: string[] };

type Filter = {
  category: string;
  region: string;
  q: string;
  sort: "popular" | "newest" | "price_asc" | "price_desc";
};

const CART_KEY = "tkad-media-cart-v1";

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
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [facets, setFacets] = useState<Facets>({ regions: [], types: [] });
  const [loading, setLoading] = useState(false);
  const initialUrl = useRef(readInitialUrlState());
  const [filter, setFilter] = useState<Filter>(() => {
    const init = initialUrl.current;
    return {
      category: init?.category ?? "",
      region: init?.region ?? "",
      q: init?.q ?? "",
      sort: (() => {
        const s = init?.sort;
        if (s === "newest" || s === "price_asc" || s === "price_desc") return s;
        if (s === "priceAsc") return "price_asc";
        if (s === "priceDesc") return "price_desc";
        return "popular";
      })(),
    };
  });
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
  /** "내 주변" / URL 하이드레이션으로 지도 중심·줌을 강제 이동시킬 때 사용 */
  const [programmaticView, setProgrammaticView] = useState<{
    lat: number;
    lng: number;
    zoom: number;
    nonce: number;
  } | null>(() => {
    const init = initialUrl.current;
    if (init && init.lat != null && init.lng != null) {
      return {
        lat: init.lat,
        lng: init.lng,
        zoom: init.zoom ?? 8,
        nonce: 1,
      };
    }
    return null;
  });
  const itemsRef = useRef<Item[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

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
        category: filter.category || undefined,
        region: filter.region || undefined,
        q: filter.q || undefined,
        sort: filter.sort !== "popular" ? filter.sort : undefined,
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
    filter.category,
    filter.region,
    filter.q,
    filter.sort,
  ]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchItems = useCallback(
    async (b: MapBounds | null, f: Filter) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (b) {
          qs.set("swLat", String(b.swLat));
          qs.set("swLng", String(b.swLng));
          qs.set("neLat", String(b.neLat));
          qs.set("neLng", String(b.neLng));
        }
        if (f.category) qs.set("category", f.category);
        if (f.region) qs.set("region", f.region);
        if (f.q) qs.set("q", f.q);
        if (f.sort) qs.set("sort", f.sort);

        const res = await fetch(`/api/media/map?${qs.toString()}`, { cache: "no-store" });
        const ct = res.headers.get("content-type") ?? "";
        if (!res.ok || !ct.includes("application/json")) {
          return;
        }
        let data: { ok?: boolean; data?: { items?: Item[]; facets?: Facets } };
        try {
          data = (await res.json()) as typeof data;
        } catch {
          return;
        }
        if (data?.ok && data.data) {
          const next = Array.isArray(data.data.items) ? data.data.items : [];
          setItems(next);
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchItems(bounds, filter), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [bounds, filter, fetchItems]);

  const markers: MapMarker[] = useMemo(
    () => items.flatMap((i) => mapMarkersForMapCatalogItem(i)),
    [items],
  );

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

  // 마커 클릭 시 즉시 selectedId + selectedItem을 한 번에 set (지연 없이 카드 표시)
  // itemsRef를 사용해 stale closure 를 회피한다 (items가 자주 바뀌어도 안전)
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    const mediaId = resolveMediaIdFromMapPinId(id);
    const item = itemsRef.current.find((i) => i.id === mediaId);
    if (item) setSelectedItem(item);
  }, []);

  const selected = selectedItem;

  const inCart = useCallback((id: string) => cartIds.includes(id), [cartIds]);
  const isInCompare = useCallback(
    (id: string) => compareEntries.some((e) => e.id === id),
    [compareEntries],
  );
  const toast = useAppToast();

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

  const activeFilterCount = useMemo(
    () =>
      [filter.category, filter.region, filter.q].filter(Boolean).length,
    [filter],
  );

  const clearFilters = useCallback(() => {
    setFilter((f) => ({
      ...f,
      category: "",
      region: "",
      q: "",
    }));
  }, []);

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
        setProgrammaticView({
          lat,
          lng,
          zoom: 5,
          nonce: Date.now(),
        });
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
  }, [toast]);

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

  return (
    <>
    <div className="flex flex-col md:h-[calc(100vh-72px)] md:flex-row md:min-h-0">
        {/* 지도 — 모바일: 상단 / 데스크톱: 우측 */}
        <div className="relative order-1 h-[min(50dvh,400px)] min-h-[280px] w-full shrink-0 md:order-2 md:h-auto md:min-h-0 md:flex-1">
          <div className="absolute inset-0 min-h-[280px]">
            <DarkMapView
              markers={markers}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={handleSelect}
              onBoundsChange={setBounds}
              onViewChange={handleViewChange}
              programmaticView={programmaticView}
              userLocation={userLocation}
              monochromeTiles
            />
          </div>

          {selected ? (
            <MediaMapDetailSheet
              variant="dock"
              item={selected}
              onClose={() => {
                setSelectedId(null);
                setSelectedItem(null);
              }}
              isKo={isKo}
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
                setProgrammaticView({
                  lat: loc.lat,
                  lng: loc.lng,
                  zoom: 4,
                  nonce: Date.now(),
                })
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
                "pointer-events-auto inline-flex h-10 items-center gap-1.5 rounded-full border px-3 font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-900 shadow-[0_14px_44px_rgba(0,0,0,0.55)] backdrop-blur transition-all max-md:h-9 max-md:justify-center max-md:px-2.5",
                surveyMode
                  ? "border-cyan-400/50 bg-cyan-400/20"
                  : "dark:border-white/14 border-gray-200 dark:bg-black bg-white dark:bg-white/5 bg-gray-500/50 hover:dark:bg-black bg-white/70",
              )}
              aria-label={isKo ? "답사 모드" : "Field survey"}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{isKo ? "답사 모드" : "Survey"}</span>
            </button>
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locating}
              className="pointer-events-auto inline-flex h-10 items-center gap-1.5 rounded-full border dark:border-white/14 border-gray-200 dark:bg-black bg-white dark:bg-white/5 bg-gray-500/50 px-3 font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-900 shadow-[0_14px_44px_rgba(0,0,0,0.55)] backdrop-blur transition-all hover:dark:bg-black bg-white/70 disabled:opacity-60 max-md:h-9 max-md:w-9 max-md:justify-center max-md:px-0"
              aria-label={isKo ? "내 주변" : "Near me"}
            >
              <Crosshair className={`h-3.5 w-3.5 md:h-3.5 ${locating ? "animate-pulse" : ""}`} />
              <span className="hidden md:inline">{locating ? (isKo ? "위치 확인 중…" : "Locating…") : isKo ? "내 주변" : "Near me"}</span>
            </button>
            <Link
              href="/media"
              className="pointer-events-auto hidden h-10 items-center gap-1.5 rounded-full border dark:border-white/14 border-gray-200 dark:bg-black bg-white dark:bg-white/5 bg-gray-500/50 px-3 font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-900 shadow-[0_14px_44px_rgba(0,0,0,0.55)] backdrop-blur transition-all hover:dark:bg-black bg-white/70 md:inline-flex"
              aria-label={isKo ? "목록으로" : "List view"}
            >
              <LayoutList className="h-3.5 w-3.5" />
              {isKo ? "목록으로" : "List"}
            </Link>
          </div>
        </div>

        {/* 매체 리스트 — 모바일: 지도·미리보기 아래 */}
        <aside className="order-3 w-full border-t border-gray-200/80 bg-gray-50 md:order-1 md:w-[560px] lg:w-[640px] md:flex-shrink-0 md:border-r md:overflow-y-auto dark:border-white/10 dark:bg-[#020202]">
          <div className="sticky top-0 z-10 space-y-3 border-b border-gray-200/80 bg-gray-50/95 p-3 text-gray-900 backdrop-blur-md md:p-4 dark:border-white/10 dark:bg-[#020202]/95 dark:text-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-white/30" />
              <input
                type="search"
                placeholder="매체명·지역·유형 검색"
                value={filter.q}
                onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/35 dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder:text-white/30"
              />
              {filter.q ? (
                <button
                  type="button"
                  onClick={() => setFilter((f) => ({ ...f, q: "" }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={isKo ? "검색어 지우기" : "Clear search"}
                >
                  <X className="h-4 w-4 text-gray-400 dark:text-white/40" />
                </button>
              ) : null}
            </div>

            <div>
              <p className="tkad-home-accent-text mb-2 text-xs font-bold">
                {isKo ? "어떤 매체?" : "Media type"}
              </p>
              <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
                {MEDIA_TYPE_CHIPS.map((chip) => (
                  <button
                    key={chip.value || "all"}
                    type="button"
                    onClick={() =>
                      setFilter((f) => ({
                        ...f,
                        category: f.category === chip.value ? "" : chip.value,
                      }))
                    }
                    className={cn(
                      "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                      filter.category === chip.value
                        ? MEDIA_CHIP_ACTIVE
                        : MEDIA_CHIP_INACTIVE,
                    )}
                  >
                    <MediaFilterChipLabel label={chip.label} icon={chip.icon} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-cyan-600 dark:text-cyan-400">
                {isKo ? "어디서?" : "Region"}
              </p>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <div className="scrollbar-hide flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5">
                  {MEDIA_REGION_CHIPS.map((chip) => (
                    <button
                      key={chip.value || "all"}
                      type="button"
                      onClick={() =>
                        setFilter((f) => ({
                          ...f,
                          region: f.region === chip.value ? "" : chip.value,
                        }))
                      }
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                        filter.region === chip.value
                          ? "bg-cyan-500 text-white"
                          : MEDIA_CHIP_INACTIVE,
                      )}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <select
                  value={filter.sort}
                  onChange={(e) =>
                    setFilter((f) => ({
                      ...f,
                      sort: e.target.value as Filter["sort"],
                    }))
                  }
                  className="flex-shrink-0 self-end rounded-xl border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm text-gray-600 focus:outline-none dark:border-white/10 dark:bg-white/8 dark:text-white/70 sm:self-auto"
                >
                  {MEDIA_SEARCH_SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-rose-400"
              >
                <X className="h-3 w-3" />
                {isKo ? "필터 초기화" : "Clear filters"} ({activeFilterCount})
              </button>
            ) : null}

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-white/50">
                {loading
                  ? isKo
                    ? "검색 중..."
                    : "Loading..."
                  : isKo
                    ? `매체 ${items.length}개`
                    : `${items.length} media`}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/70">
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

        <ul className="grid grid-cols-2 gap-3 p-3 pb-8 md:gap-4 md:p-4">
          {items.map((it) => {
            const thumb = catalogThumbnailImageProps(it.image);
            return (
            <li
              key={it.id}
              role="button"
              tabIndex={0}
              className={cn(
                "cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-white/5",
                resolveMediaIdFromMapPinId(selectedId ?? "") === it.id
                  ? "border-violet-400/50 ring-2 ring-violet-400/25"
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
              <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
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
                <p className="mt-1 text-xs text-gray-400 dark:text-white/40">
                  {[it.region, it.type].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="tkad-home-accent-text text-sm font-bold tabular-nums">
                      {formatPrice(it.price, it.pricePeriod, locale)}
                    </p>
                    <MediaPriceExclNote isKo={isKo} className="mt-0.5" />
                  </div>
                  <div className="flex items-stretch gap-1">
                    <PlanCartAddButton
                      item={planCartItemFromCatalog(
                        {
                          id: it.id,
                          name: it.name,
                          type: it.type,
                          region: it.region,
                          price: it.price,
                          thumbnailUrl: it.image ?? undefined,
                        },
                        "search",
                      )}
                      addedFrom="search"
                      compact
                      gridInline
                      className="min-w-0 flex-1 !h-8 !px-1 !text-[10px]"
                    />
                    <MediaCompareSelectButton
                      selected={isInCompare(it.id)}
                      onToggle={() => toggleCompare(it)}
                      gridInline
                      className="min-w-0 flex-1 !h-8 !rounded-lg !px-1 !text-[10px]"
                    />
                    <MediaCartAddButton
                      inCart={inCart(it.id)}
                      onToggle={() => toggleCart(it.id)}
                      gridInline
                      className="min-w-0 flex-1 !h-8 !rounded-lg !px-1 !text-[10px]"
                    />
                  </div>
                </div>
              </div>
            </li>
            );
          })}
          {items.length === 0 && !loading && (
            <li className="col-span-2 p-8 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm font-medium text-foreground mb-1">검색 결과가 없습니다</p>
              <p className="text-xs text-muted-foreground">필터를 조정하거나 지도를 이동해보세요.</p>
            </li>
          )}
          </ul>
        </aside>

      </div>

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
