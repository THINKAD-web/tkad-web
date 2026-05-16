"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MediaItem } from "@/lib/media-data";
import { MapPin } from "lucide-react";
import { MediaQuoteCtaButton } from "@/components/media-quote-cta";
import { MediaInquiryDialog } from "@/components/media-detail/inquiry-dialog";
import { MediaDetailLocationMap } from "@/components/media-detail/location-map";
import { SectionHead } from "@/components/brutalist/section-head";
import { buildMediaContactHref } from "@/lib/media-contact";

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
  const tDetail = useTranslations("mediaDetail.cta");
  const mediaTitle = isKo ? media.name : media.nameEn || media.name;
  const contactHref = buildMediaContactHref(media.id, mediaTitle);
  const kakaoUrl = `https://map.kakao.com/link/map/${encodeURIComponent(mediaTitle)},${media.lat},${media.lng}`;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${media.lat},${media.lng}`;
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
        <Link
          href={contactHref}
          className="tkad-media-detail-cta-secondary inline-flex h-12 items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/8 px-6 font-mono text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/12"
        >
          {tDetail("inquiryThisMedia")}
        </Link>
        <MediaInquiryDialog
          mediaId={media.id}
          mediaName={mediaTitle}
          triggerLabel={labels.inquiry}
        />
      </div>

      <div className="mt-14">
        <SectionHead
          number="00"
          category={isKo ? "Location" : "Location"}
          title={labels.locationMap}
          meta={isKo ? "지도·주소·반경 200m POI" : "Map, address, 200m POI"}
          className="mb-6"
        />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-6 border-2 border-border bg-card p-6 lg:max-w-md">
          <div>
            <p className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {labels.locationAddressLabel}
            </p>
            <p className="text-base font-medium leading-relaxed text-foreground">
              {isKo ? media.location : (media.locationEn || media.location)}
            </p>
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              [ {labels.locationRegionLabel} ]
            </p>
            <p className="text-base font-bold text-foreground">{regionDisplay}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-5">
            <a
              href={kakaoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground underline underline-offset-4 transition-colors hover:text-accent"
            >
              {labels.openKakao}
            </a>
            <span className="font-mono text-muted-foreground/40 select-none" aria-hidden>
              ·
            </span>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground underline underline-offset-4 transition-colors hover:text-accent"
            >
              {labels.openGoogle}
            </a>
          </div>
        </div>
        <div className="min-w-0 flex-1 lg:flex-[1.15]">
          <MediaDetailLocationMap media={media} isKo={isKo} />
        </div>
      </div>
    </>
  );
}
