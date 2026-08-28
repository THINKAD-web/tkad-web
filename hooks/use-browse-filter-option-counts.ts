"use client";

import { useEffect, useState } from "react";
import type { BrowseFilterOptionCounts } from "@/lib/media-browse-filter-option-counts";

const FILTER_COUNTS_API = "/api/public/media-filter-counts";

let cachedCounts: BrowseFilterOptionCounts | null = null;
let inflight: Promise<BrowseFilterOptionCounts> | null = null;

async function loadBrowseFilterOptionCounts(): Promise<BrowseFilterOptionCounts> {
  if (cachedCounts) return cachedCounts;
  if (!inflight) {
    inflight = fetch(FILTER_COUNTS_API, { cache: "force-cache" })
      .then((res) => (res.ok ? res.json() : null))
      .then((counts: BrowseFilterOptionCounts | null) => {
        if (!counts || typeof counts !== "object") {
          throw new Error("filter counts fetch failed");
        }
        cachedCounts = counts;
        return counts;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export type UseBrowseFilterOptionCountsOptions = {
  /** When false, never fetch (e.g. `/media/map`). */
  enabled?: boolean;
  /** Filter panel open / hover prefetch / visible sub-chip row — defer until true. */
  loadRequested?: boolean;
};

export type UseBrowseFilterOptionCountsResult = {
  counts: BrowseFilterOptionCounts | null;
  loading: boolean;
};

/** 서브카테고리·지역 소분류 칩 건수 — 서버 사전 계산 API, lazy load. */
export function useBrowseFilterOptionCounts(
  options: UseBrowseFilterOptionCountsOptions = {},
): UseBrowseFilterOptionCountsResult {
  const enabled = options.enabled ?? true;
  const loadRequested = options.loadRequested ?? false;
  const shouldLoad = enabled && loadRequested;

  const [counts, setCounts] = useState<BrowseFilterOptionCounts | null>(
    shouldLoad ? cachedCounts : null,
  );
  const [fetchPending, setFetchPending] = useState(
    shouldLoad && !cachedCounts,
  );

  useEffect(() => {
    if (!shouldLoad) return;
    if (cachedCounts) {
      setCounts(cachedCounts);
      setFetchPending(false);
      return;
    }
    let cancelled = false;
    setFetchPending(true);
    loadBrowseFilterOptionCounts()
      .then((next) => {
        if (!cancelled) {
          setCounts(next);
          setFetchPending(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFetchPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldLoad]);

  if (!shouldLoad) {
    return { counts: null, loading: false };
  }

  return {
    counts,
    loading: fetchPending && counts == null,
  };
}
