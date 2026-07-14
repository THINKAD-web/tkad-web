"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResolvedPublicNavGroup } from "@/lib/navigation/build-public-nav";
import { findActiveNavGroupId } from "@/lib/navigation/build-public-nav";
import { isPublicNavItemActive } from "@/lib/navigation/public-nav-active";
import type { PublicNavItemId } from "@/lib/navigation/public-nav-data";
import { NavBetaBadge } from "@/components/navigation/nav-beta-badge";

type Props = {
  groups: ResolvedPublicNavGroup[];
  onNavigate?: () => void;
  initialOpenId?: string | null;
  className?: string;
  /** @deprecated mobile-only component; kept for call-site compat */
  density?: "default" | "comfortable";
};

/** 이름만으로 의미가 모호한 항목 — 모바일에서만 한 줄 설명 유지 */
const MOBILE_DESC_ITEM_IDS = new Set([
  "media-network",
  "campaign-targets",
  "integrated-planner",
  "competitive-intel",
]);

export function PublicNavSidebar({
  groups,
  onNavigate,
  initialOpenId = null,
  className,
}: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const contactActive =
    pathname === "/contact" || pathname.startsWith("/contact/");
  const activeGroupId = useMemo(
    () => findActiveNavGroupId(pathname, groups, searchParams),
    [pathname, groups, searchParams],
  );

  const [openId, setOpenId] = useState<string | null>(
    initialOpenId ?? activeGroupId ?? groups[0]?.id ?? null,
  );

  useEffect(() => {
    if (initialOpenId) setOpenId(initialOpenId);
  }, [initialOpenId]);

  useEffect(() => {
    if (activeGroupId) setOpenId(activeGroupId);
  }, [activeGroupId]);

  const toggle = (id: string) => {
    setOpenId((cur) => (cur === id ? null : id));
  };

  return (
    <nav
      className={cn(
        "flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-white",
        className,
      )}
      aria-label="Main navigation"
    >
      <div className="border-b border-gray-200/80 px-5 py-3 dark:border-white/10">
        <Link
          href="/contact"
          onClick={onNavigate}
          className={cn(
            "flex min-h-12 items-center gap-3 transition-colors",
            contactActive
              ? "text-violet-600 dark:text-violet-400"
              : "text-gray-900 hover:text-gray-950 dark:text-white dark:hover:text-white",
          )}
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              contactActive
                ? "bg-violet-600 text-white dark:bg-violet-500"
                : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70",
            )}
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-xl font-semibold leading-snug tracking-tight">
            {t("contact")}
          </span>
        </Link>
      </div>
      <ul className="flex flex-col divide-y divide-gray-200/80 dark:divide-white/10">
        {groups.map((group) => {
          const Icon = group.icon;
          const expanded = openId === group.id;
          const groupActive =
            activeGroupId === group.id ||
            group.items.some((item) =>
              isPublicNavItemActive(pathname, item.id as PublicNavItemId, searchParams),
            );

          return (
            <li key={group.id}>
              <button
                type="button"
                id={`nav-group-${group.id}`}
                aria-expanded={expanded}
                aria-controls={`nav-panel-${group.id}`}
                onClick={() => toggle(group.id)}
                className={cn(
                  "flex w-full min-h-12 items-center gap-3 px-5 py-3 text-left transition-colors",
                  groupActive
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-gray-900 dark:text-white",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 opacity-60",
                    groupActive && "text-violet-600 opacity-100 dark:text-violet-400",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-2xl font-bold leading-tight tracking-tight">
                    {group.label}
                  </span>
                  <span className="mt-0.5 block font-display text-[11px] font-medium lowercase tracking-[0.22em] text-gray-400 dark:text-white/35">
                    {group.labelEn}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-gray-400 transition-transform dark:text-white/40",
                    expanded && "rotate-180",
                    groupActive && "text-violet-500 dark:text-violet-400",
                  )}
                  aria-hidden
                />
              </button>

              <div
                id={`nav-panel-${group.id}`}
                role="region"
                aria-labelledby={`nav-group-${group.id}`}
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <ul className="overflow-hidden">
                  <div className="space-y-0 pb-2 pl-8 pr-4 pt-0.5">
                    {group.items.map((item) => {
                      const active = isPublicNavItemActive(
                        pathname,
                        item.id as PublicNavItemId,
                        searchParams,
                      );
                      const showDesc =
                        item.desc && MOBILE_DESC_ITEM_IDS.has(item.id);
                      return (
                        <li key={item.navKey}>
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                              "flex min-h-12 items-center px-1 py-2.5 transition-colors",
                              active
                                ? "text-violet-600 dark:text-violet-400"
                                : "text-gray-800 hover:text-gray-900 dark:text-white/85 dark:hover:text-white",
                            )}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-xl font-semibold leading-snug tracking-tight">
                                  {item.label}
                                </span>
                                {item.badge ? <NavBetaBadge /> : null}
                              </span>
                              {showDesc ? (
                                <span className="mt-0.5 block text-xs leading-relaxed text-gray-400 dark:text-white/40">
                                  {item.desc}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </div>
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
