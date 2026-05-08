/**
 * `/media` 페이지 하단에 노출되는 SEO 내부 링크 섹션.
 *
 * Tier 2 키워드 랜딩 페이지(region / type)로 의 내부 링크를 제공해
 * 검색엔진의 page discovery + 사용자 탐색을 동시 지원.
 *
 * server component — 런타임에 DB 카탈로그의 unique region/type 자동 반영.
 */

import { Link } from "@/i18n/navigation";
import {
  KNOWN_REGION_SLUGS,
  KNOWN_TYPE_SLUGS,
  regionLabel,
  typeLabel,
} from "@/lib/media-keyword-landing";

type Props = {
  /** 카탈로그에서 발견된 모든 region 슬러그 (DB unique). 없으면 KNOWN 목록 사용. */
  availableRegions?: string[];
  /** 카탈로그에서 발견된 모든 type 슬러그 (DB unique). 없으면 KNOWN 목록 사용. */
  availableTypes?: string[];
  /** 카탈로그의 unique district / city (한글). 상위 N개만 노출. */
  availableAreas?: string[];
  locale: string;
};

export function MediaLandingLinksFooter({
  availableRegions,
  availableTypes,
  availableAreas,
  locale,
}: Props) {
  const isKo = locale === "ko";
  const regions = availableRegions?.length
    ? availableRegions
    : KNOWN_REGION_SLUGS;
  const types = availableTypes?.length ? availableTypes : KNOWN_TYPE_SLUGS;
  // district/city 는 동적이라 KNOWN 목록 없음 — 카탈로그 unique values 만 사용 (최대 16개)
  const areas = (availableAreas ?? []).slice(0, 16);

  return (
    <section className="tkad-media-links-footer border-t border-border/60 bg-transparent pb-14 pt-10 text-foreground sm:pb-16 sm:pt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
              {`// ${isKo ? "매체 더 탐색하기" : "Discover more media"}`}
            </p>
            <h2 className="mt-3 text-balance text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">
              {isKo ? (
                <>
                  지역·유형으로{" "}
                  <span className="tkad-home-accent-text">빠르게</span>{" "}
                  찾기
                </>
              ) : (
                <>
                  Browse by{" "}
                  <span className="tkad-home-accent-text">region</span>{" "}
                  or{" "}
                  <span className="tkad-home-accent-text">type</span>
                </>
              )}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/72">
              {isKo
                ? "검증된 카탈로그에서 자주 찾는 지역·유형을 바로 탐색하세요."
                : "Jump into the verified catalog with popular regions and media types."}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="tkad-glass-surface p-6 sm:p-7">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
            <div className="relative">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                [ {isKo ? "지역별 매체" : "BY REGION"} ]
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-white">
                {isKo ? "지역으로 찾기" : "Find by region"}
              </h3>
              <ul className="mt-5 flex flex-wrap gap-2">
                {regions.map((slug) => (
                  <li key={slug}>
                    <Link
                      href={`/media/region/${slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white/90 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
                    >
                      {regionLabel(slug, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="tkad-glass-surface p-6 sm:p-7">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
            <div className="relative">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                [ {isKo ? "유형별 매체" : "BY TYPE"} ]
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-white">
                {isKo ? "유형으로 찾기" : "Find by type"}
              </h3>
              <ul className="mt-5 flex flex-wrap gap-2">
                {types.map((slug) => (
                  <li key={slug}>
                    <Link
                      href={`/media/type/${slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white/90 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
                    >
                      {typeLabel(slug, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {areas.length > 0 ? (
          <div className="mt-6 tkad-glass-surface p-6 sm:p-7">
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
            <div className="relative">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                [ {isKo ? "지구·구역" : "BY DISTRICT"} ]
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-white">
                {isKo ? "지구·구역으로 찾기" : "Find by district"}
              </h3>
              <ul className="mt-5 flex flex-wrap gap-2">
                {areas.map((area) => (
                  <li key={area}>
                    <Link
                      href={`/media/area/${encodeURIComponent(area)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white/90 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
                    >
                      {area}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
