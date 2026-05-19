"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type MyHubTab = "campaigns" | "favorites" | "planner" | "recent" | "team";

type TabDef = {
  key: MyHubTab;
  label: string;
  icon: LucideIcon;
};

type Props = {
  tabs: TabDef[];
  active: MyHubTab;
  onChange: (tab: MyHubTab) => void;
  counts?: Partial<Record<MyHubTab, number>>;
};

export function MyHubTabs({ tabs, active, onChange, counts }: Props) {
  return (
    <nav
      role="tablist"
      className="mb-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        const count = counts?.[key];
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
              isActive
                ? "border-white/25 bg-white/12 text-white shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
                : "border-white/10 bg-white/5 text-white/65 hover:border-white/18 hover:text-white/90",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2} />
            <span>{label}</span>
            {typeof count === "number" && count > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-violet-500/90 to-cyan-400/90 px-1.5 text-[10px] font-bold text-white tabular-nums">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
