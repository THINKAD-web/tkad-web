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
import { useAuthSession } from "@/components/auth/auth-session-provider";

type Props = {
  record: RecentlyViewedRecord;
  offlineCard?: OfflineRecentMediaCard;
};

export default function TrackMediaView({ record, offlineCard }: Props) {
  const { user, loading } = useAuthSession();

  useEffect(() => {
    addRecentlyViewedRecord(record);
    trackConversion({ type: "media_view", mediaId: record.id });
    if (offlineCard) {
      pushOfflineRecentMediaCard(offlineCard);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record.id 기준 1회 기록
  }, [record.id]);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        if (cancelled) return;
        await postRecentlyViewedToServer([record]);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record.id 기준 1회 동기화
  }, [record.id, user, loading]);

  return null;
}
