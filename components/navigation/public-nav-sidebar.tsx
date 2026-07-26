"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown, ExternalLink, MessageSquare, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResolvedPublicNavGroup } from "@/lib/navigation/build-public-nav";
import { findActiveNavGroupId } from "@/lib/navigation/build-public-nav";
import { isPublicNavItemActive } from "@/lib/navigation/public-nav-active";
import type { PublicNavItemId } from "@/lib/navigation/public-nav-data";
import {
  MOBILE_DEMOTED_NAV_GROUP_IDS,
  MOBILE_PRIMARY_NAV_GROUP_IDS,
} from "@/lib/navigation/public-nav-data";
import { THINKAD_DIGITAL_URL } from "@/lib/navigation/cross-brand";
import { NavBetaBadge } from "@/components/navigation/nav-beta-badge";

function defaultMobileOpenIds(activeGroupId: string | null): Set<string> {
  const ids = new Set<string>(MOBILE_PRIMARY_NAV_GROUP_IDS);
  if (
    activeGroupId &&
    (MOBILE_DEMOTED_NAV_GROUP_IDS as readonly string[]).includes(activeGroupId)
  ) {
    ids.add(activeGroupId);
  }
  return ids;
}

type Props = {
  groups: ResolvedPublicNavGroup[];
  onNavigate?: () => void;
  initialOpenId?: string | null;
  className?: string;
  /**
   * `panel` — Digital site-header panel typography/spacing (standard).
   * `default` / `comfortable` — legacy denser mobile drawer look.
   */
  density?: "default" | "comfortable" | "panel";
};

/** 이름만으로 의미가 모호한 항목 — 모바일에서만 한 줄 설명 유지 */
const MOBILE_DESC_ITEM_IDS = new Set([
  "campaign-targets",
  "integrated-planner",
  "package-proposal",
  "ai-recommend",
  "competitive-intel",
]);

