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
  { key: "quotes", label: "지난 제안서", icon: Receipt },
  { key: "campaigns", label: "진행 캠페인", icon: Activity },
];

export function DashboardTabs({ active, onChange, counts }: Props) {
  return (
    <nav
      role="tablist"
      className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto"
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
            className={`
              flex-1 min-w-fit inline-flex items-center justify-center gap-1.5
              px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${isActive
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-800"
              }
            `}
          >
            <Icon className="w-4 h-4" strokeWidth={2} />
            <span>{label}</span>
            {typeof c === "number" && c > 0 && (
              <span
                className={`ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-primary text-white" : "bg-gray-200 text-gray-700"
                }`}
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
