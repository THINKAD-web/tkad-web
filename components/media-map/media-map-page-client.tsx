"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { MapBounds, MapMarker } from "./kakao-map-view";
import { Spinner } from "@/components/ui/spinner";
import { useAppToast } from "@/lib/use-toast";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import CompareBar from "@/components/compare-bar";
import { FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS } from "@/components/floating-selection-bar";
import type { MediaItem } from "@/lib/media-data";
import {
  entriesToCompareMediaItems,
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  type CompareCartEntry,
} from "@/lib/compare-cart-client";

function NeonLoadingCard({ label }: { label: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[22px] border border-white/12 bg-black/40 px-6 py-10 text-white shadow-[0_28px_120px_rgba(0,0,0,0.55)] backdrop-blur">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-16 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.28),transparent_55%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.22),transparent_55%),radial-gradient(circle_at_left,rgba(236,72,153,0.18),transparent_60%)]"
      />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-4">
        <div className="rounded-2xl border border-white/14 bg-white/8 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/75">
          LOADING
        </div>
        <div className="text-sm font-semibold text-white/90">{label}</div>
        <div className="h-2 w-full overflow-hidden rounded-full border border-white/12 bg-black/20">
          <div className="h-full w-[42%] animate-[tkadShimmer_1.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,#a855f7,#22d3ee,#ec4899)]" />
        </div>
      </div>
    </div>
  );
}

const KakaoMapView = dynamic(() => import("./kakao-map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-transparent p-4">
      <NeonLoadingCard label="지도 불러오는 중…" />
    </div>
  ),
});

type Item = {
  id: string;
  name: string;
  location: string;
  region: string;
  city: string | null;
  district: string | null;
  type: string;
  subCategory: string | null;
  price: number;
  pricePeriod: string;
  createdAt: string | null;
  lat: number;
  lng: number;
  image: string | null;
  availability: string | null;
  visibilityScore: number;
};

type Facets = { regions: string[]; types: string[] };

