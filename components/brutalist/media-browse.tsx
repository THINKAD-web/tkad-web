"use client";

/**
 * BrutalMediaBrowse — /ko/media 새 디자인 클라이언트
 *
 * 기존 logic(검색·필터·정렬·페이지네이션) 유지, JSX 만 브루탈 톤으로 교체.
 * Compare cart 는 lib/compare-cart-client (localStorage tkad-compare-cart-v1) 사용.
 */
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { matchesMediaTextQuery } from "@/lib/media-data";
import { KEYWORD_FILTER_SEARCH_DEBOUNCE_MS } from "@/lib/media-keyword-filter-logic";
import { formatMediaPriceCompactKrw } from "@/lib/media-price-format";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import {
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
} from "@/lib/compare-cart-client";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { BtnBlock, MediaCard } from "@/components/brutalist";

type SortKey = "default" | "newest" | "priceAsc" | "priceDesc" | "trafficDesc";

const REGION_CHIPS = [
  { key: "all", labelKo: "전체", labelEn: "All" },
  { key: "강남", labelKo: "강남", labelEn: "Gangnam" },
  { key: "성수", labelKo: "성수", labelEn: "Seongsu" },
  { key: "홍대", labelKo: "홍대", labelEn: "Hongdae" },
  { key: "이태원", labelKo: "이태원", labelEn: "Itaewon" },
  { key: "명동", labelKo: "명동", labelEn: "Myeongdong" },
  { key: "여의도", labelKo: "여의도", labelEn: "Yeouido" },
  { key: "판교", labelKo: "판교", labelEn: "Pangyo" },
] as const;

const TYPE_CHIPS = [
  { key: "all", labelKo: "전체", labelEn: "All" },
  { key: "digital", labelKo: "디지털", labelEn: "Digital" },
  { key: "static", labelKo: "고정형", labelEn: "Static" },
  { key: "mobile", labelKo: "교통", labelEn: "Mobile" },
] as const;

const PRICE_CHIPS = [
  { key: "all", labelKo: "전체", labelEn: "All" },
  { key: "lt30", labelKo: "~30M", labelEn: "~30M" },
  { key: "30to70", labelKo: "30M~70M", labelEn: "30M~70M" },
  { key: "gt70", labelKo: "70M+", labelEn: "70M+" },
] as const;

const PAGE_SIZE = 9;

