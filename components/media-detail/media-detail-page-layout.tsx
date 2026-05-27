"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MediaDetailTabId =
  | "location"
  | "traffic"
  | "calendar"
  | "execution";

type TabDef = {
  id: MediaDetailTabId;
  label: string;
};

type Props = {
  tabs: TabDef[];
  panels: Record<MediaDetailTabId, ReactNode>;
  sidebar?: ReactNode;
  similarSection?: ReactNode;
  belowFold?: ReactNode;
  className?: string;
};

export function MediaDetailPageLayout({
  tabs,
  panels,
  sidebar,
  similarSection,
  belowFold,
  className,
}: Props) {
  const [active, setActive] = useState<MediaDetailTabId>(tabs[0]?.id ?? "location");

  return (
    <div className={cn("pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-16", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
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
                      ? "bg-gradient-to-r from-violet-500/20 to-cyan-400/20 text-violet-700 dark:text-white"
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

            {similarSection ? (
              <div className="mt-10 border-t dark:border-white/10 border-gray-200 pt-10">
                {similarSection}
              </div>
            ) : null}

            {belowFold ? (
              <div className="mt-10 space-y-10 border-t dark:border-white/10 border-gray-200 pt-10">
                {belowFold}
              </div>
            ) : null}
          </div>

          {sidebar ? <div className="hidden lg:block">{sidebar}</div> : null}
        </div>
      </div>
    </div>
  );
}
