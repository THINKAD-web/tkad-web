"use client";

import { useServerInsertedHTML } from "next/navigation";
import { THEME_INIT_SCRIPT } from "@/lib/theme-auto";

/**
 * SSR HTML에만 테마 클래스를 주입 — 클라이언트 React 트리에는 script가 없어 React 19 경고 없음.
 */
export function ThemeInitScript() {
  useServerInsertedHTML(() => (
    <script
      id="tkad-theme-init"
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  ));

  return null;
}
