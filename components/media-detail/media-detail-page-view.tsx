import type { ReactNode } from "react";
import type { MediaAnalyticsReport } from "@/lib/media-report-analytics";
import type { AccessCheckResult } from "@/lib/report-access-shared";
import type { MediaPerformanceMetrics } from "@/lib/media-performance";
import type { MediaItem } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import { MediaDetailHeroSection } from "@/components/media-detail/media-detail-hero-section";
import { MediaDetailPageLayout } from "@/components/media-detail/media-detail-page-layout";
import { MediaDetailLocationPanel } from "@/components/media-detail/media-detail-location-panel";
import { MediaDetailTrafficPanel } from "@/components/media-detail/media-detail-traffic-panel";
import { MediaDetailExecutionPanel } from "@/components/media-detail/media-detail-execution-panel";
import { MediaDetailStickyQuotePanel } from "@/components/media-detail/media-detail-sticky-quote-panel";
import { MediaDetailMobileBar } from "@/components/media-detail/media-detail-mobile-bar";
import { MediaAvailabilityCalendar } from "@/components/media-detail/availability-calendar";
import MediaSimilarCarousel from "@/components/media-similar-carousel";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

type SimilarItem = Parameters<typeof MediaSimilarCarousel>[0]["items"][number];

type Props = {
  media: MediaItem;
  catalog: MediaItem[];
  locale: string;
  isKo: boolean;
  typeLabel: string;
  heroTags: string[];
  galleryImages: string[];
  heroImage: string;
  imageAlt: string;
  performanceMetrics: MediaPerformanceMetrics;
  analyticsReport: MediaAnalyticsReport;
  detailAccess: AccessCheckResult;
  competitorAccess: AccessCheckResult;
  similar: SimilarItem[];
  hasPriceOptions: boolean;
  priceOptions?: MediaItem["priceOptions"];
  primaryPriceOption?: { price: number; label: string; period?: string };
  featuresText?: string;
  regionDisplay: string;
  periodLabel: string;
  instantBookingEligible: boolean;
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
  catalog,
  locale,
  isKo,
  typeLabel,
  heroTags,
  galleryImages,
  heroImage,
  imageAlt,
  performanceMetrics,
  analyticsReport,
  detailAccess,
  competitorAccess,
  similar,
  hasPriceOptions,
  priceOptions,
  primaryPriceOption,
  featuresText,
  regionDisplay,
  periodLabel,
  instantBookingEligible,
  labels,
  belowFold,
}: Props) {
  const displayName = isKo ? media.name : media.nameEn || media.name;

  return (
    <HomeLandingDayNight>
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
            gallery: labels.gallery,
          }}
          hasPriceOptions={hasPriceOptions}
          primaryPriceOption={primaryPriceOption}
        />

        <MediaDetailPageLayout
          tabs={[
            { id: "location", label: labels.tabs.location },
            { id: "traffic", label: labels.tabs.traffic },
            { id: "calendar", label: labels.tabs.calendar },
            { id: "execution", label: labels.tabs.execution },
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
                detailAccess={detailAccess}
                competitorAccess={competitorAccess}
              />
            ),
            calendar: (
              <MediaAvailabilityCalendar
                mediaId={media.id}
                mediaName={displayName}
                instantBookingEligible={instantBookingEligible}
                catalogPrice={media.price}
                pricePeriod={media.pricePeriod}
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
              displayName={displayName}
              periodLabel={periodLabel}
            />
          }
          similarSection={
            <MediaSimilarCarousel
              items={similar}
              isKo={isKo}
              title={labels.similarTitle}
              sortable={
                media.keywordFilter
                  ? undefined
                  : { catalog, currentMedia: media, limit: 4 }
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
    </HomeLandingDayNight>
  );
}
