"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const defaultToggleClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border/25 bg-muted text-foreground transition-all duration-300 hover:border-hermes hover:bg-foreground hover:text-white hover:shadow-[0_0_28px_rgba(255,98,0,0.35)] dark:border-white/15 dark:bg-muted dark:text-foreground dark:hover:border-hermes dark:hover:bg-hermes dark:hover:text-white dark:hover:shadow-[0_0_32px_rgba(255,98,0,0.45)]";

/**
 * Light / Dark 토글. next-themes 의 resolvedTheme 는 SSR 과 첫 클라이언트 틱에서
 * 불일치할 수 있어, 마운트 전에는 동일한 박스 placeholder 만 렌더 → hydration 안전.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cls = cn(defaultToggleClass, className);

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
    setTheme(isDark ? "light" : "dark");
  };

  const label = isDark ? "라이트 모드로 전환" : "다크 모드로 전환";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cls}
    >
      <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
        {isDark ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </span>
    </button>
  );
}