type Filter = {
  type: string;
  region: string;
  priceMin: string;
  priceMax: string;
  q: string;
  sort: "default" | "newest" | "priceAsc" | "priceDesc" | "trafficDesc";
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

function formatPrice(v: number, period: string): string {
  const krw = new Intl.NumberFormat("ko-KR").format(v);
  const p =
    period === "month" ? "/월" : period === "week" ? "/주" : period === "biweekly" ? "/격주" : period === "day" ? "/일" : "";
  return `₩${krw}${p}`;
}

export default function MediaMapPageClient() {
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [facets, setFacets] = useState<Facets>({ regions: [], types: [] });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>({
    type: "",
    region: "",
    priceMin: "",
    priceMax: "",
    q: "",
    sort: "default",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [compareEntries, setCompareEntriesState] = useState<CompareCartEntry[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const itemsRef = useRef<Item[]>([]);
  const shuffleSeedRef = useRef<number>(
    Math.floor(Date.now() + Math.random() * 1_000_000),
  );

  const stableKey = useCallback((id: string) => {
    // simple stable hash for session-seeded shuffle
    let h = 2166136261;
    const s = `${shuffleSeedRef.current}:${id}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    setCartIds(readCart());
  }, []);

  useEffect(() => {
    setCompareEntriesState(getCompareCartEntries());
    return subscribeCompareCart(() => {
      setCompareEntriesState(getCompareCartEntries());
    });
  }, []);

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
        if (f.type) qs.set("type", f.type);
        if (f.region) qs.set("region", f.region);
        if (f.priceMin) qs.set("priceMin", f.priceMin);
        if (f.priceMax) qs.set("priceMax", f.priceMax);
        if (f.q) qs.set("q", f.q);
        if (f.sort && f.sort !== "default") qs.set("sort", f.sort);

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
          let next = Array.isArray(data.data.items) ? data.data.items : [];
          if (f.sort === "default" && next.length > 1) {
            next = [...next].sort((a, b) => stableKey(a.id) - stableKey(b.id));
          }
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
    [stableKey],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchItems(bounds, filter), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [bounds, filter, fetchItems]);

  const markers: MapMarker[] = useMemo(
    () =>
      items.map((i) => ({
        id: i.id,
        name: i.name,
        lat: i.lat,
        lng: i.lng,
        price: i.price,
        type: i.type,
      })),
    [items],
  );

  // selected를 state에 pin — bounds 변경으로 items가 갱신돼도 팝업 유지
  useEffect(() => {
    if (!selectedId) {
      setSelectedItem(null);
      return;
    }
    const hit = items.find((i) => i.id === selectedId);
    if (hit) setSelectedItem(hit);
  }, [selectedId, items]);

  // 마커 클릭 시 즉시 selectedId + selectedItem을 한 번에 set (지연 없이 카드 표시)
  // itemsRef를 사용해 stale closure 를 회피한다 (items가 자주 바뀌어도 안전)
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    const item = itemsRef.current.find((i) => i.id === id);
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
      dailyFootTraffic: null,
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

  return (
    <>
      <div className="flex flex-col md:h-[calc(100vh-72px)] md:flex-row">
        {/* Side list — 모바일에서는 지도 아래 */}
        <aside className="order-2 md:order-1 w-full md:w-[560px] lg:w-[640px] md:flex-shrink-0 md:border-r border-border/60 md:overflow-y-auto bg-card/70 backdrop-blur">
          <div className="sticky top-0 z-10 border-b border-border/60 bg-card/85 backdrop-blur-md p-4 space-y-3">
            <div className="tkad-media-map-search-pill group relative flex h-12 items-center rounded-full border border-white/12 bg-black/25 shadow-sm backdrop-blur-md transition-all hover:border-white/18 focus-within:border-white/22 focus-within:ring-2 focus-within:ring-primary/25 focus-within:shadow-md">
            <svg
              className="ml-4 h-[18px] w-[18px] flex-none text-white/70 transition-colors group-focus-within:text-white/85"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              placeholder="매체명 · 지역으로 검색"
              value={filter.q}
              onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
              className="tkad-media-map-search-input h-full w-full bg-transparent px-4 pl-3 text-sm font-semibold text-white placeholder:text-white/55 outline-none"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="tkad-media-map-top-filter inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-3 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur">
                <span className="text-white/65">정렬</span>
                <select
                  className="border-l border-white/12 bg-transparent pl-2 text-xs font-semibold text-white focus:outline-none"
                  value={filter.sort}
                  onChange={(e) =>
                    setFilter((f) => ({
                      ...f,
                      sort: e.target.value as Filter["sort"],
                    }))
                  }
                >
                  <option value="default">랜덤</option>
                  <option value="newest">최신</option>
                  <option value="priceAsc">가격 낮은순</option>
                  <option value="priceDesc">가격 높은순</option>
                  <option value="trafficDesc">가시성 높은순</option>
                </select>
              </label>

              <label className="tkad-media-map-top-filter inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-3 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur">
                <span className="text-white/65">타입</span>
                <select
                  className="border-l border-white/12 bg-transparent pl-2 text-xs font-semibold text-white focus:outline-none"
                  value={filter.type}
                  onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="">전체</option>
                  {facets.types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              {loading ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[linear-gradient(90deg,#a855f7,#22d3ee,#ec4899)]" />
                  불러오는 중…
                </span>
              ) : (
                <span>{`${items.length}개`}</span>
              )}
              {cartIds.length > 0 ? (
                <span className="font-medium text-primary">담김 {cartIds.length}</span>
              ) : null}
              {compareEntries.length > 0 ? (
                <span className="font-medium text-white/80">
                  선택 {compareEntries.length}
                </span>
              ) : null}
            </div>
          </div>
          {/* #MAP-2: 검색창 아래 필터 영역 숨김 (코드는 보존) */}
          <div className="hidden items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              aria-expanded={filtersExpanded}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-3.5 w-3.5 transition-transform ${filtersExpanded ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 011.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
              </svg>
              {filtersExpanded ? "필터 접기" : "필터 더보기"}
              {(filter.type || filter.region || filter.priceMin || filter.priceMax) && (
                <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                  {[filter.type, filter.region, filter.priceMin, filter.priceMax].filter(Boolean).length}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {loading ? (
                <Spinner size="sm" label="불러오는 중…" />
              ) : (
                <span>{`${items.length}개 매체`}</span>
              )}
              {cartIds.length > 0 && (
                <span className="font-medium text-primary">담김 {cartIds.length}</span>
              )}
            </div>
          </div>

          {filtersExpanded && false && (
            <div className="space-y-2 rounded-lg border border-dashed border-border/70 bg-muted/40 p-2.5">
              <div className="flex gap-2">
                <select
                  value={filter.type}
                  onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
                  className="flex-1 h-10 px-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">유형 전체</option>
                  {facets.types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.region}
                  onChange={(e) => setFilter((f) => ({ ...f, region: e.target.value }))}
                  className="flex-1 h-10 px-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">지역 전체</option>
                  {facets.regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="최소 가격"
                  value={filter.priceMin}
                  onChange={(e) => setFilter((f) => ({ ...f, priceMin: e.target.value }))}
                  className="flex-1 h-10 px-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <input
                  type="number"
                  placeholder="최대 가격"
                  value={filter.priceMax}
                  onChange={(e) => setFilter((f) => ({ ...f, priceMax: e.target.value }))}
                  className="flex-1 h-10 px-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
          )}
        </div>

        <ul className="grid grid-cols-2 gap-3 p-3 md:gap-4 md:p-4">
          {items.map((it) => (
            <li
              key={it.id}
              className={`group rounded-[18px] border bg-card/80 text-card-foreground overflow-hidden cursor-pointer transition-all hover:shadow-md backdrop-blur ${
                selectedId === it.id
                  ? "border-primary ring-2 ring-primary/20 shadow-md"
                  : "border-border/70 hover:border-primary/40"
              }`}
              onClick={() => handleSelect(it.id)}
            >
              <div className="relative aspect-[4/3] bg-secondary">
                {it.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.image}
                    alt={it.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                  />
                ) : null}
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-card/90 text-card-foreground/85 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold shadow-sm">
                  {it.type}
                </span>
              </div>
              <div className="p-2.5 space-y-1">
                <div className="text-[13px] font-semibold text-card-foreground line-clamp-1 leading-snug">
                  {it.name}
                </div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">
                  {[it.region, it.district].filter(Boolean).join(" · ") || it.location}
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-xs font-bold text-primary tabular-nums">
                    {formatPrice(it.price, it.pricePeriod)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompare(it);
                      }}
                      className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur transition-colors ${
                        isInCompare(it.id)
                          ? "border-border/80 bg-card text-foreground shadow-sm dark:border-white/14 dark:bg-white dark:text-black"
                          : "border-border/70 bg-card/80 text-foreground hover:bg-card dark:border-white/10 dark:bg-black/10 dark:text-white/85 dark:hover:bg-black/15"
                      }`}
                      aria-label={isInCompare(it.id) ? "선택 해제" : "선택"}
                    >
                      {isInCompare(it.id) ? "선택됨" : "선택"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCart(it.id);
                      }}
                      className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur transition-colors ${
                        inCart(it.id)
                          ? "border-border/80 bg-card text-foreground shadow-sm dark:border-white/14 dark:bg-white dark:text-black"
                          : "border-border/70 bg-card/80 text-foreground hover:bg-card dark:border-white/10 dark:bg-black/10 dark:text-white/85 dark:hover:bg-black/15"
                      }`}
                      aria-label={inCart(it.id) ? "담기 해제" : "담기"}
                    >
                      {inCart(it.id) ? "담김" : "담기"}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {items.length === 0 && !loading && (
            <li className="col-span-2 p-8 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm font-medium text-foreground mb-1">검색 결과가 없습니다</p>
              <p className="text-xs text-muted-foreground">필터를 조정하거나 지도를 이동해보세요.</p>
            </li>
          )}
          </ul>
        </aside>

        {/* Map — 모바일에서는 최상단 */}
        <div className="relative order-1 md:order-2 flex-1 h-[60vh] md:h-auto md:min-h-0">
          <KakaoMapView
            markers={markers}
            selectedId={selectedId}
            onSelect={handleSelect}
            onBoundsChange={setBounds}
            onMarkerDetail={(id) => {
              const locale =
                typeof document !== "undefined"
                  ? document.documentElement.lang || "ko"
                  : "ko";
              window.location.href = `/${locale}/media/${id}`;
            }}
          />

          {selected && (
            <div
              style={{ zIndex: 100000 }}
              className="tkad-media-map-mini-popup absolute bottom-4 left-1/2 w-[min(20rem,calc(100%-1.5rem))] max-w-[320px] -translate-x-1/2 rounded-[18px] shadow-2xl p-3 backdrop-blur border border-border/70 bg-card/95 text-foreground dark:border-white/12 dark:bg-black/45 dark:text-white"
            >
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setSelectedItem(null);
              }}
              className="absolute top-2 right-2 text-foreground/60 hover:text-foreground text-sm dark:text-white/65 dark:hover:text-white"
              aria-label="닫기"
            >
              ✕
            </button>
            <div className="flex gap-3">
              {selected.image && (
                <div className="relative w-20 h-20 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.image}
                    alt={selected.name}
                    className="w-20 h-20 object-cover rounded-lg border border-border/70 dark:border-white/10"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold pr-6">{selected.name}</div>
                <div className="text-xs text-muted-foreground">{selected.location}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {selected.type}
                  {selected.subCategory ? ` · ${selected.subCategory}` : ""}
                </div>
                <div className="text-sm font-semibold mt-1">
                  {formatPrice(selected.price, selected.pricePeriod)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-shrink-0">
                <MediaFavoriteButton mediaId={selected.id} mediaName={selected.name} />
              </div>
              <a
                href={`/media/${selected.id}`}
                className="flex-1 inline-flex items-center justify-center text-xs py-2 rounded-md border border-border/70 bg-card/80 text-foreground hover:bg-card backdrop-blur dark:border-white/14 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
              >
                상세 보기
              </a>
              <button
                type="button"
                onClick={() => toggleCompare(selected)}
                className={`flex-1 text-xs py-2 rounded-md transition-colors ${
                  isInCompare(selected.id)
                    ? "bg-card text-foreground border border-border/70 dark:bg-white dark:text-black dark:border-white/14"
                    : "bg-card/80 text-foreground border border-border/70 hover:bg-card backdrop-blur dark:bg-white/8 dark:text-white dark:border-white/14 dark:hover:bg-white/12"
                }`}
              >
                {isInCompare(selected.id) ? "선택됨" : "선택"}
              </button>
              <button
                type="button"
                onClick={() => toggleCart(selected.id)}
                className={`flex-1 text-xs py-2 rounded-md transition-colors ${
                  inCart(selected.id)
                    ? "bg-card text-foreground border border-border/70 dark:bg-white dark:text-black dark:border-white/14"
                    : "bg-card/80 text-foreground border border-border/70 hover:bg-card backdrop-blur dark:bg-white/8 dark:text-white dark:border-white/14 dark:hover:bg-white/12"
                }`}
              >
                {inCart(selected.id) ? "장바구니에 담김" : "견적서에 담기"}
              </button>
            </div>
            </div>
          )}
        </div>
      </div>

      <CompareBar
        items={compareItems}
        locale={typeof document !== "undefined" ? document.documentElement.lang || "ko" : "ko"}
        onClear={() => {
          setCompareCartEntries([]);
        }}
      />
      {compareEntries.length > 0 ? (
        <div className={FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS} aria-hidden />
      ) : null}
    </>
  );
}
