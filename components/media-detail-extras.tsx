"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { getCampaignMonitoringMapProvider } from "@/components/campaign-monitoring-map";
import type { MediaItem } from "@/lib/media-data";
import { MapPin, MessageCircle } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
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
  const kakaoUrl = `https://map.kakao.com/link/map/${encodeURIComponent(isKo ? media.name : (media.nameEn || media.name))},${media.lat},${media.lng}`;
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
      <div className="mb-6 flex flex-wrap gap-3">
        <MediaQuoteCtaButton media={media} variant="inline" />
        <BtnBlock href={`/contact?media=${media.id}`} variant="secondary" size="md">
          <MessageCircle className="h-4 w-4 shrink-0" />
          {labels.inquiry}
        </BtnBlock>
      </div>

      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
        [ LOCATION MAP ]
      </p>
      <h2 className="mt-2 mb-6 text-xl font-bold tracking-tight text-bx-black sm:text-2xl">
        {labels.locationMap}
      </h2>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-6 border-2 border-bx-black bg-bx-white p-6 lg:max-w-md">
          <div>
            <p className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {labels.locationAddressLabel}
            </p>
            <p className="text-base font-medium leading-relaxed text-bx-black">
              {isKo ? media.location : (media.locationEn || media.location)}
            </p>
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
              [ {labels.locationRegionLabel} ]
            </p>
            <p className="text-base font-bold text-bx-black">{regionDisplay}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-bx-black pt-5">
            <a
              href={kakaoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black underline underline-offset-4 transition-colors hover:text-bx-accent"
            >
              {labels.openKakao}
            </a>
            <span className="font-mono text-bx-gray-dim/40 select-none" aria-hidden>
              ·
            </span>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black underline underline-offset-4 transition-colors hover:text-bx-accent"
            >
              {labels.openGoogle}
            </a>
          </div>
        </div>
        <div className="min-w-0 flex-1 border-2 border-bx-black bg-bx-white lg:min-w-0 lg:flex-[1.15]">
          {mapProvider === "kakao" ? (
            <p className="border-b-2 border-bx-black px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
              [ {labels.kakaoMapEmbedBadge} ]
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
