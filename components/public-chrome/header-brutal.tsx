"use client";

/**
 * Desktop global header — simplified top nav (매체 · 플래너 · 패키지 · 더보기).
 */

import { DesktopGlobalNav } from "@/components/navigation/desktop-global-nav";

type Props = {
  contentStatus?: unknown;
};

export function HeaderBrutal(_props: Props) {
  return <DesktopGlobalNav />;
}
