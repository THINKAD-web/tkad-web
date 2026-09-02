"use client";

import { useEffect, useState } from "react";
import type { BrowseChannelRoute } from "@/lib/browse-catalog-channel";
import type { BrowseFilterOptionCounts } from "@/lib/media-browse-filter-option-counts";

const FILTER_COUNTS_API = "/api/public/media-filter-counts";

const cachedCountsByChannel = new Map<
  BrowseChannelRoute,
  BrowseFilterOptionCounts
>();
const inflightByChannel = new Map<
  BrowseChannelRoute,
  Promise<BrowseFilterOptionCounts>
>();

async function loadBrowseFilterOptionCounts(
  browseChannel: BrowseChannelRoute,
): Promise<BrowseFilterOptionCounts> {
  const cached = cachedCountsByChannel.get(browseChannel);
  if (cached) return cached;
  let inflight = inflightByChannel.get(browseChannel);
  if (!inflight) {
    inflight = fetch(
      `${FILTER_COUNTS_API}?browseChannel=${encodeURIComponent(browseChannel)}`,
      { cache: "force-cache" },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((counts: BrowseFilterOptionCounts | null) => {
        if (!counts || typeof counts !== "object") {
          throw new Error("filter counts fetch failed");
        }
        cachedCountsByChannel.set(browseChannel, counts);
        return counts;
      })
      .finally(() => {
        inflightByChannel.delete(browseChannel);
      });
    inflightByChannel.set(browseChannel, inflight);
  }
  return inflight;
}

export type UseBrowseFilterOptionCountsOptions = {
  /** When false, never fetch (e.g. `/media/map`). */
  enabled?: boolean;
  /** Filter panel open / hover prefetch / visible sub-chip row — defer until true. */
  loadRequested?: boolean;
  browseChannel?: BrowseChannelRoute;
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
  const browseChannel = options.browseChannel ?? "offline";
  const shouldLoad = enabled && loadRequested;

  const [counts, setCounts] = useState<BrowseFilterOptionCounts | null>(() => {
    if (!shouldLoad) return null;
    return cachedCountsByChannel.get(browseChannel) ?? null;
  });
  const [fetchPending, setFetchPending] = useState(
    shouldLoad && !cachedCountsByChannel.has(browseChannel),
  );

  useEffect(() => {
    if (!shouldLoad) return;
    const cached = cachedCountsByChannel.get(browseChannel);
    if (cached) {
      setCounts(cached);
      setFetchPending(false);
      return;
    }
    let cancelled = false;
    setFetchPending(true);
    loadBrowseFilterOptionCounts(browseChannel)
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
  }, [shouldLoad, browseChannel]);

  if (!shouldLoad) {
    return { counts: null, loading: false };
  }

  return {
    counts,
    loading: fetchPending && counts == null,
  };
}
