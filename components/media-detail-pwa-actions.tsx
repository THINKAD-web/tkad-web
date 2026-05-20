"use client";

import { useLocale } from "next-intl";
import { MediaKakaoShareButton } from "@/components/media-kakao-share-button";
import { PwaSaveOfflineButton } from "@/components/pwa-save-offline-button";

type Props = {
  media: {
    id: string;
    name: string;
    nameEn?: string | null;
    location: string;
    type: string;
    price: number;
    imageUrl?: string;
  };
};

export function MediaDetailPwaActions({ media }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const name = isKo ? media.name : media.nameEn || media.name;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PwaSaveOfflineButton
        media={{
          id: media.id,
          name,
          location: media.location,
          type: media.type,
          price: media.price,
          imageUrl: media.imageUrl,
        }}
      />
      <MediaKakaoShareButton
        mediaId={media.id}
        mediaName={name}
        mediaType={media.type}
        location={media.location}
        imageUrl={media.imageUrl}
      />
    </div>
  );
}
