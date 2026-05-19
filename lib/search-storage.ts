export const RECENT_SEARCHES_KEY = "tkad-recent-searches-v1";
export const MAX_RECENT_SEARCHES = 8;

export const POPULAR_SEARCHES_KO = [
  "강남",
  "홍대",
  "성수",
  "전광판",
  "지하철",
  "버스",
  "강남역",
  "코엑스",
  "DOOH",
  "옥외광고",
] as const;

export const POPULAR_SEARCHES_EN = [
  "Gangnam",
  "Hongdae",
  "Seongsu",
  "billboard",
  "subway",
  "bus shelter",
  "COEX",
  "DOOH",
  "OOH",
] as const;

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function pushRecentSearch(query: string): string[] {
  const q = query.trim();
  if (!q || typeof window === "undefined") return readRecentSearches();
  const prev = readRecentSearches().filter(
    (x) => x.toLowerCase() !== q.toLowerCase(),
  );
  const next = [q, ...prev].slice(0, MAX_RECENT_SEARCHES);
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    /* ignore */
  }
}
