"use client";

import { useCallback, useSyncExternalStore } from "react";
import { CloudMoon, CloudSun } from "lucide-react";
import { useLocale } from "next-intl";
import {
  getHomeAppearanceServerSnapshot,
  readHomeAppearance,
  subscribeHomeAppearance,
  writeHomeAppearance,
  type HomeAppearance,
} from "@/lib/home-appearance";

const btnClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border/25 bg-muted text-foreground transition-all duration-300 hover:border-hermes hover:bg-foreground hover:text-white hover:shadow-[0_0_28px_rgba(255,98,0,0.35)] dark:border-white/15 dark:bg-muted dark:text-foreground dark:hover:border-hermes dark:hover:bg-hermes dark:hover:text-white dark:hover:shadow-[0_0_32px_rgba(255,98,0,0.45)]";

/** 홈·랜딩류(/planner 등) — 네온 랜딩만 낮·밤. 사이트 라이트/다크(ThemeToggle)와 별개. */
export function HomeAppearanceToggle() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const mode = useSyncExternalStore(
    subscribeHomeAppearance,
    readHomeAppearance,
    getHomeAppearanceServerSnapshot,
  );

  const toggle = useCallback(() => {
    const next: HomeAppearance = mode === "night" ? "day" : "night";
    writeHomeAppearance(next);
  }, [mode]);

  const label = isKo
    ? mode === "day"
      ? "랜딩: 밤(다크 네온)으로 전환"
      : "랜딩: 낮(라이트 카드)으로 전환"
    : mode === "day"
      ? "Landing: switch to night (dark neon)"
      : "Landing: switch to day (light cards)";
  const title = isKo
    ? "이 페이지의 네온 랜딩만 낮(밝은 카드·진한 글자) / 밤(다크 글래스)으로 바꿉니다. 헤더의 해·달 아이콘은 사이트 전체 테마와 무관합니다."
    : "Toggles this page’s neon landing only: day (light cards, dark type) vs night (dark glass). The sun/moon here is not the site-wide theme.";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={title}
      className={btnClass}
    >
      <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
        {mode === "day" ?
          <CloudSun className="h-4 w-4" />
        : <CloudMoon className="h-4 w-4" />}
      </span>
    </button>
  );
}
