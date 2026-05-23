"use client";

import { Star, Receipt, Activity } from "lucide-react";

export type Tab = "favorites" | "quotes" | "campaigns";

type Props = {
  active: Tab;
  onChange: (t: Tab) => void;
  counts?: Partial<Record<Tab, number>>;
};

const tabs: { key: Tab; label: string; icon: typeof Star }[] = [
  { key: "favorites", label: "관심 매체", icon: Star },
  { key: "quotes", label: "지난 견적서", icon: Receipt },
  { key: "campaigns", label: "진행 캠페인", icon: Activity },
];

export function DashboardTabs({ active, onChange, counts }: Props) {
  return (
    <nav
      role="tablist"
      className="mb-6 flex gap-0 overflow-x-auto"
    >
      {tabs.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        const c = counts?.[key];
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={`-ml-[2px] inline-flex min-w-fit flex-1 items-center justify-center gap-2 border-2 px-4 py-2.5 font-display text-xs font-medium uppercase tracking-[0.18em] transition-colors ${isActive ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card text-foreground hover:bg-muted" }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            <span>{label}</span>
            {typeof c === "number" && c > 0 && (
              <span
                className={`ml-0.5 inline-flex h-5 min-w-[20px] items-center justify-center border-2 px-1 text-[10px] font-bold tabular-nums ${ isActive ? "border-hero-fg bg-hero-void text-hero-fg" : "border-border bg-hero-void text-accent" }`}
              >
                {c}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
