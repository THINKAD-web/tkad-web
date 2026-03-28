import type { MediaItem } from "./media-data";

const STORAGE_KEY = "tkad_recently_viewed";
const MAX_ITEMS = 6;

export function getRecentlyViewed(): MediaItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(media: MediaItem): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRecentlyViewed();
    const filtered = current.filter((m) => m.id !== media.id);
    const updated = [media, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // silently fail
  }
}
