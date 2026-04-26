"use client";

/**
 * BrutalMediaBrowse — /ko/media 새 디자인 클라이언트
 *
 * 기존 logic(검색·필터·정렬·페이지네이션) 유지, JSX 만 브루탈 톤으로 교체.
 * Compare cart 는 lib/compare-cart-client (localStorage tkad-compare-cart-v1) 그대로 사용.
 *
 * 청크별 빌드:
 *   chunk 1 (현재) — breadcrumb + header + toolbar 검색
 *   chunk 2 (다음) — 필터 칩 + 결과 바 + 그리드 + 페이지네이션 + Final CTA
 */
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { matchesMediaTextQuery } from "@/lib/media-data";
import { KEYWORD_FILTER_SEARCH_DEBOUNCE_MS } from "@/lib/media-keyword-filter-logic";
import { BtnBlock } from "@/components/brutalist";

type SortKey = "default" | "newest" | "priceAsc" | "priceDesc" | "trafficDesc";

export default function BrutalMediaBrowse({
  catalog = [],
}: {
  catalog?: MediaItem[];
}) {
  const t = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";

  // 검색
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const id = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      KEYWORD_FILTER_SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(id);
  }, [query]);

  // 정렬
  const [sortBy, setSortBy] = useState<SortKey>("default");

  // 검색 + 정렬 (필터 칩은 chunk 2 에서 추가)
  const visible = useMemo(() => {
    let arr = [...catalog];
    if (debouncedQuery) {
      const lower = debouncedQuery.toLowerCase();
      arr = arr.filter((m) => matchesMediaTextQuery(m, lower));
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
  }, [catalog, debouncedQuery, sortBy]);

  const cityCount = useMemo(() => {
    const set = new Set<string>();
    for (const m of catalog) {
      const c = m.city ?? m.region;
      if (c) set.add(c);
    }
    return set.size;
  }, [catalog]);

  return (
    <>
      {/* === Top breadcrumb 라인 (흰배경 + 하단 2px 보더) === */}
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

      {/* === Header 섹션 (좌 2 : 우 1 그리드) === */}
      <section className="border-b-2 border-bx-black bg-bx-white">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-3">
          {/* 좌: 큰 타이틀 + lede */}
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

          {/* 우: 3개 통계 */}
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

      {/* === Toolbar (sticky) — 검색 바 (chunk 2 에서 필터 칩 + 결과바 추가) === */}
      <div
        className="sticky top-[60px] z-40 border-b-2 border-bx-black bg-bx-white"
        style={{ top: "60px" }}
      >
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
            <BtnBlock
              variant="primary"
              icon={false}
              className="!w-full !justify-center sm:!w-auto"
              onClick={() => {
                /* enter 만으로도 debounce 트리거되므로 별도 동작 없음 */
              }}
            >
              <span className="mr-1">→</span>
              {isKo ? "검색" : "Search"}
            </BtnBlock>
          </div>

          {/* TODO chunk 2 — 필터 칩 + 결과바 + 정렬 셀렉트 */}
        </div>
      </div>

      {/* TODO chunk 2 — 매체 그리드 + 페이지네이션 + Final CTA */}
      <div className="border-b-2 border-bx-black bg-bx-off px-6 py-20 text-center sm:px-10">
        <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-bx-gray-dim">
          // {visible.length} {isKo ? "개 매체" : "media"} · sort {sortBy}
        </p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-bx-black">
          [ chunk 2 — grid + pagination + cta TODO ]
        </p>
      </div>

      {/* unused placeholders to silence eslint */}
      <span className="sr-only">{t("title")}</span>
    </>
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
        // 모바일 가로 3컬: 마지막 셀 제외 우측 보더
        borderRightOnly ? "border-r-2" : "",
        // lg 세로 1컬: 첫 셀 제외 위 보더
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
