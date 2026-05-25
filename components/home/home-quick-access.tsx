import Link from "next/link";
import {
  Search,
  Map,
  Sparkles,
  Package,
  BarChart3,
  Link2,
  MessageSquare,
  Zap,
} from "lucide-react";

const items = [
  {
    label: "매체검색",
    icon: Search,
    href: "/ko/media",
    color: "text-violet-500",
  },
  {
    label: "지도탐색",
    icon: Map,
    href: "/ko/media/map",
    color: "text-cyan-500",
  },
  {
    label: "AI추천",
    icon: Sparkles,
    href: "/ko/recommend",
    color: "text-pink-500",
  },
  {
    label: "패키지",
    icon: Package,
    href: "/ko/media/packages",
    color: "text-amber-500",
  },
  {
    label: "플래너",
    icon: BarChart3,
    href: "/ko/planner",
    color: "text-emerald-500",
  },
  {
    label: "통합플래너",
    icon: Link2,
    href: "/ko/planner/integrated",
    color: "text-blue-500",
  },
  {
    label: "견적문의",
    icon: MessageSquare,
    href: "/ko/contact",
    color: "text-rose-500",
  },
  {
    label: "즉시예약",
    icon: Zap,
    href: "/ko/media?instant=1",
    color: "text-orange-500",
  },
];

export function HomeQuickAccess() {
  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col items-center gap-1.5"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm transition-transform group-hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-white/8">
              <item.icon className={`h-6 w-6 ${item.color}`} />
            </div>
            <span className="text-center text-xs leading-tight font-medium text-gray-600 dark:text-white/70">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
