"use client";

import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Search, BarChart3, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

/** G-2: 3 shortcuts — 유형별(매체) · 기획(플래너) · 문의. */
const ITEMS: QuickItem[] = [
  {
    id: "discover",
    labelKo: "유형별 보기",
    labelEn: "By type",
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

type Props = {
  /** 홈 탐색 카드 안 — 작은 아이콘·여백 */
  compact?: boolean;
  /** 외곽 px/py 생략 (부모 카드가 패딩 담당) */
  embedded?: boolean;
};

export function HomeQuickAccess({ compact = false, embedded = false }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";

  const iconBox = compact
    ? "h-11 w-11 sm:h-12 sm:w-12"
    : "h-14 w-14 sm:h-16 sm:w-16 md:h-[4.25rem] md:w-[4.25rem]";
  const iconSize = compact ? "h-5 w-5 sm:h-5 sm:w-5" : "h-6 w-6 sm:h-7 sm:w-7";
  const tonedDown = compact && embedded;

  return (
    <div
      className={cn(
        !embedded && "px-4 py-3 md:py-4",
        embedded && "mt-4",
      )}
    >
      <div
        className={cn(
          "grid grid-cols-3 gap-2 sm:gap-3",
          !embedded && "mx-auto max-w-md sm:max-w-lg md:max-w-xl",
        )}
      >
        {ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex flex-col items-center gap-1.5"
          >
            <div
              className={cn(
                "flex items-center justify-center rounded-2xl border bg-white shadow-sm dark:bg-white/8",
                tonedDown
                  ? "border-gray-100/80 transition-colors group-hover:bg-gray-50 dark:border-white/8 dark:group-hover:bg-white/10"
                  : "border-gray-100 transition-transform group-hover:scale-105 active:scale-95 dark:border-white/10",
                iconBox,
              )}
            >
              <item.icon
                className={cn(
                  iconSize,
                  item.color,
                  !tonedDown && (NEON_ICON_GLOW[item.color] ?? ""),
                  tonedDown && "opacity-80",
                )}
              />
            </div>
            <span
              className={cn(
                "text-center font-medium leading-tight",
                tonedDown
                  ? "text-gray-500 dark:text-white/55"
                  : "text-gray-600 dark:text-white/70",
                compact ? "text-[11px] sm:text-xs" : "text-xs sm:text-[13px]",
              )}
            >
              {isKo ? item.labelKo : item.labelEn}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
