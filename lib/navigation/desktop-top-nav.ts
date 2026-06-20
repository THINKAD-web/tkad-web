import type { LucideIcon } from "lucide-react";
import { Lightbulb, Package, Search, Sparkles, Trophy } from "lucide-react";

export type TopNavLink = {
  id: string;
  labelKo: string;
  labelEn: string;
  href: string;
  descKo?: string;
  descEn?: string;
  icon?: LucideIcon;
};

/** Cmd+K command palette quick navigation */
export const COMMAND_QUICK_LINKS: TopNavLink[] = [
  {
    id: "cmd-media",
    labelKo: "매체 검색",
    labelEn: "Browse media",
    href: "/media",
    icon: Search,
  },
  {
    id: "cmd-planner",
    labelKo: "내 플래너",
    labelEn: "My planner",
    href: "/planner",
    icon: Lightbulb,
  },
  {
    id: "cmd-points",
    labelKo: "포인트 샵",
    labelEn: "Points shop",
    href: "/points",
    icon: Sparkles,
  },
  {
    id: "cmd-packages",
    labelKo: "패키지",
    labelEn: "Packages",
    href: "/packages",
    icon: Package,
  },
  {
    id: "cmd-contact",
    labelKo: "견적 요청",
    labelEn: "Request quote",
    href: "/contact",
    icon: Trophy,
  },
];
