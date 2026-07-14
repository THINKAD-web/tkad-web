"use client";

import { MediaInquiryDialog } from "@/components/media-detail/inquiry-dialog";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import type { MediaItem } from "@/lib/media-data";

type Props = {
  media: MediaItem;
  displayName: string;
  inquiryLabel: string;
};

export function MediaDetailHeroActions({
  media,
  displayName,
  inquiryLabel,
}: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <MediaInquiryDialog
        mediaId={media.id}
        mediaName={displayName}
        triggerLabel={`${inquiryLabel} →`}
        className="w-full justify-center sm:flex-1"
      />
      <MediaFavoriteButton
        mediaId={media.id}
        mediaName={media.name}
        mediaNameEn={media.nameEn}
        className="w-full justify-center sm:w-auto"
      />
    </div>
  );
}
