/** Logged-in nav labels — keep in sync with `messages/{ko,en}.json` → `planNav`, `favoritesNav`. */
export const PLAN_NAV_LABELS = {
  cart: { ko: "담은 매체", en: "Selected media" },
  saved: { ko: "저장한 플랜", en: "Saved plans" },
  plannerResults: { ko: "플래너 결과", en: "Planner results" },
  newPlan: { ko: "새 플랜", en: "New plan" },
} as const;

export const FAVORITES_NAV_LABEL = {
  ko: "관심매체",
  en: "Favorite media",
} as const;
