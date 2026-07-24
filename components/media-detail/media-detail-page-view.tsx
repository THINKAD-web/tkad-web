import type { ReactNode } from "react";
import type { MediaAnalyticsReport } from "@/lib/media-report-analytics";
import type { MediaPerformanceMetrics } from "@/lib/media-performance";
import type { MediaItem } from "@/lib/media-data";
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
  isKo: boolean;
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
  belowFold: ReactNode;
};

export function MediaDetailPageView({
  media,
  similarSortCatalog,
  locale,
  isKo,
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
  labels,
  belowFold,
}: Props) {
  const displayName = isKo ? media.name : media.nameEn || media.name;

  return (
    <div className="tkad-landing-neon tkad-planner-neon tkad-media-page">
        <MediaDetailHeroSection
          media={media}
          isKo={isKo}
          typeLabel={typeLabel}
          locationShort={formatMediaLocationShort(media, isKo)}
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
                isKo={isKo}
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
                isKo={isKo}
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
                isKo={isKo}
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
              isKo={isKo}
              pageLocale={locale}
              displayName={displayName}
              periodLabel={periodLabel}
            />
          }
          mobileProposal={
            <MediaDetailProposalCard
              media={media}
              isKo={isKo}
              locale={locale}
              className="lg:hidden"
            />
          }
          similarSection={
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
          }
          belowFold={belowFold}
        />

        <MediaDetailMobileBar
          media={media}
          isKo={isKo}
          displayName={displayName}
          periodLabel={periodLabel}
        />
    </div>
  );
}
