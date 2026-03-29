"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getCampaignMonitoringMapProvider } from "@/components/campaign-monitoring-map";
import MediaGallery from "@/components/media-gallery";
import type { MediaItem } from "@/lib/media-data";
import { resolveMediaGallery } from "@/lib/media-data";
import { Calculator, MapPin, MessageCircle } from "lucide-react";

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
    quote: string;
    galleryLightboxClose: string;
    galleryLightboxPrev: string;
    galleryLightboxNext: string;
    galleryExpand: string;
    locationAddressLabel: string;
    locationRegionLabel: string;
    kakaoMapEmbedBadge: string;
  };
}) {
  const isKo = locale === "ko";
  const tMedia = useTranslations("media");
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(media.id);
  const gallery = resolveMediaGallery(media);
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
      <MediaGallery
        images={gallery}
        altBase={isKo ? media.name : media.nameEn}
        className="mb-10"
        labels={{
          close: labels.galleryLightboxClose,
          prev: labels.galleryLightboxPrev,
          next: labels.galleryLightboxNext,
          expand: labels.galleryExpand,
        }}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={`/quote?media=${media.id}`}>
          <Button className="bg-gold font-semibold text-navy hover:bg-gold-dark">
            <Calculator className="mr-2 h-4 w-4" />
            {labels.quote}
          </Button>
        </Link>
        <Link href={`/contact?media=${media.id}`}>
          <Button variant="outline" className="font-semibold border-navy/20">
            <MessageCircle className="mr-2 h-4 w-4" />
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
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-navy/10 pt-5">
            <a
              href={kakaoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-gold hover:text-gold-dark"
            >
              {labels.openKakao}
            </a>
            <span className="text-muted-foreground" aria-hidden>
              ·
            </span>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-gold hover:text-gold-dark"
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
