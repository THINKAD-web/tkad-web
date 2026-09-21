import { resolveMediaDisplayName } from "@/lib/media-i18n";
import type { ReactNode } from "react";
import type { MediaAnalyticsReport } from "@/lib/media-report-analytics";
import type { MediaPerformanceMetrics } from "@/lib/media-performance";
import type { MediaItem } from "@/lib/media-data";
import type { SeoulCpmBenchmarkBadge } from "@/lib/planner/seoul-media-benchmark";
import type { MediaRecentBrandsData } from "@/lib/insights/media-recent-brands";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import { MediaDetailHeroSection } from "@/components/media-detail/media-detail-hero-section";
import { MediaDetailPageLayout } from "@/components/media-detail/media-detail-page-layout";
import { MediaDetailLocationPanel } from "@/components/media-detail/media-detail-location-panel";
import { MediaDetailTrafficPanel } from "@/components/media-detail/media-detail-traffic-panel";
import { MediaDetailExecutionPanel } from "@/components/media-detail/media-detail-execution-panel";
import { MediaDetailStickyQuotePanel } from "@/components/media-detail/media-detail-sticky-quote-panel";
import { MediaDetailProposalCard } from "@/components/media-detail/media-detail-proposal-card";
import { MediaDetailMobileBar } from "@/components/media-detail/media-detail-mobile-bar";
import { MediaAvailabilityCalendar } from "@/components/media-detail/availability-calendar";
import MediaSimilarCarousel from "@/components/media-similar-carousel";

type SimilarItem = Parameters<typeof MediaSimilarCarousel>[0]["items"][number];

type Props = {
  media: MediaItem;
  /** Capped peer list for client-side similar sorting (not the full catalog). */
  similarSortCatalog?: readonly MediaItem[];
  locale: string;
  typeLabel: string;
  heroTags: string[];
  galleryImages: string[];
  heroImage: string;
  imageAlt: string;
  performanceMetrics: MediaPerformanceMetrics;
  analyticsReport: MediaAnalyticsReport;
  recentBrands: MediaRecentBrandsData;
  similar: SimilarItem[];
  hasPriceOptions: boolean;
  priceOptions?: MediaItem["priceOptions"];
  primaryPriceOption?: { price: number; label: string; period?: string };
  featuresText?: string;
  regionDisplay: string;
  periodLabel: string;
  instantBookingEligible: boolean;
  /** MediaBooking 이력 부족 시 캘린더 정직 안내 */
  availabilitySparse?: boolean;
  seoulCpmBenchmarkBadge?: SeoulCpmBenchmarkBadge | null;
  labels: {
    back: string;
    priceTitle: string;
    inquiry: string;
    quote: string;
    visibilityBadge: string;
    kpiExposure: string;
    kpiCpm: string;
    kpiVisibility: string;
    tabs: {
      location: string;
      traffic: string;
      calendar: string;
      execution: string;
    };
    execution: {
      size: string;
      resolution: string;
      creativeSpec: string;
      brightness: string;
      operatingHours: string;
      installYear: string;
      targetAge: string;
      empty: string;
      processTitle: string;
      noticesTitle: string;
      specsTitle: string;
      periodLabel: string;
    };
    gallery: {
      close: string;
      prev: string;
      next: string;
      expand: string;
      clickHint: string;
    };
    similarTitle: string;
  };
  /** 히어로 직후·탭 이전 above-the-fold 영역 (예: 쉬운 말 요약) */
  overview?: ReactNode;
  belowFold: ReactNode;
};

