"use client";

import { useEffect } from "react";
import {
  normalizeOfflineMedia,
  saveOfflineCatalog,
} from "@/lib/pwa-offline-store";

/** localStorage — 24h 내 중복 full sync 방지 (Fast Origin Transfer 절감) */
const SYNC_AT_KEY = "tkad-pwa-catalog-sync-at";
const SYNC_TTL_MS = 24 * 60 * 60 * 1000;
/** 오프라인 스토어가 최대 120건만 보관하므로 경량 popular API로 충분 */
const SYNC_LIMIT = 120;

function recentlySynced(): boolean {
  try {
    const raw = localStorage.getItem(SYNC_AT_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < SYNC_TTL_MS;
  } catch {
    return false;
  }
}

function markSynced(): void {
  try {
    localStorage.setItem(SYNC_AT_KEY, String(Date.now()));
  } catch {
    /* private mode 등 */
  }
}

type LeanMediaRow = {
  id?: string;
  name?: string;
  location?: string;
  type?: string;
  price?: number;
  thumbnailUrl?: string;
};

/**
 * 온라인일 때 공개 매체 카탈로그를 IndexedDB에 스냅샷.
 * 현장 답사 오프라인에서 /offline 및 매체 목록 참고용.
 *
 * 비용: 전체 media-catalog(~5.3MB) 대신 popular limit=120(~100KB) + 24h 스로틀.
 */
export function PwaCatalogSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.onLine) return;

    const sync = async (force = false) => {
      if (!force && recentlySynced()) return;
      try {
        const res = await fetch(
          `/api/public/media?sort=popular&limit=${SYNC_LIMIT}`,
          { credentials: "same-origin" },
        );
        if (!res.ok) return;
        const json = (await res.json()) as { data?: LeanMediaRow[] } | LeanMediaRow[];
        const rows = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : null;
        if (!rows?.length) return;
        await saveOfflineCatalog(
          rows.map((row) =>
            normalizeOfflineMedia({
              id: row.id,
              name: row.name,
              location: row.location,
              type: row.type,
              price: row.price,
              image: row.thumbnailUrl,
            }),
          ),
        );
        markSynced();
      } catch {
        /* ignore */
      }
    };

    void sync(false);
    const onOnline = () => void sync(false);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
