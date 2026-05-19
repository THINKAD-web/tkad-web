import type { ReactNode } from "react";
import { HomeAppearanceThemeSync } from "@/components/home/home-appearance-theme-sync";

type Props = {
  children: ReactNode;
};

/**
 * 홈 전용 appearance 래퍼 — 서버 HTML에 `data-appearance="night"` 고정(크롤러·첫 페인트).
 * 라이트/다크 토글은 `HomeAppearanceThemeSync` 가 클라이언트에서만 속성 갱신.
 */
export function HomeAppearanceShell({ children }: Props) {
  return (
    <div
      className="tkad-home-appearance flex min-h-0 flex-1 flex-col"
      data-appearance="night"
      data-ssr-appearance="night"
      suppressHydrationWarning
    >
      <HomeAppearanceThemeSync />
      {children}
    </div>
  );
}
