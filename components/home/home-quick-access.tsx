"use client";

import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Search, BarChart3, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NEON_ICON_GLOW: Record<string, string> = {
  "text-violet-500": "drop-shadow-[0_0_8px_rgba(139,92,246,0.55)]",
  "text-emerald-500": "drop-shadow-[0_0_8px_rgba(52,211,153,0.55)]",
  "text-rose-500": "drop-shadow-[0_0_8px_rgba(244,63,94,0.45)]",
};

type QuickItem = {
  id: string;
  icon: LucideIcon;
  href: string;
  color: string;
  labelKo: string;
  labelEn: string;
};

/** G-2: 5 → 3. 탐색(매체+지도) · 기획(플래너) · 문의. 빠른 AI 추천은 히어로 입력창 primary. */
const ITEMS: QuickItem[] = [
  {
    id: "discover",
    labelKo: "매체 찾기",
    labelEn: "Find media",
    icon: Search,
    href: "/media",
    color: "text-violet-500",
  },
  {
    id: "plan",
    labelKo: "캠페인 기획",
    labelEn: "Plan campaign",
    icon: BarChart3,
    href: "/planner",
    color: "text-emerald-500",
  },
  {
    id: "contact",
    labelKo: "문의",
    labelEn: "Contact",
    icon: MessageSquare,
    href: "/contact",
    color: "text-rose-500",
  },
];

export function HomeQuickAccess() {
  const locale = useLocale();
  const isKo = locale === "ko";

  return (
    <div className="px-4 py-3 md:py-4">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-3 sm:max-w-lg sm:gap-4 md:max-w-xl">
        {ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex flex-col items-center gap-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm transition-transform group-hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-white/8 sm:h-16 sm:w-16 md:h-[4.25rem] md:w-[4.25rem]">
              <item.icon
                className={`h-6 w-6 sm:h-7 sm:w-7 ${item.color} ${NEON_ICON_GLOW[item.color] ?? ""}`}
              />
            </div>
            <span className="text-center text-xs leading-tight font-medium text-gray-600 dark:text-white/70 sm:text-[13px]">
              {isKo ? item.labelKo : item.labelEn}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
