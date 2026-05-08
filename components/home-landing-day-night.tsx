"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import {
  getHomeAppearanceServerSnapshot,
  readHomeAppearance,
  subscribeHomeAppearance,
} from "@/lib/home-appearance";

type Props = {
  children: ReactNode;
};

/** 홈·서비스 루트 `data-appearance` — 토글은 `HomeAppearanceToggle`(헤더, 해당 페이지에서만) */
export function HomeLandingDayNight({ children }: Props) {
  const appearance = useSyncExternalStore(
    subscribeHomeAppearance,
    readHomeAppearance,
    getHomeAppearanceServerSnapshot,
  );

  return (
    <div
      className="tkad-home-appearance min-h-[100dvh]"
      data-appearance={appearance}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}
