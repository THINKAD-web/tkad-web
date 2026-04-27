"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import { useEffect } from "react";

/**
 * 다크모드 Provider — next-themes 가 html 태그에 `class="dark"` 를 붙였다 뺐다 한다.
 *
 * - attribute="class" : html.dark 토글 (Tailwind v4 의 `.dark:` variant)
 * - defaultTheme="system" : 최초 방문자는 OS 설정 따라감
 * - enableSystem=true : "Auto" 옵션 활성화
 * - disableTransitionOnChange : 전환 시 CSS transition 잠깐 꺼서 색상 깜빡임 최소화
 * - storageKey : LocalStorage 키 (tkad 프리픽스로 충돌 방지)
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Guard: Some third-party scripts can trigger `unhandledRejection: undefined`,
  // which surfaces as a noisy Next.js runtime error overlay. Prevent only the
  // undefined/no-info case; keep real errors visible.
  useEffect(() => {
    const onUnhandled = (e: PromiseRejectionEvent) => {
      if (e.reason === undefined) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => window.removeEventListener("unhandledrejection", onUnhandled);
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="tkad-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
