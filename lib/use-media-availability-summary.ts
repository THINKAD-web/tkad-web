"use client";

import { useEffect, useState } from "react";
import type { AvailabilityTier } from "@/lib/media-availability-stats";

export type AvailabilitySummaryItem = {
  availabilityPct: number;
  availableDays: number;
  totalDays: number;
  blockedDays: number;
  tier: AvailabilityTier;
};

export type AvailabilitySummaryResponse = {
  month: string;
  from: string;
  to: string;
  items: Record<string, AvailabilitySummaryItem>;
};

export function useMediaAvailabilitySummary(month?: string) {
  const [summary, setSummary] = useState<AvailabilitySummaryResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const qs = month ? `?month=${encodeURIComponent(month)}` : "";
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/public/media/availability-summary${qs}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as AvailabilitySummaryResponse;
        if (!cancelled) setSummary(json);
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month]);

  return { summary, loading };
}
