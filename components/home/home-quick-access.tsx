"use client";

import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import {
  Search,
  Map,
  Sparkles,
  BarChart3,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NEON_ICON_GLOW: Record<string, string> = {
  "text-violet-500": "drop-shadow-[0_0_8px_rgba(139,92,246,0.55)]",
  "text-cyan-500": "drop-shadow-[0_0_8px_rgba(34,211,238,0.55)]",
};

type QuickItem = {
  id: string;
  icon: LucideIcon;
  href: string;
  color: string;
  labelKo: string;
  labelEn: string;
};

/** G-1: 8 → 5. 즉시예약→매체검색, 통합플래너→플래너, 패키지·견적문의 정리 */
const ITEMS: QuickItem[] = [
  {
    id: "media",
    labelKo: "매체검색",
    labelEn: "Media",
    icon: Search,
    href: "/media",
    color: "text-violet-500",
  },
  {
    id: "map",
    labelKo: "지도탐색",
    labelEn: "Map",
    icon: Map,
    href: "/media/map",
    color: "text-cyan-500",
  },
  {
    id: "planner",
    labelKo: "플래너",
    labelEn: "Planner",
    icon: BarChart3,
    href: "/planner",
    color: "text-emerald-500",
  },
  {
    id: "recommend",
    labelKo: "AI추천",
    labelEn: "AI picks",
    icon: Sparkles,
    href: "/recommend",
    color: "text-pink-500",
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
      <div className="grid grid-cols-5 gap-2 md:max-w-2xl md:mx-auto">
        {ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex flex-col items-center gap-1.5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm transition-transform group-hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-white/8 md:h-14 md:w-14">
              <item.icon
                className={`h-5 w-5 md:h-6 md:w-6 ${item.color} ${NEON_ICON_GLOW[item.color] ?? ""}`}
              />
            </div>
            <span className="text-center text-[11px] leading-tight font-medium text-gray-600 dark:text-white/70 md:text-xs">
              {isKo ? item.labelKo : item.labelEn}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
