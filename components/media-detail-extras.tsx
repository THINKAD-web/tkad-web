"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getCampaignMonitoringMapProvider } from "@/components/campaign-monitoring-map";
import type { MediaItem } from "@/lib/media-data";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";
import { MapPin, MessageCircle } from "lucide-react";
import { MediaQuoteCtaButton } from "@/components/media-quote-cta";

const MediaBrowseMap = dynamic(() => import("@/components/media-browse-map"), {
  ssr: false,
});

export default function MediaDetailExtras({
  media,
  locale,
  labels,
}: {
  media: MediaItem;
  locale: string;
  labels: {
    locationMap: string;
    openKakao: string;
    openGoogle: string;
    inquiry: string;
    /** @deprecated 견적 CTA는 `media.detail` 번역(`stickyCtaQuote`)으로 통일 */
    quote?: string;
    galleryLightboxClose: string;
    galleryLightboxPrev: string;
    galleryLightboxNext: string;
    galleryExpand: string;
    galleryClickHint: string;
    locationAddressLabel: string;
    locationRegionLabel: string;
    kakaoMapEmbedBadge: string;
  };
}) {
  const isKo = locale === "ko";
  const tMedia = useTranslations("media");
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(media.id);
  const kakaoUrl = `https://map.kakao.com/link/map/${encodeURIComponent(isKo ? media.name : media.nameEn)},${media.lat},${media.lng}`;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${media.lat},${media.lng}`;
  const mapProvider = useMemo(() => getCampaignMonitoringMapProvider(), []);
  const regionDisplay = useMemo(() => {
    switch (media.region) {
      case "seoul":
        return tMedia("regions.seoul");
      case "busan":
        return tMedia("regions.busan");
      case "jeju":
        return tMedia("regions.jeju");
      case "national":
        return tMedia("regions.national");
      default:
        return media.region;
    }
  }, [media.region, tMedia]);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <MediaQuoteCtaButton media={media} variant="inline" />
        <Link href={`/contact?media=${media.id}`}>
          <Button
            variant="outline"
            className="h-12 border-2 border-navy/25 px-5 font-semibold sm:h-14"
          >
            <MessageCircle className="mr-2 h-5 w-5 shrink-0" />
            {labels.inquiry}
          </Button>
        </Link>
      </div>

      <h2 className="mb-4 text-lg font-bold text-navy">{labels.locationMap}</h2>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-10">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-7 lg:max-w-md">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-gold-dark" aria-hidden />
              {labels.locationAddressLabel}
            </p>
            <p className="text-base font-medium leading-relaxed text-navy">
              {isKo ? media.location : media.locationEn}
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {labels.locationRegionLabel}
            </p>
            <p className="text-base font-semibold text-navy">{regionDisplay}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-navy/10 pt-5">
            <a
              href={kakaoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-navy underline decoration-navy/30 underline-offset-[3px] transition-colors hover:text-navy-light hover:decoration-navy/50"
            >
              {labels.openKakao}
            </a>
            <span className="text-sm text-navy/35 select-none" aria-hidden>
              ·
            </span>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-navy underline decoration-navy/30 underline-offset-[3px] transition-colors hover:text-navy-light hover:decoration-navy/50"
            >
              {labels.openGoogle}
            </a>
          </div>
        </div>
        <div className="min-w-0 flex-1 lg:min-w-0 lg:flex-[1.15]">
          {mapProvider === "kakao" ? (
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {labels.kakaoMapEmbedBadge}
            </p>
          ) : null}
          <MediaBrowseMap
            items={[media]}
            locale={locale}
            selectedId={mapSelectedId}
            onSelectId={setMapSelectedId}
            className="mb-0"
            fixedMapHeightPx={400}
            showFooterCaption={false}
          />
        </div>
      </div>
    </>
  );
}
