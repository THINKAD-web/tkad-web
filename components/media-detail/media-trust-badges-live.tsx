"use client";

import { useEffect, useState } from "react";
import { MediaTrustBadges } from "@/components/media/media-trust-badges";
import { contextTrustBadges, type MediaTrustBadge } from "@/lib/media-trust";

type Props = {
  mediaId: string;
  /** Server-computed badges (instant_booking/verified_execution/new) — never
   * includes popular/hot_week, since the detail page's catalog fetch skips
   * fetchTrustBadgeContext() to stay off the 3600s revalidate floor. */
  baseBadges: MediaTrustBadge[];
  isKo: boolean;
  compact?: boolean;
  className?: string;
};

/**
 * Adds the two context-gated badges (popular/hot_week) client-side, fetched
 * from GET /api/public/trust-badges — a single CDN-cached, global endpoint
 * shared by every detail page (see reports/isr-writes-root-cause-20260907.md).
 * Renders baseBadges immediately; the extra badges pop in after the fetch
 * resolves (no layout shift beyond an extra chip appearing).
 */
export function MediaTrustBadgesLive({
  mediaId,
  baseBadges,
  isKo,
  compact,
  className,
}: Props) {
  const [extra, setExtra] = useState<MediaTrustBadge[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/trust-badges")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { topInquiryIds?: string[]; hotWeekIds?: string[] } | null) => {
        if (cancelled || !data) return;
        const ctx = {
          topInquiryIds: new Set(data.topInquiryIds ?? []),
          hotWeekIds: new Set(data.hotWeekIds ?? []),
        };
        setExtra(contextTrustBadges(ctx, mediaId));
      })
      .catch(() => {
        /* badges are decorative — silently skip on failure */
      });
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  const badges = extra.length > 0 ? [...extra, ...baseBadges] : baseBadges;
  if (badges.length === 0) return null;

  return (
    <MediaTrustBadges
      badges={badges}
      isKo={isKo}
      compact={compact}
      className={className}
    />
  );
}
