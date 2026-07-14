"use client";

import { MediaDetailMobileChromeSync } from "@/components/mobile/media-detail-mobile-chrome-sync";

type Props = {
  mediaId: string;
  title: string;
  shareDescription: string;
  imageUrl: string;
};

export function MediaDetailHeroChrome({
  mediaId,
  title,
  shareDescription,
  imageUrl,
}: Props) {
  return (
    <MediaDetailMobileChromeSync
      mediaId={mediaId}
      title={title}
      shareDescription={shareDescription}
      imageUrl={imageUrl}
    />
  );
}
