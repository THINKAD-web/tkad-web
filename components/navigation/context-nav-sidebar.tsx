"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resolveContextSidebar,
  type ContextSidebarItem,
} from "@/lib/navigation/context-sidebar-config";
import { QuickActionBarDesktop } from "@/components/navigation/quick-action-bar";
import {
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "@/lib/navigation/nav-sidebar-prefs";
import { useCartCompareMax } from "@/hooks/use-cart-compare-max";
import {
  getCompareCartEntries,
  subscribeCompareCart,
} from "@/lib/compare-cart-client";

type Props = {
  collapsed: boolean;
  hoverExpanded: boolean;
};

function SidebarLink({
  item,
  pathname,
  isKo,
  compact,
}: {
  item: ContextSidebarItem;
  pathname: string;
  isKo: boolean;
  compact: boolean;
}) {
  const active = item.activeMatch
    ? item.activeMatch(pathname)
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const label = isKo ? item.labelKo : item.labelEn;

  return (
    <Link
      href={item.href}
      title={compact ? label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-cyan-400/10 font-semibold dark:bg-white/8"
          : "text-gray-600 hover:bg-gray-100 dark:text-white/70 dark:hover:bg-white/5",
        compact && "justify-center px-2 py-2.5",
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            active
              ? "text-cyan-600 dark:text-cyan-300"
              : "text-gray-500 dark:text-white/55",
          )}
          aria-hidden
        />
      ) : null}
      {!compact ? (
        <>
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              active && "tkad-home-accent-text font-semibold",
            )}
          >
            {label}
          </span>
          {item.badge != null && Number(item.badge) > 0 ? (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {item.badge}
            </span>
          ) : null}
        </>
      ) : null}
    </Link>
  );
}

export function ContextNavSidebar({ collapsed, hoverExpanded }: Props) {
  const pathname = usePathname() ?? "/";
  const locale = useLocale();
  const isKo = locale === "ko";
  const compact = collapsed && !hoverExpanded;

  const [compareCount, setCompareCount] = useState(0);
  const [savedPlansCount, setSavedPlansCount] = useState<number | null>(null);

  const { maxItems: compareMax } = useCartCompareMax();

  useEffect(() => {
    const sync = () =>
      setCompareCount(getCompareCartEntries(compareMax).length);
    sync();
    return subscribeCompareCart(sync);
  }, [compareMax]);

  useEffect(() => {
    fetch("/api/my/planner-plans", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.data?.items)) {
          setSavedPlansCount(d.data.items.length);
        } else {
          setSavedPlansCount(null);
        }
      })
      .catch(() => setSavedPlansCount(null));
  }, [pathname]);

  const config = resolveContextSidebar(pathname);
  const sections = config.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.id === "compare" && compareCount > 0) {
        return { ...item, badge: compareCount };
      }
      if (item.id === "saved" && savedPlansCount != null && savedPlansCount > 0) {
        return { ...item, labelKo: `저장한 플랜 (${savedPlansCount})`, labelEn: `Saved plans (${savedPlansCount})` };
      }
      return item;
    }),
  }));

  return (
    <nav
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-3"
      aria-label={isKo ? "페이지 메뉴" : "Page menu"}
    >
      {!compact ? (
        <p className="px-4 pb-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-white/40">
          {isKo ? config.titleKo : config.titleEn}
        </p>
      ) : null}

      {sections.map((section) => (
        <div key={section.id} className="px-2 pb-2">
          {section.titleKo && !compact ? (
            <>
              <div className="my-2 border-t border-gray-200 dark:border-white/10" />
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/40">
                {isKo ? section.titleKo : section.titleEn}
              </p>
            </>
          ) : null}
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.id}>
                <SidebarLink
                  item={item}
                  pathname={pathname}
                  isKo={isKo}
                  compact={compact}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function ContextNavAsideShell({ className }: { className?: string }) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [collapsed, setCollapsed] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(readSidebarCollapsed());
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      writeSidebarCollapsed(next);
      return next;
    });
  };

  if (!mounted) return null;

  const compact = collapsed && !hoverExpanded;

  return (
    <aside
      className={cn(
        "tkad-context-nav-aside hidden md:flex md:shrink-0 md:flex-col",
        "sticky top-14 z-30 h-[calc(100dvh-3.5rem)] border-r border-gray-200 bg-background dark:border-white/10 dark:bg-[#05050a]",
        collapsed && !hoverExpanded ? "md:w-16" : "md:w-60",
        "transition-[width] duration-200 ease-out",
        className,
      )}
      onMouseEnter={() => collapsed && setHoverExpanded(true)}
      onMouseLeave={() => setHoverExpanded(false)}
      aria-label={isKo ? "컨텍스트 메뉴" : "Context menu"}
    >
      <ContextNavSidebar collapsed={collapsed} hoverExpanded={hoverExpanded} />

      <Suspense fallback={null}>
        <QuickActionBarDesktop compact={compact} />
      </Suspense>

      <div className="mt-auto shrink-0 border-t border-gray-200 p-2 dark:border-white/10">
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/5"
          aria-label={collapsed ? (isKo ? "사이드바 펼치기" : "Expand sidebar") : (isKo ? "사이드바 접기" : "Collapse sidebar")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>{isKo ? "접기" : "Collapse"}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
