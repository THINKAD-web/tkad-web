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
  locale: string;
};

export function MediaLandingLinksFooter({
  availableRegions,
  availableTypes,
  locale,
}: Props) {
  const isKo = locale === "ko";
  const regions = availableRegions?.length
    ? availableRegions
    : KNOWN_REGION_SLUGS;
  const types = availableTypes?.length ? availableTypes : KNOWN_TYPE_SLUGS;

  return (
    <section className="border-t-2 border-bx-black bg-bx-off py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ {isKo ? "지역별 매체 찾기" : "BROWSE BY REGION"} ]
            </p>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-bx-black sm:text-2xl">
              {isKo ? "지역으로 찾기" : "Find by region"}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {regions.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/media/region/${slug}`}
                    className="inline-flex items-center gap-1.5 border-2 border-bx-black bg-bx-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
                  >
                    {regionLabel(slug, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ {isKo ? "유형별 매체 찾기" : "BROWSE BY TYPE"} ]
            </p>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-bx-black sm:text-2xl">
              {isKo ? "유형으로 찾기" : "Find by type"}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {types.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/media/type/${slug}`}
                    className="inline-flex items-center gap-1.5 border-2 border-bx-black bg-bx-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
                  >
                    {typeLabel(slug, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
