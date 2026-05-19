import {
  mergeRecentlyViewedRecords,
  readRecentlyViewedRecords,
  type RecentlyViewedRecord,
  writeRecentlyViewedRecords,
} from "@/lib/recently-viewed";

let syncPromise: Promise<void> | null = null;

/** 로그인 사용자: localStorage ↔ 서버 병합 (다기기 동기화). */
export async function syncRecentlyViewedWithServer(): Promise<void> {
  if (typeof window === "undefined") return;
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const local = readRecentlyViewedRecords();
    if (local.length > 0) {
      await postRecentlyViewedToServer(local);
    }

    const server = await fetchRecentlyViewedFromServer();
    const merged = mergeRecentlyViewedRecords(local, server);
    writeRecentlyViewedRecords(merged, { notify: true });

    if (merged.length > 0) {
      await postRecentlyViewedToServer(merged);
    }
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

export async function postRecentlyViewedToServer(
  items: RecentlyViewedRecord[],
): Promise<boolean> {
  if (typeof window === "undefined" || items.length === 0) return false;
  try {
    const res = await fetch("/api/my/recently-viewed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ items }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchRecentlyViewedFromServer(): Promise<
  RecentlyViewedRecord[]
> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch("/api/my/recently-viewed", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      ok?: boolean;
      data?: { items?: RecentlyViewedRecord[] };
    };
    if (!data.ok || !Array.isArray(data.data?.items)) return [];
    return data.data.items;
  } catch {
    return [];
  }
}
