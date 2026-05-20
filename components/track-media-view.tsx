"use client";

import { useEffect } from "react";
import {
  addRecentlyViewedRecord,
  type RecentlyViewedRecord,
} from "@/lib/recently-viewed";
import { postRecentlyViewedToServer } from "@/lib/recently-viewed-sync";
import {
  pushOfflineRecentMediaCard,
  type OfflineRecentMediaCard,
} from "@/lib/recently-viewed-offline";
import { trackConversion } from "@/lib/tracking/client";

type Props = {
  record: RecentlyViewedRecord;
  offlineCard?: OfflineRecentMediaCard;
};

export default function TrackMediaView({ record, offlineCard }: Props) {
  useEffect(() => {
    addRecentlyViewedRecord(record);
    trackConversion({ type: "media_view", mediaId: record.id });
    if (offlineCard) {
      pushOfflineRecentMediaCard(offlineCard);
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await res.json();
        if (cancelled || !data.ok || !data.data) return;
        await postRecentlyViewedToServer([record]);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record.id 기준 1회 기록
  }, [record.id]);

  return null;
}
