import type { MediaItem } from "./media-data";

const STORAGE_KEY = "tkad_recently_viewed";
export const RECENTLY_VIEWED_MAX = 5;

const CHANGED_EVENT = "tkad-recently-viewed-changed";

function notifyChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

/** Stored value: string[] of media ids (new) or legacy full MediaItem[]. */
export function readRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    if (typeof parsed[0] === "string") {
      return parsed.slice(0, RECENTLY_VIEWED_MAX);
    }

    if (
      typeof parsed[0] === "object" &&
      parsed[0] !== null &&
      "id" in (parsed[0] as object)
    ) {
      const ids = (parsed as { id: string }[])
        .map((x) => String(x.id))
        .slice(0, RECENTLY_VIEWED_MAX);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      return ids;
    }
  } catch {
    // ignore
  }
  return [];
}

export function addRecentlyViewedId(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const current = readRecentlyViewedIds();
    const filtered = current.filter((x) => x !== id);
    const updated = [id, ...filtered].slice(0, RECENTLY_VIEWED_MAX);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyChanged();
  } catch {
    // ignore
  }
}

export function addRecentlyViewed(media: MediaItem): void {
  addRecentlyViewedId(media.id);
}

/**
 * localStorage id 목록으로 `/api/media/recently-viewed`를 호출합니다.
 * DB(또는 정적 카탈로그)에 실제로 있는 매체만 반환하고, **성공 시**
 * localStorage를 그 id 목록으로 덮어써 없는 id는 자동 삭제합니다.
 * HTTP 오류 시에는 저장소를 건드리지 않습니다.
 */
export async function fetchRecentlyViewedItems(): Promise<MediaItem[]> {
  if (typeof window === "undefined") return [];
  const ids = readRecentlyViewedIds();
  if (ids.length === 0) return [];
  const q = encodeURIComponent(ids.join(","));
  const res = await fetch(`/api/media/recently-viewed?ids=${q}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: MediaItem[] };
  const raw = Array.isArray(data.items) ? data.items : [];
  const items = raw.slice(0, RECENTLY_VIEWED_MAX);
  replaceRecentlyViewedIdsFromResolvedItems(items);
  return items;
}

export function subscribeRecentlyViewedChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGED_EVENT, cb);
  return () => window.removeEventListener(CHANGED_EVENT, cb);
}

/**
 * API가 반환한 매체 id만 localStorage에 남깁니다 (없는 id 제거).
 * `fetchRecentlyViewedItems` 성공 시에도 호출됩니다. notify 없음.
 */
export function replaceRecentlyViewedIdsFromResolvedItems(
  items: Pick<MediaItem, "id">[],
): void {
  if (typeof window === "undefined") return;
  const ids = items.map((m) => m.id).slice(0, RECENTLY_VIEWED_MAX);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyChanged();
  } catch {
    // ignore
  }
}
