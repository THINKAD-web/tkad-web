"use client";

import { useEffect } from "react";
import {
  normalizeOfflineMedia,
  saveOfflineCatalog,
} from "@/lib/pwa-offline-store";

/**
 * 온라인일 때 공개 매체 카탈로그를 IndexedDB에 스냅샷.
 * 현장 답사 오프라인에서 /offline 및 매체 목록 참고용.
 */
export function PwaCatalogSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.onLine) return;

    const sync = async () => {
      try {
        const res = await fetch("/api/public/media-catalog", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as unknown;
        if (!Array.isArray(data)) return;
        await saveOfflineCatalog(
          data.map((row) =>
            normalizeOfflineMedia(
              row as {
                id: string;
                name: string;
                location: string;
                type: string;
                price: number;
                image?: string;
              },
            ),
          ),
        );
      } catch {
        /* ignore */
      }
    };

    void sync();
    const onOnline = () => void sync();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
