"use client";

import { useEffect, useState } from "react";
import { isPatternStatsNotesEnabled } from "@/lib/recommend/pattern-stats-flags";
import type { PatternComboDimensions } from "@/lib/recommend/pattern-stats-types";

export function usePatternStatsNote(
  combo: PatternComboDimensions | undefined,
  isKo: boolean,
): string | null {
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!combo || !isPatternStatsNotesEnabled()) {
      setNote(null);
      return;
    }

    let cancelled = false;
    void fetch("/api/pattern-stats/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ combo, isKo }),
    })
      .then((res) => res.json())
      .then((json: { note?: string | null }) => {
        if (!cancelled) setNote(json.note ?? null);
      })
      .catch(() => {
        if (!cancelled) setNote(null);
      });

    return () => {
      cancelled = true;
    };
  }, [combo, isKo]);

  return note;
}
