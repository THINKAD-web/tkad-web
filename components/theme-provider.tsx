"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

const THEME_STORAGE_KEY = "tkad-theme";

/**
 * 예전 설정·다른 탭에서 `tkad-theme=system` 이 남아 있으면, `enableSystem=false` 인데도
 * next-themes 가 OS(일몰 후 다크 등)를 `resolvedTheme` 에 반영해 “자동으로 저녁”처럼 보일 수 있음.
 * 또한 `class="system"` 은 Tailwind `dark:` 와 맞지 않아 헤더 토글이 깨질 수 있어 light/dark 로만 고정.
 */
function CoerceStoredThemeToLightOrDark() {
  const { setTheme } = useTheme();
  const ran = useRef(false);

  useLayoutEffect(() => {
    if (ran.current) return;
    ran.current = true;
    try {
      const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (raw === "system" || (raw != null && raw !== "light" && raw !== "dark")) {
        setTheme("dark");
      }
    } catch {
      setTheme("dark");
    }
  }, [setTheme]);

  return null;
}

/**
 * 다크모드 Provider — next-themes 가 html 태그에 `class="dark"` 를 붙였다 뺐다 한다.
 *
 * - attribute="class" : html.dark 토글 (Tailwind v4 의 `.dark:` variant)
 * - defaultTheme="dark" : 프리미엄 다크 기본
 * - enableSystem=false : 라이트/다크만 토글
 * - themes : system 제외 — OS 연동 없이 저장값만 사용
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
      defaultTheme="dark"
      enableSystem={false}
      themes={["light", "dark"]}
      disableTransitionOnChange
      storageKey={THEME_STORAGE_KEY}
    >
      <CoerceStoredThemeToLightOrDark />
      {children}
    </NextThemesProvider>
  );
}
