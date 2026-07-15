"use client";

import { useEffect, useState } from "react";
import {
  buildBrowseFilterOptionCounts,
  type BrowseFilterOptionCounts,
} from "@/lib/media-browse-filter-option-counts";
import type { MediaItem } from "@/lib/media-data";

let cachedCounts: BrowseFilterOptionCounts | null = null;
let inflight: Promise<BrowseFilterOptionCounts> | null = null;

async function loadBrowseFilterOptionCounts(): Promise<BrowseFilterOptionCounts> {
  if (cachedCounts) return cachedCounts;
  if (!inflight) {
    inflight = fetch("/api/public/media-catalog", { cache: "force-cache" })
      .then((res) => (res.ok ? res.json() : []))
      .then((items: MediaItem[]) => buildBrowseFilterOptionCounts(items))
      .then((counts) => {
        cachedCounts = counts;
        return counts;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** 서브카테고리·지역 소분류 칩 건수 (카탈로그 1회 fetch, 모듈 캐시) */
export function useBrowseFilterOptionCounts(enabled = true) {
  const [counts, setCounts] = useState<BrowseFilterOptionCounts | null>(
    cachedCounts,
  );

  useEffect(() => {
    if (!enabled) return;
    if (cachedCounts) {
      setCounts(cachedCounts);
      return;
    }
    let cancelled = false;
    loadBrowseFilterOptionCounts()
      .then((next) => {
        if (!cancelled) setCounts(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return counts;
}
