"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { MapBounds, MapMarker } from "./kakao-map-view";
import { Spinner } from "@/components/ui/spinner";
import { useAppToast } from "@/lib/use-toast";
import { MediaFavoriteButton } from "@/components/media-favorite-button";

const KakaoMapView = dynamic(() => import("./kakao-map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
      지도 로딩 중…
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
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const itemsRef = useRef<Item[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    setCartIds(readCart());
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

        const res = await fetch(`/api/media/map?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (data.ok) {
          setItems(data.data.items);
          setFacets(data.data.facets);
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
  const toast = useAppToast();

  const toggleCart = useCallback(
    (id: string) => {
      const item = items.find((x) => x.id === id);
      const name = item?.name;
      setCartIds((prev) => {
        const exists = prev.includes(id);
        const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
        writeCart(next);
        if (exists) {
          toast.warning(name ? `${name}이(가) 장바구니에서 제거되었습니다.` : "장바구니에서 제거되었습니다.");
        } else {
          toast.success(name ? `${name}이(가) 장바구니에 담겼습니다.` : "매체가 장바구니에 담겼습니다.");
        }
        return next;
      });
    },
    [items, toast],
  );

  return (
    <div className="flex flex-col md:h-[calc(100vh-72px)] md:flex-row">
      {/* Side list — 모바일에서는 지도 아래 */}
      <aside className="order-2 md:order-1 w-full md:w-[440px] md:flex-shrink-0 md:border-r border-border/60 md:overflow-y-auto bg-card">
        <div className="sticky top-0 z-10 border-b border-border/60 bg-card/95 backdrop-blur-sm p-4 space-y-3">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-primary/60"
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
              className="w-full h-12 pl-11 pr-4 bg-background border border-border/80 rounded-full text-sm font-medium placeholder:text-muted-foreground/60 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary focus:shadow-md transition-all"
            />
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

        <ul className="grid grid-cols-2 gap-3 p-3">
          {items.map((it) => (
            <li
              key={it.id}
              className={`group rounded-xl border bg-card text-card-foreground overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                selectedId === it.id
                  ? "border-primary ring-2 ring-primary/20 shadow-md"
                  : "border-border/70 hover:border-primary/40"
              }`}
              onClick={() => handleSelect(it.id)}
            >
              <div className="relative aspect-[4/3] bg-secondary">
                {it.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCart(it.id);
                    }}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full border transition-colors ${
                      inCart(it.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-primary border-primary hover:bg-primary/5"
                    }`}
                  >
                    {inCart(it.id) ? "담김" : "담기"}
                  </button>
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
            className="absolute left-3 bottom-3 right-3 md:left-auto md:right-3 md:w-[320px] md:bottom-4 bg-card text-card-foreground rounded-xl shadow-2xl border border-border p-3"
          >
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setSelectedItem(null);
              }}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-sm"
              aria-label="닫기"
            >
              ✕
            </button>
            <div className="flex gap-3">
              {selected.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selected.image}
                  alt={selected.name}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-card-foreground pr-6">{selected.name}</div>
                <div className="text-xs text-muted-foreground">{selected.location}</div>
                <div className="text-xs text-muted-foreground/80 mt-0.5">
                  {selected.type}
                  {selected.subCategory ? ` · ${selected.subCategory}` : ""}
                </div>
                <div className="text-sm font-semibold text-primary mt-1">
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
                className="flex-1 inline-flex items-center justify-center text-xs py-2 border border-border rounded-md text-foreground hover:bg-secondary/60"
              >
                상세 보기
              </a>
              <button
                type="button"
                onClick={() => toggleCart(selected.id)}
                className={`flex-1 text-xs py-2 rounded-md transition-colors ${
                  inCart(selected.id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-primary border border-primary hover:bg-primary/5"
                }`}
              >
                {inCart(selected.id) ? "장바구니에 담김" : "견적서에 담기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
