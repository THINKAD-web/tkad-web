import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { CategoryButtonGrid } from "@/components/category/category-button-grid";
import {
  HOME_MEDIA_TYPE_GRID,
  HOME_TARGET_GRID,
} from "@/lib/category-grid-config";
import { MediaCatalogListCard } from "@/components/media/media-catalog-list-card";
import type { MediaItem } from "@/lib/media-data";
import { getTrustMetrics, formatTrustCount } from "@/lib/trust-metrics";

type CategorySectionProps = { locale: string };

export function HomeCategorySection({ locale }: CategorySectionProps) {
  const isKo = locale.startsWith("ko");

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8" data-screenshot="categories">
      <CategoryButtonGrid
        items={HOME_MEDIA_TYPE_GRID}
        locale={locale}
        title={isKo ? "매체 유형으로 찾기" : "Browse by media type"}
      />
      <CategoryButtonGrid
        items={HOME_TARGET_GRID}
        locale={locale}
        title={isKo ? "캠페인 목적" : "Campaign goals"}
      />
    </section>
  );
}

export async function HomeTrustStrip({ locale }: { locale: string }) {
  const isKo = locale.startsWith("ko");
  const trust = await getTrustMetrics();
  const verifiedLabel = formatTrustCount(trust.mediaCount);
  const brandLabel = formatTrustCount(trust.brandCount);
  const partners = [
    "Samsung",
    "Hyundai",
    "LG",
    "Kakao",
    "Nike",
    "CJ",
    "Amorepacific",
    "Netflix",
  ];

  return (
    <section className="border-t border-gray-200 bg-gray-50 px-4 py-10 dark:border-white/10 dark:bg-[#020202] sm:px-6">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-lg font-black tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-xl">
          {isKo ? `${verifiedLabel} 검증 매체` : `${verifiedLabel} verified media`}
          <span className="mx-2 text-gray-300 dark:text-white/20">·</span>
          {isKo ? `${brandLabel} 활성 브랜드` : `${brandLabel} active brands`}
          <span className="mx-2 text-gray-300 dark:text-white/20">·</span>
          {isKo ? "24H 응답" : "24h response"}
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-white/60">
          {isKo
            ? "플랫폼이 큐레이션한 검증 OOH 매체"
            : "Platform-curated verified OOH media"}
        </p>
        <div className="mt-6 flex gap-6 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
          {partners.map((name) => (
            <span
              key={name}
              className="shrink-0 snap-start text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-white/35"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomePopularMediaHeader({ locale }: { locale: string }) {
  const isKo = locale.startsWith("ko");

  return (
    <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-4 px-4 sm:px-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
        {isKo ? "이번 주 인기 매체" : "Popular this week"}
      </h2>
      <Link
        href="/media"
        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-violet-600 dark:text-violet-300"
      >
        {isKo ? "전체 보기" : "View all"}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

type PopularListProps = {
  items: MediaItem[];
  locale: string;
  imagePreparingLabel: string;
};

export function HomePopularMediaList({
  items,
  locale,
  imagePreparingLabel,
}: PopularListProps) {
  const isKo = locale.startsWith("ko");

  if (items.length === 0) return null;

  return (
    <ul className="mx-auto mt-4 flex w-full max-w-6xl flex-col gap-2 px-4 sm:px-6">
      {items.map((media, index) => (
        <li key={media.id}>
          <MediaCatalogListCard
            media={media}
            isKo={isKo}
            imagePreparingLabel={imagePreparingLabel}
            rank={index + 1}
          />
        </li>
      ))}
    </ul>
  );
}
