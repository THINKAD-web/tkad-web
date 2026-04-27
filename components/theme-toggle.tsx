"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Light / Dark 2-way 토글 — 한 번 클릭마다 light ↔ dark 전환.
 *
 * 사용자 요청: System 모드 제거. 해 / 달 두 가지로만.
 *
 * 하이드레이션 전에는 빈 사각 placeholder 렌더해 FOUC 방지.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const label = isDark ? "라이트 모드로 전환" : "다크 모드로 전환";
  const ariaLabel = mounted ? label : "테마 전환";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={ariaLabel}
      title={mounted ? label : undefined}
      className={
        className ??
        "inline-flex h-9 w-9 items-center justify-center border-2 border-bx-black bg-bx-white text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
      }
    >
      {!mounted ? (
        <span className="block h-4 w-4 bg-current opacity-20" />
      ) : isDark ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
}
