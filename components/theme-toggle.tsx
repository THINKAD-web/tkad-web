"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  THEME_AUTO_CHANGED_EVENT,
  isAutoThemeMode,
  resolveAutoTheme,
  setManualTheme,
} from "@/lib/theme-auto";

import { headerChromeIconButtonClass } from "@/components/public-chrome/header-chrome-buttons";

const defaultToggleClass = headerChromeIconButtonClass;

/**
 * Light / Dark 토글. 자동 모드일 때 ☀️/🌙 + "자동" 표시.
 * 클릭 시 수동 모드(자정까지 유지).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [autoMode, setAutoMode] = useState(true);

  const syncAutoMode = useCallback(() => {
    setAutoMode(isAutoThemeMode());
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
      syncAutoMode();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [syncAutoMode]);

  useEffect(() => {
    const onAutoChanged = () => syncAutoMode();
    window.addEventListener(THEME_AUTO_CHANGED_EVENT, onAutoChanged);
    return () =>
      window.removeEventListener(THEME_AUTO_CHANGED_EVENT, onAutoChanged);
  }, [syncAutoMode]);

  const cls = cn(defaultToggleClass, "relative gap-0.5", className);

  if (!mounted) {
    return (
      <span
        className={cls}
        aria-hidden
        data-tkad-theme-toggle-placeholder
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    setManualTheme(next);
    setTheme(next);
    setAutoMode(false);
  };

  const label = autoMode
    ? isDark
      ? "자동 다크 모드 (클릭하여 수동 전환)"
      : "자동 라이트 모드 (클릭하여 수동 전환)"
    : isDark
      ? "라이트 모드로 전환"
      : "다크 모드로 전환";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cls}
      data-theme-mode={autoMode ? "auto" : "manual"}
      data-auto-would-be={resolveAutoTheme()}
    >
      <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
        {isDark ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </span>
      {autoMode ? (
        <span className="text-[9px] font-semibold leading-none text-violet-600 dark:text-violet-300">
          자동
        </span>
      ) : null}
    </button>
  );
}
