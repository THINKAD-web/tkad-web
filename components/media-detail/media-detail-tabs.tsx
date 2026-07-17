"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { MediaDetailTabId } from "@/components/media-detail/media-detail-page-layout";

type TabDef = {
  id: MediaDetailTabId;
  label: string;
};

type Props = {
  tabs: TabDef[];
  panels: Record<MediaDetailTabId, ReactNode>;
  defaultTab?: MediaDetailTabId;
};

export function MediaDetailTabs({
  tabs,
  panels,
  defaultTab,
}: Props) {
  const [active, setActive] = useState<MediaDetailTabId>(
    defaultTab ?? tabs[0]?.id ?? "execution",
  );

  return (
    <>
      <div
        role="tablist"
        aria-label="Media detail sections"
        className="sticky top-[68px] z-20 -mx-4 mb-6 flex gap-1 overflow-x-auto border-b dark:border-white/10 border-gray-200 dark:bg-[#020202]/90 bg-white/95 px-4 py-2 backdrop-blur sm:top-[72px] lg:static lg:mx-0 lg:mb-8 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm",
              active === tab.id
                ? "bg-[color:var(--qp-accent)]/15 text-[color:var(--qp-accent)] dark:text-white"
                : "dark:text-white/55 text-gray-500 hover:dark:text-white/80 hover:text-gray-800",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="min-h-[24rem]">
        {panels[active]}
      </div>
    </>
  );
}
