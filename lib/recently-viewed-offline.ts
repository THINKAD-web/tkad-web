/** 오프라인 페이지용 — 마지막으로 본 매체 카드 (localStorage, 최대 3개) */
export type OfflineRecentMediaCard = {
  id: string;
  name: string;
  location?: string;
  type?: string;
  price?: number;
  imageUrl?: string;
};

const STORAGE_KEY = "tkad-offline-recent-media";
export const OFFLINE_RECENT_MAX = 3;

export function readOfflineRecentMediaCards(): OfflineRecentMediaCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is OfflineRecentMediaCard =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as OfflineRecentMediaCard).id === "string" &&
          typeof (x as OfflineRecentMediaCard).name === "string",
      )
      .slice(0, OFFLINE_RECENT_MAX);
  } catch {
    return [];
  }
}

export function pushOfflineRecentMediaCard(card: OfflineRecentMediaCard): void {
  if (typeof window === "undefined" || !card.id) return;
  try {
    const current = readOfflineRecentMediaCards().filter((x) => x.id !== card.id);
    const updated = [card, ...current].slice(0, OFFLINE_RECENT_MAX);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}
