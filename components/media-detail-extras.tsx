"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import MediaGallery from "@/components/media-gallery";
import type { MediaItem } from "@/lib/media-data";
import { resolveMediaGallery } from "@/lib/media-data";
import { Calculator, MessageCircle } from "lucide-react";

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
  };
}) {
  const isKo = locale === "ko";
  const [mapSelectedId, setMapSelectedId] = useState<number | null>(media.id);
  const gallery = resolveMediaGallery(media);
  const kakaoUrl = `https://map.kakao.com/link/map/${encodeURIComponent(isKo ? media.name : media.nameEn)},${media.lat},${media.lng}`;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${media.lat},${media.lng}`;

  return (
    <>
      <MediaGallery
        images={gallery}
        altBase={isKo ? media.name : media.nameEn}
        className="mb-10"
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

      <h2 className="mb-3 text-lg font-bold text-navy">{labels.locationMap}</h2>
      <MediaBrowseMap
        items={[media]}
        locale={locale}
        selectedId={mapSelectedId}
        onSelectId={setMapSelectedId}
        className="mb-4"
      />
      <div className="flex flex-wrap gap-2">
        <a
          href={kakaoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-gold hover:text-gold-dark"
        >
          {labels.openKakao}
        </a>
        <span className="text-muted-foreground">·</span>
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-gold hover:text-gold-dark"
        >
          {labels.openGoogle}
        </a>
      </div>
    </>
  );
}
