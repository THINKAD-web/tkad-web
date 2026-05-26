"use client";

/**
 * Desktop global header — 4-category nav (발견하기 · 기획하기 · 인사이트 & 교육 · 스튜디오).
 */

import { DesktopGlobalNav } from "@/components/navigation/desktop-global-nav";

type Props = {
  contentStatus?: unknown;
};

export function HeaderBrutal(_props: Props) {
  return <DesktopGlobalNav />;
}
