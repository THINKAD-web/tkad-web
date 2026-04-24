"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

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
