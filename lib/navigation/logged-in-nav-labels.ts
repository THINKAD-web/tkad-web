/** Logged-in nav labels — keep in sync with `messages/{ko,en}.json` → `planNav`, `favoritesNav`. */
export const PLAN_NAV_LABELS = {
  cart: { ko: "담은 매체", en: "Selected media" },
  saved: { ko: "저장 스냅샷", en: "Plan snapshots" },
  plannerResults: { ko: "플래너·제안서", en: "Planner & proposals" },
  newPlan: { ko: "새 플랜", en: "New plan" },
} as const;

export const FAVORITES_NAV_LABEL = {
  ko: "관심매체",
  en: "Favorite media",
} as const;
