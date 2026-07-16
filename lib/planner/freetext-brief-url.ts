/** Planner deep-link query key for home / chat handoff brief text. */
export const PLANNER_BRIEF_QUERY_KEY = "brief";

export const FREETEXT_BRIEF_MAX_CHARS = 2000;

const MIN_BRIEF_CHARS = 3;

export function normalizeFreetextBrief(raw: string): string {
  return raw.trim();
}

export function isValidFreetextBrief(raw: string): boolean {
  const t = normalizeFreetextBrief(raw);
  return t.length >= MIN_BRIEF_CHARS && t.length <= FREETEXT_BRIEF_MAX_CHARS;
}

export function encodeBriefForPlannerQuery(text: string): string | null {
  const trimmed = normalizeFreetextBrief(text);
  if (!isValidFreetextBrief(trimmed)) return null;
  return encodeURIComponent(trimmed);
}

export function decodeBriefFromPlannerQuery(encoded: string | null): string | null {
  if (!encoded) return null;
  try {
    const decoded = normalizeFreetextBrief(decodeURIComponent(encoded));
    if (!isValidFreetextBrief(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

/** Path + query for i18n `Link` / `router.push` (locale prefix added by app router). */
export function buildPlannerBriefPath(text: string): string | null {
  const encoded = encodeBriefForPlannerQuery(text);
  if (!encoded) return null;
  return `/planner?${PLANNER_BRIEF_QUERY_KEY}=${encoded}`;
}

/** 빠른 AI 추천 — 홈·챗봇 handoff (recommend 즉시 결과). */
export function buildRecommendBriefPath(text: string): string | null {
  const encoded = encodeBriefForPlannerQuery(text);
  if (!encoded) return null;
  return `/recommend?${PLANNER_BRIEF_QUERY_KEY}=${encoded}`;
}

export const RECOMMEND_MODE_QUERY_KEY = "mode";
export const RECOMMEND_MODE_AI = "ai";

/** 홈 AI 카드 CTA — recommend AI 탭으로 진입 (입력은 recommend에서). */
export function buildRecommendAiModePath(): string {
  return `/recommend?${RECOMMEND_MODE_QUERY_KEY}=${RECOMMEND_MODE_AI}`;
}
