/** 다단어 AND 매칭 (공백 구분) */
export function matchesTextQuery(
  haystack: string,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = haystack.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

export function normalizeSearchQuery(raw: string): string {
  return raw.trim().slice(0, 120);
}
