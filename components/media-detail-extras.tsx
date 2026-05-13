"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { getCampaignMonitoringMapProvider } from "@/components/campaign-monitoring-map";
import type { MediaItem } from "@/lib/media-data";
import { MapPin } from "lucide-react";
import { MediaQuoteCtaButton } from "@/components/media-quote-cta";
import { MediaInquiryDialog } from "@/components/media-detail/inquiry-dialog";
import { SectionHead } from "@/components/brutalist/section-head";

const KakaoMapView = dynamic(() => import("@/components/media-map/kakao-map-view"), {
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
  const [coverageGeoJson, setCoverageGeoJson] = useState<unknown | null>(null);

  const coverageCodesKey = useMemo(() => {
    if (media.type !== "mobile" || !media.coverageDistrictCodes?.length) return "";
    return [...media.coverageDistrictCodes].sort().join(",");
  }, [media.type, media.coverageDistrictCodes]);

  useEffect(() => {
    if (!coverageCodesKey) {
      setCoverageGeoJson(null);
      return;
    }
    const qs = encodeURIComponent(coverageCodesKey);
    let cancelled = false;
    void fetch(`/api/geo/district-boundaries?codes=${qs}`)
      .then((r) => r.json())
      .then((fc) => {
        if (!cancelled) setCoverageGeoJson(fc);
      })
      .catch(() => {
        if (!cancelled) setCoverageGeoJson(null);
      });
    return () => {
      cancelled = true;
    };
  }, [coverageCodesKey]);
  const kakaoUrl = `https://map.kakao.com/link/map/${encodeURIComponent(isKo ? media.name : (media.nameEn || media.name))},${media.lat},${media.lng}`;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${media.lat},${media.lng}`;
  // map provider: keep for compatibility, but detail uses the same Kakao map UI as `/media/map`.
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
        <MediaInquiryDialog
          mediaId={media.id}
          mediaName={isKo ? media.name : (media.nameEn || media.name)}
          triggerLabel={labels.inquiry}
        />
      </div>

      <div className="mt-14">
        <SectionHead
          number="00"
          category={isKo ? "Location" : "Location"}
          title={labels.locationMap}
          meta={isKo ? "지도·주소·외부 링크" : "Map, address, external links"}
          className="mb-6"
        />
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-6 rounded-[24px] border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur lg:max-w-md">
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
        <div className="min-w-0 flex-1 overflow-hidden rounded-[24px] border border-border/80 bg-card/80 shadow-sm backdrop-blur lg:min-w-0 lg:flex-[1.15]">
          {mapProvider === "kakao" ? (
            <p className="border-b border-border/70 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              [ {labels.kakaoMapEmbedBadge} ]
            </p>
          ) : null}
          <div className="h-[400px]">
            <KakaoMapView
              markers={[
                {
                  id: media.id,
                  name: isKo ? media.name : (media.nameEn || media.name),
                  lat: media.lat,
                  lng: media.lng,
                  price: Number(media.price ?? 0),
                  type: media.type,
                },
              ]}
              selectedId={mapSelectedId}
              onSelect={(id) => setMapSelectedId(id)}
              onBoundsChange={() => {
                // detail page: bounds not used
              }}
              onMarkerDetail={() => window.open(kakaoUrl, "_blank", "noopener,noreferrer")}
              center={{ lat: media.lat, lng: media.lng }}
              zoom={4}
              coverageGeoJson={coverageGeoJson}
              fitCoverageBounds={Boolean(media.coverageDistrictCodes?.length)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
