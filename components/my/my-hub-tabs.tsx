"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type MyHubTab = "campaigns" | "favorites" | "planner" | "recent" | "team" | "points";

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
      className="tkad-glass-surface tkad-neon-border mb-8 flex gap-2 overflow-x-auto rounded-[24px] border p-2 backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              "inline-flex shrink-0 items-center gap-2 rounded-[18px] px-4 py-3 font-display text-xs font-medium uppercase tracking-[0.14em] transition-all sm:px-5 sm:text-xs",
              isActive
                ? "bg-primary/20 text-primary shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_8px_32px_rgba(34,211,238,0.12)]"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
            <span>{label}</span>
            {typeof count === "number" && count > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-primary-foreground tabular-nums">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
