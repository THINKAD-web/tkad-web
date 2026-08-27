"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** STEP 2 Preview — GNB accent set toggle via ?gnbSet=1|3 (default Set 1). */
export function GnbAccentSetTrialSync() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const raw = searchParams.get("gnbSet");
    const set =
      raw === "3" ? "3" : raw === "2" ? "2" : raw === "1" ? "1" : null;

    if (set) {
      document.documentElement.dataset.qpAccentSet = set;
    } else {
      delete document.documentElement.dataset.qpAccentSet;
    }

    return () => {
      delete document.documentElement.dataset.qpAccentSet;
    };
  }, [searchParams]);

  return null;
}
