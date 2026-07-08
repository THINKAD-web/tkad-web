"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  GitMerge,
  MapPin,
  Package,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type PageSubNavItem = {
  id: string;
  href: string;
  labelKo: string;
  labelEn: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
};

type Props = {
  items: PageSubNavItem[];
  locale: string;
  className?: string;
  "data-screenshot"?: string;
};

export function PageSubNav({
  items,
  locale,
  className,
  "data-screenshot": dataScreenshot,
}: Props) {
  const pathname = usePathname();
  const isKo = locale === "ko";

  return (
    <nav
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label={isKo ? "서브 카테고리" : "Sub navigation"}
      data-screenshot={dataScreenshot}
    >
      {items.map((item) => {
        const active = item.match
          ? item.match(pathname ?? "")
          : pathname === item.href ||
            (item.href !== "/" && (pathname ?? "").startsWith(item.href));
        const Icon = item.icon;
        const label = isKo ? item.labelKo : item.labelEn;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "tkad-neon-cta-clean text-white shadow-sm"
                : "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/70",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export const MEDIA_SUB_NAV_ITEMS: PageSubNavItem[] = [
  {
    id: "search",
    href: "/media",
    labelKo: "매체검색",
    labelEn: "Media search",
    icon: Search,
    match: (p) =>
      p === "/media" ||
      (p.startsWith("/media") &&
        !p.startsWith("/media/map") &&
        !p.startsWith("/media/packages")),
  },
  {
    id: "map",
    href: "/media/map",
    labelKo: "지도탐색",
    labelEn: "Map browse",
    icon: MapPin,
  },
  {
    id: "recommend",
    href: "/recommend",
    labelKo: "AI매체추천",
    labelEn: "AI recommend",
    icon: Sparkles,
  },
  {
    id: "packages",
    href: "/media/packages",
    labelKo: "패키지",
    labelEn: "Packages",
    icon: Package,
  },
];

export const PLANNER_SUB_NAV_ITEMS: PageSubNavItem[] = [
  {
    id: "media-planner",
    href: "/planner",
    labelKo: "단계별 플래너",
    labelEn: "Step-by-step planner",
    icon: BarChart3,
    match: (p) => p === "/planner" || (p.startsWith("/planner") && !p.startsWith("/planner/integrated")),
  },
  {
    id: "integrated",
    href: "/planner/integrated",
    labelKo: "통합플래너",
    labelEn: "Integrated planner",
    icon: GitMerge,
  },
  {
    id: "recommend",
    href: "/recommend",
    labelKo: "빠른 AI추천",
    labelEn: "Quick AI recommend",
    icon: Sparkles,
  },
  {
    id: "packages",
    href: "/media/packages",
    labelKo: "패키지",
    labelEn: "Packages",
    icon: Package,
  },
];