export default function BrutalMediaBrowse({
  catalog = [],
}: {
  catalog?: MediaItem[];
}) {
  const t = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";

  // 상태
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [priceBand, setPriceBand] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [page, setPage] = useState(1);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const skipFirstCompareWrite = useRef(true);

  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      KEYWORD_FILTER_SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(id);
  }, [query]);

  // compare cart hydrate + subscribe
  useEffect(() => {
    setCompareIds(getCompareCartEntries().map((e) => e.id));
    return subscribeCompareCart(() =>
      setCompareIds(getCompareCartEntries().map((e) => e.id)),
    );
  }, []);

  useEffect(() => {
    if (skipFirstCompareWrite.current) {
      skipFirstCompareWrite.current = false;
      return;
    }
    const byId = new Map(catalog.map((m) => [m.id, m]));
    const entries = compareIds
      .map((id) => byId.get(id))
      .filter((m): m is MediaItem => Boolean(m))
      .map((m) => ({ id: m.id, name: m.name, nameEn: m.nameEn }));
    setCompareCartEntries(entries);
  }, [compareIds, catalog]);

  /** 검색 + region/type/price 필터 + sort */
  const filtered = useMemo(() => {
    let arr = [...catalog];
    if (debouncedQuery) {
      const lower = debouncedQuery.toLowerCase();
      arr = arr.filter((m) => matchesMediaTextQuery(m, lower));
    }
    if (region !== "all") {
      arr = arr.filter((m) => {
        const haystack = `${m.location} ${m.city ?? ""} ${m.district ?? ""}`;
        return haystack.includes(region);
      });
    }
    if (typeFilter !== "all") {
      arr = arr.filter((m) => m.type === typeFilter);
    }
    if (priceBand !== "all") {
      arr = arr.filter((m) => {
        const won = m.price < 1_000_000 ? m.price * 10_000 : m.price;
        if (priceBand === "lt30") return won < 30_000_000;
        if (priceBand === "30to70")
          return won >= 30_000_000 && won < 70_000_000;
        if (priceBand === "gt70") return won >= 70_000_000;
        return true;
      });
    }
    switch (sortBy) {
      case "priceAsc":
        return arr.sort((a, b) => a.price - b.price);
      case "priceDesc":
        return arr.sort((a, b) => b.price - a.price);
      case "trafficDesc":
        return arr.sort(
          (a, b) => (b.dailyFootTraffic ?? 0) - (a.dailyFootTraffic ?? 0),
        );
      case "newest":
        return arr.sort((a, b) => {
          const at = a.createdAt ? Date.parse(a.createdAt) : 0;
          const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
          return bt - at;
        });
      default:
        return arr;
    }
  }, [catalog, debouncedQuery, region, typeFilter, priceBand, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, region, typeFilter, priceBand, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const cityCount = useMemo(() => {
    const set = new Set<string>();
    for (const m of catalog) {
      const c = m.city ?? m.region;
      if (c) set.add(c);
    }
    return set.size;
  }, [catalog]);

  const isInCompare = (id: string) => compareIds.includes(id);
  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= COMPARE_MAX_ITEMS) return prev;
      return [...prev, id];
    });
  };

  const typeLabelOf = (m: MediaItem) => {
    const map: Record<string, string> = {
      digital: isKo ? "디지털" : "Digital",
      static: isKo ? "고정형" : "Static",
      mobile: isKo ? "교통" : "Mobile",
      network: isKo ? "네트워크" : "Network",
    };
    return map[m.type] ?? m.type;
  };

  return (
    <>
      {/* === Top breadcrumb 라인 === */}
      <div className="border-b-2 border-bx-black bg-bx-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3 sm:px-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em]">
            <a
              href={`/${isKo ? "ko" : "en"}`}
              className="text-bx-gray-dim transition-colors hover:text-bx-accent"
            >
              Home
            </a>
            <span className="mx-2 text-bx-gray-dim">/</span>
            <span className="text-bx-black">Media</span>
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
            [02 / 04]
          </p>
        </div>
      </div>

      {/* === Header 섹션 === */}
      <section className="border-b-2 border-bx-black bg-bx-white">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-3">
          <div className="border-bx-black px-6 py-12 sm:px-10 sm:py-16 lg:col-span-2 lg:border-r-2 lg:py-20">
            <span className="inline-block bg-bx-accent px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white">
              [ Media Catalog / 매체 검색 ]
            </span>
            <h1 className="mt-8 font-extrabold leading-[0.96] tracking-[-0.02em] text-bx-black [font-size:clamp(2.5rem,5.5vw,5rem)]">
              {isKo ? (
                <>
                  검증된 매체,
                  <br />
                  <span className="bx-accent">한눈에</span> 검색.
                </>
              ) : (
                <>
                  Verified media,
                  <br />
                  <span className="bx-accent">at a glance.</span>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-bx-gray-dim sm:text-lg">
              {isKo
                ? "전국 검증 OOH 인벤토리를 지역·매체유형·예산 단위로 빠르게 좁혀 검토하세요. 모든 매체는 현장 검증·1년+ 효과 데이터가 함께 제공됩니다."
                : "Narrow Korea's verified OOH inventory by region · type · budget. Each listing comes with on-site verification and 1+ year of performance data."}
            </p>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-1">
            <StatCell
              label="Total"
              value={catalog.length.toLocaleString()}
              meta={isKo ? "전체 매체" : "Total media"}
              borderRightOnly
            />
            <StatCell
              label="Cities"
              value={String(Math.max(cityCount, 5))}
              meta={isKo ? "지역 도시" : "Cities"}
              borderRightOnly
            />
            <StatCell
              label="Verified"
              value="100%"
              meta={isKo ? "현장 검증" : "On-site verified"}
            />
          </div>
        </div>
      </section>

      {/* === Toolbar (sticky) === */}
      <div className="sticky top-[60px] z-40 border-b-2 border-bx-black bg-bx-white">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
          <div className="grid grid-cols-1 items-stretch gap-0 border-b-2 border-bx-black sm:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-3 py-4">
              <Search className="h-5 w-5 shrink-0 text-bx-black" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  isKo
                    ? "매체명, 지역, 주소 검색 — 예: 강남역, 시티빌딩, 성수"
                    : "Search by media, region, or address — e.g. Gangnam, City Building, Seongsu"
                }
                className="w-full border-0 bg-transparent text-base font-medium text-bx-black placeholder:text-bx-gray-dim focus:outline-none sm:text-lg"
              />
              <kbd className="hidden shrink-0 border-2 border-bx-black bg-bx-off px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-black sm:inline-block">
                ⌘K
              </kbd>
            </label>
            <BtnBlock variant="primary" icon={false} className="!w-full !justify-center sm:!w-auto">
              <span className="mr-1">→</span>
              {isKo ? "검색" : "Search"}
            </BtnBlock>
          </div>

          {/* 필터 칩 3 그룹 — 모바일 가로 스크롤 */}
          <ChipRow
            label={isKo ? "지역" : "Region"}
            items={REGION_CHIPS.map((c) => ({ key: c.key, label: isKo ? c.labelKo : c.labelEn }))}
            value={region}
            onChange={setRegion}
          />
          <ChipRow
            label={isKo ? "타입" : "Type"}
            items={TYPE_CHIPS.map((c) => ({ key: c.key, label: isKo ? c.labelKo : c.labelEn }))}
            value={typeFilter}
            onChange={setTypeFilter}
          />
          <ChipRow
            label={isKo ? "가격" : "Price"}
            items={PRICE_CHIPS.map((c) => ({ key: c.key, label: isKo ? c.labelKo : c.labelEn }))}
            value={priceBand}
            onChange={setPriceBand}
          />

          {/* 결과 바 + 정렬 */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-bx-black">
              RESULTS:{" "}
              <span className="text-bx-accent">
                {filtered.length.toLocaleString()}
              </span>{" "}
              {isKo ? "MEDIA FOUND" : "MEDIA FOUND"}
            </p>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="border-2 border-bx-black bg-bx-white px-3 py-2 font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-bx-black focus:outline-none focus:border-bx-accent"
            >
              <option value="default">{t("sortDefault")}</option>
              <option value="newest">{t("sortNewest")}</option>
              <option value="priceAsc">{t("sortPriceAsc")}</option>
              <option value="priceDesc">{t("sortPriceDesc")}</option>
              <option value="trafficDesc">{t("sortTrafficDesc")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* === Grid (3컬, 페이지당 9개) === */}
      <section className="border-b-2 border-bx-black bg-bx-white">
        {paged.length === 0 ? (
          <div className="px-6 py-24 text-center sm:px-10">
            <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-bx-gray-dim">
              // {isKo ? "조건에 맞는 매체가 없습니다" : "No media matched"}
            </p>
            <BtnBlock
              variant="secondary"
              className="mt-6 inline-flex"
              onClick={() => {
                setQuery("");
                setRegion("all");
                setTypeFilter("all");
                setPriceBand("all");
                setSortBy("default");
              }}
            >
              {isKo ? "필터 초기화" : "Reset filters"}
            </BtnBlock>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {paged.map((m, i) => {
              const img = getPrimaryMediaImageUrl(m);
              const price = formatMediaPriceCompactKrw(m.price);
              const inCart = isInCompare(m.id);
              return (
                <div
                  key={m.id}
                  className={[
                    "relative border-bx-black",
                    i > 0 ? "border-t-2 sm:border-t-0" : "",
                    i % 2 === 1 ? "sm:border-l-2" : "",
                    i >= 2 ? "sm:border-t-2" : "",
                    "lg:border-l-2 lg:border-t-0",
                    i % 3 === 0 ? "lg:border-l-0" : "",
                    i >= 3 ? "lg:border-t-2" : "",
                  ].join(" ")}
                >
                  <MediaCard
                    href={`/media/${m.id}`}
                    imageSrc={img}
                    imageAlt={isKo ? m.name : m.nameEn || m.name}
                    rank={(page - 1) * PAGE_SIZE + i + 1}
                    type={typeLabelOf(m)}
                    name={isKo ? m.name : m.nameEn || m.name}
                    location={isKo ? m.location : m.locationEn || m.location}
                    visibility={m.visibilityScore ?? null}
                    dailyTraffic={m.dailyFootTraffic ?? null}
                    monthlyImpression={m.monthlyFootTraffic ?? null}
                    price={price}
                    isVerified
                    className="h-full border-0"
                  />
                  {/* 액션 행: 1:1 그리드, MediaCard 자체 보더 위 */}
                  <div className="grid grid-cols-2 border-t-2 border-bx-black">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCompare(m.id);
                      }}
                      className={[
                        "border-r-2 border-bx-black px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors",
                        inCart
                          ? "bg-bx-black text-bx-white hover:bg-bx-accent"
                          : "bg-bx-white text-bx-black hover:bg-bx-black hover:text-bx-white",
                      ].join(" ")}
                    >
                      {inCart
                        ? isKo
                          ? "✓ 담김"
                          : "✓ Added"
                        : isKo
                          ? "+ 담기"
                          : "+ Add"}
                    </button>
                    <a
                      href={`/${isKo ? "ko" : "en"}/media/${m.id}`}
                      className="bg-bx-white px-4 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-accent hover:text-bx-white"
                    >
                      {isKo ? "상세 →" : "Detail →"}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* === Pagination === */}
      {totalPages > 1 ? (
        <section className="border-b-2 border-bx-black bg-bx-white">
          <div className="mx-auto grid max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center px-6 py-6 sm:px-10">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="justify-self-start font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:text-bx-accent disabled:cursor-not-allowed disabled:text-bx-gray-dim"
            >
              ← {isKo ? "이전" : "Prev"}
            </button>
            <ul className="flex items-center gap-1">
              {buildPageList(page, totalPages).map((p, i) =>
                p === "…" ? (
                  <li key={`g-${i}`} className="px-2 font-mono text-[11px] text-bx-gray-dim">
                    ···
                  </li>
                ) : (
                  <li key={p}>
                    <button
                      type="button"
                      onClick={() => setPage(p)}
                      className={[
                        "min-w-9 border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                        p === page
                          ? "border-bx-accent bg-bx-accent text-bx-white"
                          : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-black hover:text-bx-white",
                      ].join(" ")}
                    >
                      {String(p).padStart(2, "0")}
                    </button>
                  </li>
                ),
              )}
            </ul>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="justify-self-end font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:text-bx-accent disabled:cursor-not-allowed disabled:text-bx-gray-dim"
            >
              {isKo ? "다음" : "Next"} →
            </button>
          </div>
        </section>
      ) : null}

      {/* === Final CTA === */}
      <section className="border-b-2 border-bx-black bg-bx-black text-bx-white">
        <div className="mx-auto max-w-[1400px] px-6 py-16 text-center sm:px-10 sm:py-24">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray">
            <span className="text-bx-accent">[ → ]</span>
            <span className="ml-2">/ Need help</span>
          </p>
          <h2 className="mx-auto mt-6 max-w-3xl font-extrabold leading-[0.96] tracking-[-0.02em] [font-size:clamp(2.25rem,5vw,4.5rem)]">
            {isKo ? (
              <>
                딱 맞는 매체를{" "}
                <span className="bx-accent">[찾고 계신가요?]</span>
              </>
            ) : (
              <>
                Looking for the{" "}
                <span className="bx-accent">[right media?]</span>
              </>
            )}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-bx-gray sm:text-lg">
            {isKo
              ? "예산·목표·타깃을 알려주시면 24시간 내 전문 컨설턴트가 큐레이션 추천을 보내드립니다."
              : "Tell us your budget, goal, and target — our consultant returns a curated shortlist within 24 hours."}
          </p>
          <div className="mt-10 inline-flex">
            <BtnBlock href="/contact" variant="accent">
              {isKo ? "무료 상담 신청" : "Free Consultation"}
            </BtnBlock>
          </div>
        </div>
      </section>
    </>
  );
}

function ChipRow({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-stretch border-b-2 border-bx-black">
      <div className="flex shrink-0 items-center border-r-2 border-bx-black bg-bx-off px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black sm:px-5">
        [ {label} ]
      </div>
      <div className="flex flex-1 items-center gap-2 overflow-x-auto px-3 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => {
          const active = value === it.key;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange(it.key)}
              className={[
                "shrink-0 border px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                active
                  ? "border-bx-black bg-bx-black text-bx-white"
                  : "border-bx-gray bg-bx-white text-bx-black hover:border-bx-black hover:bg-bx-off",
              ].join(" ")}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  meta,
  borderRightOnly,
}: {
  label: string;
  value: string;
  meta: string;
  borderRightOnly?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col justify-center border-bx-black px-5 py-8 sm:px-6 sm:py-10",
        borderRightOnly ? "border-r-2" : "",
        "lg:border-r-0",
        borderRightOnly ? "lg:border-b-2" : "",
      ].join(" ")}
    >
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
        / {label}
      </p>
      <p className="mt-3 font-extrabold leading-none tracking-[-0.02em] text-bx-black [font-size:clamp(2rem,3.5vw,3rem)]">
        {value}
      </p>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
        // {meta}
      </p>
    </div>
  );
}

/** 페이지 리스트: 1, 2, 3, …, last (현재 페이지 주변 ±2) */
function buildPageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, current - 1, current, current + 1]);
  if (current <= 3) {
    set.add(2);
    set.add(3);
    set.add(4);
  }
  if (current >= total - 2) {
    set.add(total - 1);
    set.add(total - 2);
    set.add(total - 3);
  }
  const sorted = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}
