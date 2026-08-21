import { MediaDetailHeroGalleryV2 } from "@/components/media-detail/media-detail-hero-gallery-v2";
import { MediaDetailHeroActions } from "@/components/media-detail/media-detail-hero-actions";
import { MediaDetailHeroChrome } from "@/components/media-detail/media-detail-hero-chrome";
import {
  MediaDetailHeroInfo,
  MediaDetailHeroTopBar,
} from "@/components/media-detail/media-detail-hero-info";
import type { MediaItem } from "@/lib/media-data";
import type { MediaPerformanceMetrics } from "@/lib/media-performance";
import { cn } from "@/lib/utils";
import {
  mapItemShowsOnMap,
  resolveMapDisplayMode,
  resolveMediaDetailMapNotice,
} from "@/lib/media-map/map-display-mode";

type Labels = {
  back: string;
  priceTitle: string;
  periodLabel: string;
  inquiry: string;
  quote: string;
  visibilityBadge: string;
  kpiExposure: string;
  kpiCpm: string;
  kpiVisibility: string;
  specSize: string;
  specResolution: string;
  specBrightness: string;
  gallery: {
    close: string;
    prev: string;
    next: string;
    expand: string;
    clickHint: string;
  };
};

type Props = {
  media: MediaItem;
  isKo: boolean;
  typeLabel: string;
  locationShort: string;
  heroTags: string[];
  galleryImages: string[];
  heroImage: string;
  imageAlt: string;
  performanceMetrics: MediaPerformanceMetrics;
  labels: Labels;
  hasPriceOptions: boolean;
  primaryPriceOption?: { price: number; label: string; period?: string };
  className?: string;
};

export function MediaDetailHeroSection({
  media,
  isKo,
  typeLabel,
  locationShort,
  heroTags,
  galleryImages,
  heroImage,
  imageAlt,
  performanceMetrics,
  labels,
  hasPriceOptions,
  primaryPriceOption,
  className,
}: Props) {
  const displayName = isKo ? media.name : media.nameEn || media.name;
  const shareDescription = isKo
    ? `${displayName} — THINKAD 매체 상세`
    : `${displayName} — THINKAD media detail`;

  const mapFallback =
    mapItemShowsOnMap(resolveMapDisplayMode(media)) && media.lat && media.lng
      ? {
          id: media.id,
          name: displayName,
          lat: media.lat,
          lng: media.lng,
          price: Number(media.price ?? 0),
          type: media.type,
        }
      : null;
  const mapNotice = resolveMediaDetailMapNotice(media, isKo);

  return (
    <>
      <MediaDetailHeroChrome
        mediaId={media.id}
        title={displayName}
        shareDescription={shareDescription}
        imageUrl={heroImage}
      />
      <section
        className={cn("mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8", className)}
      >
        <MediaDetailHeroTopBar backLabel={labels.back} />

        <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-12">
          <MediaDetailHeroGalleryV2
            images={galleryImages}
            heroSrc={heroImage}
            altBase={imageAlt}
            labels={labels.gallery}
            mapFallback={mapFallback}
            mapNotice={mapNotice}
            country={media.country}
          />

          <MediaDetailHeroInfo
            media={media}
            isKo={isKo}
            typeLabel={typeLabel}
            locationShort={locationShort}
            heroTags={heroTags}
            performanceMetrics={performanceMetrics}
            labels={{
              back: labels.back,
              priceTitle: labels.priceTitle,
              periodLabel: labels.periodLabel,
              kpiExposure: labels.kpiExposure,
              kpiCpm: labels.kpiCpm,
              kpiVisibility: labels.kpiVisibility,
            }}
            hasPriceOptions={hasPriceOptions}
            primaryPriceOption={primaryPriceOption}
            actions={
              <MediaDetailHeroActions
                media={media}
                displayName={displayName}
                inquiryLabel={labels.inquiry}
              />
            }
          />
        </div>
      </section>
    </>
  );
}
