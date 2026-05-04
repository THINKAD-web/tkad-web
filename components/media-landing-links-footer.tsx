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
    <section className="border-t-2 border-border bg-muted py-12 text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-hermes sm:text-sm">
              {isKo ? "지역별 매체 찾기" : "Browse by region"}
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {isKo ? "지역으로 찾기" : "Find by region"}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {regions.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/media/region/${slug}`}
                    className="inline-flex items-center gap-1.5 border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-xs transition-colors hover:border-accent hover:bg-muted"
                  >
                    {regionLabel(slug, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-hermes sm:text-sm">
              {isKo ? "유형별 매체 찾기" : "Browse by type"}
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {isKo ? "유형으로 찾기" : "Find by type"}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {types.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/media/type/${slug}`}
                    className="inline-flex items-center gap-1.5 border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-xs transition-colors hover:border-accent hover:bg-muted"
                  >
                    {typeLabel(slug, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {areas.length > 0 ? (
          <div className="mt-10 border-t-2 border-border pt-8">
            <p className="text-xs font-semibold text-hermes sm:text-sm">
              {isKo ? "지구·구역별 매체 찾기" : "Browse by district"}
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {isKo ? "지구·구역으로 찾기" : "Find by district"}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {areas.map((area) => (
                <li key={area}>
                  <Link
                    href={`/media/area/${encodeURIComponent(area)}`}
                    className="inline-flex items-center gap-1.5 border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-xs transition-colors hover:border-accent hover:bg-muted"
                  >
                    {area}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
