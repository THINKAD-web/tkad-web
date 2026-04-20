"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { MapBounds, MapMarker } from "./kakao-map-view";

const KakaoMapView = dynamic(() => import("./kakao-map-view"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-sm text-gray-500">
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
  const [cartIds, setCartIds] = useState<string[]>([]);

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

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const inCart = useCallback((id: string) => cartIds.includes(id), [cartIds]);

  const toggleCart = useCallback(
    (id: string) => {
      setCartIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        writeCart(next);
        return next;
      });
    },
    [],
  );

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col md:flex-row">
      {/* Side list */}
      <aside className="w-full md:w-[380px] md:flex-shrink-0 border-r overflow-y-auto bg-white">
        <div className="sticky top-0 z-10 border-b bg-white p-3 space-y-2">
          <input
            type="search"
            placeholder="매체명/지역 검색"
            value={filter.q}
            onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <select
              value={filter.type}
              onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
              className="flex-1 px-2 py-2 border rounded-lg text-sm"
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
              className="flex-1 px-2 py-2 border rounded-lg text-sm"
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
              className="flex-1 px-2 py-2 border rounded-lg text-sm"
            />
            <input
              type="number"
              placeholder="최대 가격"
              value={filter.priceMax}
              onChange={(e) => setFilter((f) => ({ ...f, priceMax: e.target.value }))}
              className="flex-1 px-2 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{loading ? "불러오는 중…" : `${items.length}개 매체`}</span>
            {cartIds.length > 0 && (
              <span className="text-primary font-medium">장바구니 {cartIds.length}</span>
            )}
          </div>
        </div>

        <ul className="divide-y">
          {items.map((it) => (
            <li
              key={it.id}
              className={`p-3 cursor-pointer hover:bg-gray-50 ${selectedId === it.id ? "bg-amber-50" : ""}`}
              onClick={() => setSelectedId(it.id)}
            >
              <div className="flex gap-3">
                {it.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={it.image}
                    alt={it.name}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{it.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {[it.region, it.district, it.city].filter(Boolean).join(" · ") || it.location}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{it.type}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-semibold text-primary">
                      {formatPrice(it.price, it.pricePeriod)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCart(it.id);
                      }}
                      className={`text-xs px-2 py-1 rounded-md border ${
                        inCart(it.id)
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-primary border-primary"
                      }`}
                    >
                      {inCart(it.id) ? "담김" : "제안서에"}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {items.length === 0 && !loading && (
            <li className="p-6 text-center text-sm text-gray-500">검색 결과가 없습니다</li>
          )}
        </ul>
      </aside>

      {/* Map */}
      <div className="relative flex-1 min-h-[50vh] md:min-h-0">
        <KakaoMapView
          markers={markers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onBoundsChange={setBounds}
        />

        {selected && (
          <div className="absolute left-3 bottom-3 right-3 md:left-auto md:right-3 md:w-[320px] bg-white rounded-xl shadow-lg border p-3">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-sm"
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
                <div className="text-sm font-semibold pr-6">{selected.name}</div>
                <div className="text-xs text-gray-500">{selected.location}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {selected.type}
                  {selected.subCategory ? ` · ${selected.subCategory}` : ""}
                </div>
                <div className="text-sm font-semibold text-primary mt-1">
                  {formatPrice(selected.price, selected.pricePeriod)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <a
                href={`/media/${selected.id}`}
                className="flex-1 text-center text-xs py-2 border rounded-md hover:bg-gray-50"
              >
                상세 보기
              </a>
              <button
                type="button"
                onClick={() => toggleCart(selected.id)}
                className={`flex-1 text-xs py-2 rounded-md ${
                  inCart(selected.id)
                    ? "bg-primary text-white"
                    : "bg-white text-primary border border-primary"
                }`}
              >
                {inCart(selected.id) ? "장바구니에 담김" : "제안서에 담기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
