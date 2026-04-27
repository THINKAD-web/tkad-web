"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Light / Dark / System 3-way 토글 — 한 번 클릭마다 system → light → dark 순으로 순회.
 *
 * 하이드레이션 전에는 스켈레톤(비어있는 원) 만 렌더해 theme 값 차이로 인한 FOUC 방지.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycle = () => {
    const next =
      theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
  };

  const label =
    theme === "system"
      ? "시스템 설정"
      : theme === "dark"
        ? "다크 모드"
        : "라이트 모드";

  const ariaLabel = mounted ? `테마: ${label}, 다음으로 전환` : "테마 전환";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={ariaLabel}
      title={mounted ? label : undefined}
      className={
        className ??
        "inline-flex h-9 w-9 items-center justify-center border-2 border-bx-black bg-bx-white text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
      }
    >
      {!mounted ? (
        <span className="block h-4 w-4 bg-current opacity-20" />
      ) : theme === "system" ? (
        <Monitor className="h-4 w-4" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
}