export function MediaDetailPageView({
  media,
  similarSortCatalog,
  locale,
  typeLabel,
  heroTags,
  galleryImages,
  heroImage,
  imageAlt,
  performanceMetrics,
  analyticsReport,
  recentBrands,
  similar,
  hasPriceOptions,
  priceOptions,
  primaryPriceOption,
  featuresText,
  regionDisplay,
  periodLabel,
  instantBookingEligible,
  availabilitySparse = false,
  seoulCpmBenchmarkBadge = null,
  labels,
  overview,
  belowFold,
}: Props) {
  const displayName = resolveMediaDisplayName(media, locale);

  return (
    <div
      className="media-detail-accent-option-a tkad-landing-neon tkad-planner-neon tkad-media-page"
      data-accent-scope="option-a-media-detail"
    >
        <MediaDetailHeroSection
          media={media}
          locale={locale}
          seoulCpmBenchmarkBadge={seoulCpmBenchmarkBadge}
          typeLabel={typeLabel}
          locationShort={formatMediaLocationShort(media, locale)}
          heroTags={heroTags}
          galleryImages={galleryImages}
          heroImage={heroImage}
          imageAlt={imageAlt}
          performanceMetrics={performanceMetrics}
          labels={{
            back: labels.back,
            priceTitle: labels.priceTitle,
            periodLabel,
            inquiry: labels.inquiry,
            quote: labels.quote,
            visibilityBadge: labels.visibilityBadge,
            kpiExposure: labels.kpiExposure,
            kpiCpm: labels.kpiCpm,
            kpiVisibility: labels.kpiVisibility,
            specSize: labels.execution.size,
            specResolution: labels.execution.resolution,
            specBrightness: labels.execution.brightness,
            gallery: labels.gallery,
          }}
          hasPriceOptions={hasPriceOptions}
          primaryPriceOption={primaryPriceOption}
        />

        <MediaDetailPageLayout
          aboveTabs={overview}
          tabs={[
            { id: "execution", label: labels.tabs.execution },
            { id: "location", label: labels.tabs.location },
            { id: "traffic", label: labels.tabs.traffic },
            { id: "calendar", label: labels.tabs.calendar },
          ]}
          panels={{
            location: (
              <MediaDetailLocationPanel
                media={media}
                locale={locale}
                regionDisplay={regionDisplay}
              />
            ),
            traffic: (
              <MediaDetailTrafficPanel
                mediaType={media.type}
                region={media.region}
                stored={media.trafficPattern ?? null}
                fusedStored={analyticsReport.fusedTrafficPattern ?? null}
                dailyFootfall={
                  analyticsReport.fusedDailyFootfall ?? media.dailyFootTraffic ?? null
                }
                attributions={analyticsReport.attributions}
                locale={locale}
                performanceMetrics={performanceMetrics}
                analyticsReport={analyticsReport}
                recentBrands={recentBrands}
              />
            ),
            calendar: (
              <MediaAvailabilityCalendar
                mediaId={media.id}
                mediaName={displayName}
                instantBookingEligible={instantBookingEligible}
                catalogPrice={media.price}
                pricePeriod={media.pricePeriod}
                availabilitySparse={availabilitySparse}
              />
            ),
            execution: (
              <MediaDetailExecutionPanel
                media={media}
                locale={locale}
                labels={{
                  ...labels.execution,
                  periodLabel,
                }}
                hasPriceOptions={hasPriceOptions}
                priceOptions={priceOptions}
                primaryPriceOption={primaryPriceOption}
                featuresText={featuresText}
              />
            ),
          }}
          sidebar={
            <MediaDetailStickyQuotePanel
              media={media}
              locale={locale}
              displayName={displayName}
              periodLabel={periodLabel}
            />
          }
          mobileProposal={
            <MediaDetailProposalCard
              media={media}
              locale={locale}
              className="lg:hidden"
            />
          }
          similarSection={
            <MediaSimilarCarousel
              items={similar}
              locale={locale}
              title={labels.similarTitle}
              sortable={
                similarSortCatalog && similarSortCatalog.length > 0
                  ? { catalog: similarSortCatalog, currentMedia: media, limit: 4 }
                  : undefined
              }
            />
          }
          belowFold={belowFold}
        />

        <MediaDetailMobileBar
          media={media}
          locale={locale}
          displayName={displayName}
          periodLabel={periodLabel}
        />
    </div>
  );
}
