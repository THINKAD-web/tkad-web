/** `/media/map` 조작 온보딩 — localStorage 1회성 플래그 */

const PREFIX = "tkad_map_";

export const MAP_ONBOARDING_KEYS = {
  /** "이 지역에서 검색" 코치마크 */
  searchCoachmark: `${PREFIX}onboarding_seen`,
  /** 패닝 후 미검색 토스트 힌트 */
  searchNudge: `${PREFIX}search_nudge_seen`,
  /** 모바일 시트 peek 드래그 힌트 */
  sheetPeekHint: `${PREFIX}sheet_hint_seen`,
} as const;

export type MapOnboardingKey =
  (typeof MAP_ONBOARDING_KEYS)[keyof typeof MAP_ONBOARDING_KEYS];

function canUseStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function hasSeenMapOnboarding(key: MapOnboardingKey): boolean {
  if (!canUseStorage()) return true;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

export function markMapOnboardingSeen(key: MapOnboardingKey): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* quota / private mode */
  }
}
