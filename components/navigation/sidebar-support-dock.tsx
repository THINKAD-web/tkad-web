"use client";

import { RecentlyViewedFloatingPanel } from "@/components/recently-viewed-floating-panel";

/** 데스크탑 사이드바 — 최근 본 매체만 (상담은 QuickActionBar) */
export function SidebarSupportDock({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="flex shrink-0 flex-col border-t border-gray-200 p-2 dark:border-white/10"
      data-screenshot="sidebar-support-dock"
    >
      <RecentlyViewedFloatingPanel compact={compact} className="px-0 pb-0" />
    </div>
  );
}
