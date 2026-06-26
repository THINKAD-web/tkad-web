/** 랜딩/네온 레이아웃용 — 값은 사이트 테마와 동기(`useTkadAppearance`, `data-appearance`). */

import { resolveAutoTheme, type ThemeMode } from "@/lib/theme-auto";

export type HomeAppearance = "night" | "day";

export function appearanceFromThemeMode(mode: ThemeMode): HomeAppearance {
  return mode === "light" ? "day" : "night";
}

/** Client: `ThemeInitScript` / next-themes 가 반영한 `html.dark` 기준 */
export function readAppearanceFromDocument(): HomeAppearance {
  return document.documentElement.classList.contains("dark") ? "night" : "day";
}

/**
 * SSR snapshot — `THEME_INIT_SCRIPT` 기본값(시간 자동)과 동일.
 * 수동 테마 override 는 localStorage 기반이라 서버에서는 알 수 없음.
 */
export function getServerAppearanceSnapshot(): HomeAppearance {
  return appearanceFromThemeMode(resolveAutoTheme());
}
