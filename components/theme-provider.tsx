"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  THEME_STORAGE_KEY,
  clearExpiredManualTheme,
  dispatchThemeAutoChanged,
  getManualTheme,
  msUntilNextLocalMidnight,
  resolveAutoTheme,
  resolveEffectiveTheme,
} from "@/lib/theme-auto";

function ThemeAutoController() {
  const { setTheme } = useTheme();
  const midnightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyEffectiveTheme = () => {
    clearExpiredManualTheme();
    setTheme(resolveEffectiveTheme());
    dispatchThemeAutoChanged();
  };

  const scheduleMidnightReset = () => {
    if (midnightTimer.current) clearTimeout(midnightTimer.current);
    midnightTimer.current = setTimeout(() => {
      applyEffectiveTheme();
      scheduleMidnightReset();
    }, msUntilNextLocalMidnight());
  };

  useLayoutEffect(() => {
    applyEffectiveTheme();
    scheduleMidnightReset();
    return () => {
      if (midnightTimer.current) clearTimeout(midnightTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hourly = window.setInterval(() => {
      if (getManualTheme() != null) return;
      const auto = resolveAutoTheme();
      setTheme(auto);
      dispatchThemeAutoChanged();
    }, 60 * 60 * 1000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") applyEffectiveTheme();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(hourly);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTheme]);

  return null;
}

/**
 * 다크모드 Provider — next-themes 가 html 태그에 `class="dark"` 를 붙였다 뺐다 한다.
 * 시간대 자동(18–06 다크) + 수동 토글(자정까지 유지) 은 ThemeAutoController 가 처리.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
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
      <ThemeAutoController />
      {children}
    </NextThemesProvider>
  );
}
