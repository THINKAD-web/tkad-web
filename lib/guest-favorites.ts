"use client";

/**
 * 비로그인 상태에서 모은 찜 매체 ID 임시 저장소.
 * 로그인 직후 `/api/my/favorites/sync` 로 일괄 이관 후 비움.
 *
 * key: tkad-guest-favorites-v1 (string[])
 */

const KEY = "tkad-guest-favorites-v1";

export function readGuestFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function writeGuestFavorites(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const deduped = Array.from(new Set(ids.filter(Boolean)));
    window.localStorage.setItem(KEY, JSON.stringify(deduped));
    window.dispatchEvent(new CustomEvent("tkad-guest-favorites-change"));
  } catch {
    // 무시 (quota 등)
  }
}

export function addGuestFavorite(mediaId: string): void {
  const cur = readGuestFavorites();
  if (cur.includes(mediaId)) return;
  writeGuestFavorites([...cur, mediaId]);
}

export function removeGuestFavorite(mediaId: string): void {
  const cur = readGuestFavorites();
  writeGuestFavorites(cur.filter((x) => x !== mediaId));
}

export function isGuestFavorited(mediaId: string): boolean {
  return readGuestFavorites().includes(mediaId);
}

export function clearGuestFavorites(): void {
  writeGuestFavorites([]);
}
