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
 * 사이트 라이트/다크(ThemeToggle, `html.dark`)와 동일 — 랜딩 `data-appearance`·네온 섹션에 공통 적용.
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