export function PublicNavSidebar({
  groups,
  onNavigate,
  initialOpenId = null,
  className,
  density = "default",
}: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const isPanel = density === "panel";
  const contactActive =
    pathname === "/contact" || pathname.startsWith("/contact/");
  const activeGroupId = useMemo(
    () => findActiveNavGroupId(pathname, groups, searchParams),
    [pathname, groups, searchParams],
  );

  const [openIds, setOpenIds] = useState<Set<string>>(() =>
    defaultMobileOpenIds(activeGroupId),
  );

  useEffect(() => {
    if (initialOpenId) {
      setOpenIds((cur) => new Set([...cur, initialOpenId]));
    }
  }, [initialOpenId]);

  useEffect(() => {
    if (!activeGroupId) return;
    setOpenIds((cur) => {
      const next = new Set(cur);
      next.add(activeGroupId);
      for (const id of MOBILE_PRIMARY_NAV_GROUP_IDS) next.add(id);
      return next;
    });
  }, [activeGroupId]);

  const toggle = (id: string) => {
    setOpenIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <nav
      className={cn(
        "flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-white",
        isPanel && "tkad-site-header-panel-nav",
        className,
      )}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          "space-y-1 border-b border-gray-200/80 dark:border-white/10",
          isPanel ? "px-1 pb-3" : "px-5 py-3",
        )}
      >
        <Link
          href="/contact"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 transition-colors",
            isPanel ? "min-h-11 py-3" : "min-h-12",
            contactActive
              ? "text-[color:var(--qp-accent)]"
              : "text-gray-900 hover:text-gray-950 dark:text-white dark:hover:text-white",
            isPanel && "border-b border-gray-200/80 dark:border-white/10",
          )}
        >
          {!isPanel ? (
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                contactActive
                  ? "bg-[color:var(--qp-accent)] text-white"
                  : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70",
              )}
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <span
            className={cn(
              "font-semibold leading-snug tracking-tight",
              isPanel ? "text-[0.95rem]" : "text-xl",
            )}
          >
            {t("contact")}
          </span>
        </Link>
        <a
          href={THINKAD_DIGITAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 text-gray-900 transition-colors hover:text-gray-950 dark:text-white dark:hover:text-white",
            isPanel
              ? "min-h-11 border-b border-gray-200/80 py-3 dark:border-white/10"
              : "min-h-12",
          )}
          aria-label={t("thinkadDigitalExternal")}
        >
          {!isPanel ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70">
              <MonitorSmartphone className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "flex items-center gap-2 font-semibold leading-snug tracking-tight",
                isPanel ? "text-[0.95rem]" : "text-xl",
              )}
            >
              {t("thinkadDigital")}
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            </span>
            {!isPanel ? (
              <span className="mt-0.5 block text-xs text-gray-400 dark:text-white/40">
                {t("thinkadDigitalDesc")}
              </span>
            ) : null}
          </span>
        </a>
      </div>
      <ul
        className={cn(
          "flex flex-col",
          isPanel ? "gap-1" : "divide-y divide-gray-200/80 dark:divide-white/10",
        )}
      >
        {groups.map((group) => {
          const Icon = group.icon;
          const expanded = openIds.has(group.id);
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
                  "flex w-full items-center gap-3 text-left transition-colors",
                  isPanel ? "min-h-11 px-1 py-3" : "min-h-12 px-5 py-3",
                  groupActive
                    ? "text-[color:var(--qp-accent)]"
                    : "text-gray-900 dark:text-white",
                  isPanel && "border-b border-gray-200/80 dark:border-white/10",
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0 opacity-60",
                    isPanel ? "h-3.5 w-3.5" : "h-4 w-4",
                    groupActive && "text-[color:var(--qp-accent)] opacity-100",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block font-bold leading-tight tracking-tight",
                      isPanel ? "text-[0.95rem] font-semibold" : "text-2xl",
                    )}
                  >
                    {group.label}
                  </span>
                  {!isPanel ? (
                    <span className="mt-0.5 block font-display text-[11px] font-medium lowercase tracking-[0.22em] text-gray-400 dark:text-white/35">
                      {group.labelEn}
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn(
                    "shrink-0 text-gray-400 transition-transform dark:text-white/40",
                    isPanel ? "h-4 w-4" : "h-5 w-5",
                    expanded && "rotate-180",
                    groupActive && "text-[color:var(--qp-accent)]",
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
                  <div
                    className={cn(
                      "space-y-0 pt-0.5",
                      isPanel ? "pb-2 pl-4 pr-1" : "pb-2 pl-8 pr-4",
                    )}
                  >
                    {group.items.map((item, index) => {
                      const active = isPublicNavItemActive(
                        pathname,
                        item.id as PublicNavItemId,
                        searchParams,
                      );
                      const showDesc =
                        !isPanel &&
                        item.desc &&
                        MOBILE_DESC_ITEM_IDS.has(item.id);
                      const showPlanningDivider =
                        group.id === "planning" &&
                        item.id === "ai-recommend" &&
                        index > 0;
                      return (
                        <li key={item.navKey}>
                          {showPlanningDivider ? (
                            <div
                              className="my-1 border-t border-gray-200/80 dark:border-white/10"
                              aria-hidden
                            />
                          ) : null}
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                              "flex items-center px-1 transition-colors",
                              isPanel ? "min-h-10 py-2" : "min-h-12 py-2.5",
                              active
                                ? "text-[color:var(--qp-accent)]"
                                : "text-gray-800 hover:text-gray-900 dark:text-white/85 dark:hover:text-white",
                              item.secondary &&
                                !active &&
                                "text-gray-600 dark:text-white/60",
                              isPanel &&
                                "border-b border-gray-200/60 dark:border-white/8",
                            )}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "leading-snug tracking-tight",
                                    isPanel
                                      ? "text-[0.95rem] font-semibold"
                                      : item.secondary
                                        ? "text-lg font-medium"
                                        : "text-xl font-semibold",
                                  )}
                                >
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
