"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  appearanceFromThemeMode,
  getServerAppearanceSnapshot,
  readAppearanceFromDocument,
  type HomeAppearance,
} from "@/lib/home-appearance";
import { THEME_AUTO_CHANGED_EVENT } from "@/lib/theme-auto";

function subscribeToAppearance(onStoreChange: () => void): () => void {
  const root = document.documentElement;
  const observer = new MutationObserver(onStoreChange);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["class"],
  });
  window.addEventListener(THEME_AUTO_CHANGED_EVENT, onStoreChange);
  return () => {
    observer.disconnect();
    window.removeEventListener(THEME_AUTO_CHANGED_EVENT, onStoreChange);
  };
}

/**
 * 사이트 라이트/다크(ThemeToggle, `html.dark`)와 동일한 day/night 값.
 *
 * ⚠️ 렌더 분기(className·DOM 선택)에는 쓰지 말 것. 랜딩 외형은 CSS 가 `html.dark` 에서
 * 직접 파생한다(`html.dark …` / `html:not(.dark) …`, Tailwind `dark:`). JS state 로
 * 외형을 고르면 SSR(서버 시간)과 클라이언트 `html.dark` 가 어긋나 깜빡임이 재발한다.
 * 이 훅은 순수 로직(비-렌더) 용도로만 유지한다.
 *
 * - SSR: `resolveAutoTheme()` (시간 자동, `ThemeInitScript` 기본과 동일)
 * - 클라이언트: `html.dark` (블로킹 스크립트·수동 토글 반영)
 * - `resolvedTheme` 확정 후: next-themes 와 동기
 */
export function useTkadAppearance(): HomeAppearance {
  const { resolvedTheme } = useTheme();

  const fromDocument = useSyncExternalStore(
    subscribeToAppearance,
    readAppearanceFromDocument,
    getServerAppearanceSnapshot,
  );

  if (resolvedTheme === "light" || resolvedTheme === "dark") {
    return appearanceFromThemeMode(resolvedTheme);
  }

  return fromDocument;
}
