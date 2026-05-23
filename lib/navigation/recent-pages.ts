const STORAGE_KEY = "tkad-recent-pages-v1";
const MAX = 8;

export type RecentPage = {
  href: string;
  labelKo: string;
  labelEn: string;
  visitedAt: number;
};

export function readRecentPages(): RecentPage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is RecentPage =>
        x !== null &&
        typeof x === "object" &&
        typeof (x as RecentPage).href === "string" &&
        typeof (x as RecentPage).labelKo === "string",
    );
  } catch {
    return [];
  }
}

export function pushRecentPage(entry: Omit<RecentPage, "visitedAt">): void {
  if (typeof window === "undefined") return;
  const prev = readRecentPages().filter((x) => x.href !== entry.href);
  const next: RecentPage[] = [
    { ...entry, visitedAt: Date.now() },
    ...prev,
  ].slice(0, MAX);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
