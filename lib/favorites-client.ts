import {
  FAVORITES_CHANGE_EVENT,
  FAVORITES_GUEST_MAX,
  FAVORITES_STORAGE_KEY,
} from "@/lib/favorites-constants";

export type FavoriteEntry = {
  id: string;
  name: string;
  nameEn: string;
};

export function getGuestFavoriteEntries(): FavoriteEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is FavoriteEntry =>
          x !== null &&
          typeof x === "object" &&
          typeof (x as FavoriteEntry).id === "string" &&
          typeof (x as FavoriteEntry).name === "string",
      )
      .map((x) => ({
        id: x.id,
        name: x.name,
        nameEn:
          typeof x.nameEn === "string" && x.nameEn.trim()
            ? x.nameEn
            : x.name,
      }))
      .slice(0, FAVORITES_GUEST_MAX);
  } catch {
    return [];
  }
}

export function getGuestFavoriteIds(): string[] {
  return getGuestFavoriteEntries().map((e) => e.id);
}

export function isGuestFavorite(mediaId: string): boolean {
  return getGuestFavoriteIds().includes(mediaId);
}

export function setGuestFavoriteEntries(entries: FavoriteEntry[]): void {
  if (typeof window === "undefined") return;
  const next = entries.slice(0, FAVORITES_GUEST_MAX);
  let prevSerialized = "";
  try {
    prevSerialized = localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "";
  } catch {
    /* ignore */
  }
  const nextSerialized = JSON.stringify(next);
  if (prevSerialized === nextSerialized) return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, nextSerialized);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
}

export type GuestFavoriteToggleResult =
  | { ok: true; favorited: boolean }
  | { ok: false; reason: "max" };

export function toggleGuestFavorite(entry: FavoriteEntry): GuestFavoriteToggleResult {
  const current = getGuestFavoriteEntries();
  const idx = current.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    const next = current.filter((e) => e.id !== entry.id);
    setGuestFavoriteEntries(next);
    return { ok: true, favorited: false };
  }
  if (current.length >= FAVORITES_GUEST_MAX) {
    return { ok: false, reason: "max" };
  }
  setGuestFavoriteEntries([entry, ...current]);
  return { ok: true, favorited: true };
}

export function removeGuestFavorite(mediaId: string): void {
  setGuestFavoriteEntries(
    getGuestFavoriteEntries().filter((e) => e.id !== mediaId),
  );
}

export function subscribeFavorites(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === FAVORITES_STORAGE_KEY || e.key === null) onChange();
  };
  const onLocal = () => onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(FAVORITES_CHANGE_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FAVORITES_CHANGE_EVENT, onLocal);
  };
}

/** 로그인 후 게스트 찜을 계정에 병합 */
export async function mergeGuestFavoritesToAccount(): Promise<void> {
  const entries = getGuestFavoriteEntries();
  if (!entries.length) return;
  for (const e of entries) {
    try {
      await fetch("/api/my/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: e.id, action: "add" }),
      });
    } catch {
      /* 개별 실패는 무시하고 계속 */
    }
  }
  setGuestFavoriteEntries([]);
}
