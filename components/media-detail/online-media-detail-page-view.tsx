import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { MediaDetailHeroChrome } from "@/components/media-detail/media-detail-hero-chrome";
import { MediaDetailStickyQuotePanel } from "@/components/media-detail/media-detail-sticky-quote-panel";
import { OnlineMediaSpecTable } from "@/components/media-detail/online-media-spec-table";
import { OnlineMediaPerformancePanel } from "@/components/media-detail/online-media-performance-panel";
import { OnlineMediaDetailMobileBar } from "@/components/media-detail/online-media-detail-mobile-bar";
import { OnlinePlatformBadge } from "@/components/media/online-platform-badge";
import { OnlineCardRecommendTags } from "@/components/media/online-card-recommend-tags";
import MediaSimilarCarousel from "@/components/media-similar-carousel";

type SimilarItem = Parameters<typeof MediaSimilarCarousel>[0]["items"][number];

type Props = {
  media: MediaItem;
  similarSortCatalog?: readonly MediaItem[];
  locale: string;
  isKo: boolean;
  typeLabel: string;
  similar: SimilarItem[];
  periodLabel: string;
  labels: {
    back: string;
    similarTitle: string;
  };
  belowFold?: ReactNode;
};

function OnlineContentSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-5">
      <h2 className="text-lg font-bold dark:text-white text-gray-900">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-white/80">
        {children}
      </div>
    </section>
  );
}

export function OnlineMediaDetailPageView({
  media,
  similarSortCatalog,
  locale,
  isKo,
  typeLabel,
  similar,
  periodLabel,
  labels,
  belowFold,
}: Props) {
  const displayName = isKo ? media.name : media.nameEn || media.name;
  const shareDescription = isKo
    ? `${displayName} — THINKAD 온라인 매체 상세`
    : `${displayName} — THINKAD online media detail`;
  const spec = media.onlineSpec;
  const description = (
    isKo ? media.description : media.descriptionEn || media.description
  )?.trim();
  const bestFor = spec?.bestFor ?? [];
  const strengths = spec?.strengths ?? [];
  const kpiHints = spec?.kpiHints ?? [];

  return (
    <div
      className="media-detail-accent-option-a tkad-landing-neon tkad-planner-neon tkad-media-page"
      data-accent-scope="option-a-media-detail"
      data-catalog-channel="online"
    >
      <MediaDetailHeroChrome
        mediaId={media.id}
        title={displayName}
        shareDescription={shareDescription}
        imageUrl=""
      />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <Link
          href="/media/online"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-900 dark:text-white/65 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {labels.back}
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10">
          <div className="min-w-0 space-y-[length:var(--qp-space-section)]">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="relative aspect-[4/3] w-full max-w-[220px] shrink-0 overflow-hidden rounded-2xl border dark:border-white/10 border-gray-200">
                <OnlinePlatformBadge
                  platform={spec?.platform}
                  size="tile"
                  className="rounded-2xl"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-white/55">
                  {typeLabel}
                </p>
                <h1 className="mt-2 font-display text-2xl font-black leading-tight dark:text-white text-gray-900 sm:text-3xl">
                  {displayName}
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-white/65">
                  {spec?.platform ?? (isKo ? "온라인" : "Online")}
                </p>
                <OnlineCardRecommendTags
                  slug={media.slug}
                  catalogChannel={media.catalogChannel}
                  className="mt-3"
                />
              </div>
            </header>

            <OnlineMediaSpecTable media={media} typeLabel={typeLabel} isKo={isKo} />

            {bestFor.length > 0 ? (
              <OnlineContentSection title={isKo ? "이럴 때 좋아요" : "Best for"}>
                <ul className="list-disc space-y-1.5 pl-5">
                  {bestFor.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </OnlineContentSection>
            ) : null}

            {description ? (
              <OnlineContentSection title={isKo ? "소개" : "Overview"}>
                <p className="whitespace-pre-wrap">{description}</p>
              </OnlineContentSection>
            ) : null}

            {strengths.length > 0 ? (
              <OnlineContentSection title={isKo ? "강점" : "Strengths"}>
                <ul className="list-disc space-y-1.5 pl-5">
                  {strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </OnlineContentSection>
            ) : null}

            <OnlineMediaPerformancePanel media={media} isKo={isKo} />

            {kpiHints.length > 0 ? (
              <OnlineContentSection
                title={isKo ? "참고 성과지표" : "Reference KPI hints"}
              >
                <ul className="list-disc space-y-1.5 pl-5">
                  {kpiHints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </OnlineContentSection>
            ) : null}

            {similar.length > 0 ? (
              <div className="border-t border-gray-200 pt-[length:var(--qp-space-section)] dark:border-white/10">
                <MediaSimilarCarousel
                  items={similar}
                  isKo={isKo}
                  title={labels.similarTitle}
                  sortable={
                    similarSortCatalog && similarSortCatalog.length > 0
                      ? { catalog: similarSortCatalog, currentMedia: media, limit: 4 }
                      : undefined
                  }
                />
              </div>
            ) : null}

            {belowFold ? (
              <div className="space-y-[length:var(--qp-space-section)] border-t border-gray-200 pt-[length:var(--qp-space-section)] dark:border-white/10">
                {belowFold}
              </div>
            ) : null}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-[72px] z-10">
              <MediaDetailStickyQuotePanel
                media={media}
                isKo={isKo}
                pageLocale={locale}
                displayName={displayName}
                periodLabel={periodLabel}
              />
            </div>
          </aside>
        </div>
      </section>

      <OnlineMediaDetailMobileBar media={media} isKo={isKo} />
    </div>
  );
}
