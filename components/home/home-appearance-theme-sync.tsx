"use client";

import { useEffect } from "react";
import { useTkadAppearance } from "@/lib/use-tkad-appearance";

/** 홈 `HomeAppearanceShell` 의 `data-appearance` 만 동기화 — 본문은 서버 렌더 유지 */
export function HomeAppearanceThemeSync() {
  const appearance = useTkadAppearance();

  useEffect(() => {
    document
      .querySelectorAll<HTMLElement>(".tkad-home-appearance[data-ssr-appearance]")
      .forEach((el) => {
        el.setAttribute("data-appearance", appearance);
      });
  }, [appearance]);

  return null;
}
