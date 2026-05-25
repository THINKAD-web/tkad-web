import { Link } from "@/i18n/navigation";
import {
  BarChart3,
  Link2,
  Map,
  MessageSquare,
  Package,
  Search,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type QuickItem = {
  href: string;
  labelKo: string;
  labelEn: string;
  icon: LucideIcon;
};

const MEDIA_ITEMS: QuickItem[] = [
  { href: "/media", labelKo: "매체검색", labelEn: "Search", icon: Search },
  { href: "/media/map", labelKo: "지도탐색", labelEn: "Map", icon: Map },
  { href: "/recommend", labelKo: "AI추천", labelEn: "AI pick", icon: Sparkles },
  { href: "/media/packages", labelKo: "패키지", labelEn: "Packages", icon: Package },
];

const PLANNER_ITEMS: QuickItem[] = [
  { href: "/planner", labelKo: "플래너", labelEn: "Planner", icon: BarChart3 },
  {
    href: "/planner/integrated",
    labelKo: "통합플래너",
    labelEn: "Integrated",
    icon: Link2,
  },
  { href: "/contact", labelKo: "견적문의", labelEn: "Quote", icon: MessageSquare },
  {
    href: "/media?instant=1",
    labelKo: "즉시예약",
    labelEn: "Instant",
    icon: Zap,
  },
];

function QuickButton({ item, isKo }: { item: QuickItem; isKo: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="flex flex-col items-center gap-1.5 active:scale-95"
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl",
          "bg-gray-100 transition-all hover:bg-gray-200",
          "dark:bg-white/8 dark:hover:bg-white/15",
        )}
      >
        <Icon className="h-6 w-6 text-violet-600 dark:text-violet-400" aria-hidden />
      </div>
      <span className="text-center text-xs font-medium text-gray-600 dark:text-white/70">
        {isKo ? item.labelKo : item.labelEn}
      </span>
    </Link>
  );
}

type Props = { locale: string };

export function HomeQuickAccess({ locale }: Props) {
  const isKo = locale.startsWith("ko");
  const allItems = [...MEDIA_ITEMS, ...PLANNER_ITEMS];

  return (
    <section
      className="border-b border-gray-100 py-6 dark:border-white/5"
      data-screenshot="home-quick-access"
    >
      <div
        className={cn(
          "grid grid-cols-4 gap-4 md:grid-cols-8 md:gap-3",
        )}
      >
        {allItems.map((item) => (
          <QuickButton key={item.href} item={item} isKo={isKo} />
        ))}
      </div>
    </section>
  );
}
