/** 홈 전용 낮/밤 — ThemeToggle(사이트 라이트·다크)과 별개 */

export const HOME_APPEARANCE_STORAGE_KEY = "tkad-home-appearance";

export const HOME_APPEARANCE_EVENT = "tkad-home-appearance";

export type HomeAppearance = "night" | "day";

export function readHomeAppearance(): HomeAppearance {
  if (typeof window === "undefined") return "day";
  try {
    const raw = window.localStorage.getItem(HOME_APPEARANCE_STORAGE_KEY);
    if (raw === "day" || raw === "night") return raw;
  } catch {
    /* ignore */
  }
  return "day";
}

export function writeHomeAppearance(next: HomeAppearance) {
  try {
    window.localStorage.setItem(HOME_APPEARANCE_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(HOME_APPEARANCE_EVENT));
}

/** `useSyncExternalStore` 용 — 동일 탭 `write` + 다른 탭 `storage` */
export function subscribeHomeAppearance(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const on = () => onStoreChange();
  window.addEventListener(HOME_APPEARANCE_EVENT, on);
  window.addEventListener("storage", on);
  return () => {
    window.removeEventListener(HOME_APPEARANCE_EVENT, on);
    window.removeEventListener("storage", on);
  };
}

export function getHomeAppearanceServerSnapshot(): HomeAppearance {
  return "day";
}
