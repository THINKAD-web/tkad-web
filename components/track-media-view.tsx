"use client";

import { useEffect } from "react";
import { addRecentlyViewedId } from "@/lib/recently-viewed";
import {
  pushOfflineRecentMediaCard,
  type OfflineRecentMediaCard,
} from "@/lib/recently-viewed-offline";

type Props = {
  mediaId: string;
  offlineCard?: OfflineRecentMediaCard;
};

export default function TrackMediaView({ mediaId, offlineCard }: Props) {
  useEffect(() => {
    addRecentlyViewedId(mediaId);
    if (offlineCard) {
      pushOfflineRecentMediaCard(offlineCard);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- offlineCard는 매체당 1회 기록
  }, [mediaId]);

  return null;
}
