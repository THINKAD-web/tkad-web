"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { HomeAppearance } from "@/lib/home-appearance";

/**
 * 사이트 라이트/다크(ThemeToggle, `html.dark`)와 동일 — 랜딩 `data-appearance`·네온 섹션에 공통 적용.
 * SSR~첫 클라이언트 틱은 `defaultTheme="dark"` 에 맞춰 `night` 고정.
 */
export function useTkadAppearance(): HomeAppearance {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // next-themes: SSR/CSR 불일치 방지 — ThemeToggle 과 동일 패턴
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount gate only
    setMounted(true);
  }, []);
  if (!mounted) return "night";
  return resolvedTheme === "light" ? "day" : "night";
}
