"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResolvedPublicNavGroup } from "@/lib/navigation/build-public-nav";
import { findActiveNavGroupId } from "@/lib/navigation/build-public-nav";
import { NavBetaBadge } from "@/components/navigation/nav-beta-badge";

type Props = {
  groups: ResolvedPublicNavGroup[];
  onNavigate?: () => void;
  initialOpenId?: string | null;
  className?: string;
  density?: "default" | "comfortable";
};

function navPath(href: string): string {
  return href.split("#")[0]?.split("?")[0] ?? href;
}

function isItemActive(pathname: string, href: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  const base = navPath(href);
  return path === base || (base !== "/" && path.startsWith(`${base}/`));
}

export function PublicNavSidebar({
  groups,
  onNavigate,
  initialOpenId = null,
  className,
  density = "default",
}: Props) {
  const comfortable = density === "comfortable";
  const pathname = usePathname() ?? "";
  const activeGroupId = useMemo(
    () => findActiveNavGroupId(pathname, groups),
    [pathname, groups],
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
      className={cn("flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-white", className)}
      aria-label="Main navigation"
    >
      <ul
        className={cn(
          "flex flex-col gap-0.5",
          comfortable ? "p-1.5" : "p-1.5 sm:p-2",
        )}
      >
        {groups.map((group) => {
          const Icon = group.icon;
          const expanded = openId === group.id;
          const groupActive =
            activeGroupId === group.id ||
            group.items.some((item) => isItemActive(pathname, item.href));

          return (
            <li key={group.id} className="rounded-lg">
              <button
                type="button"
                id={`nav-group-${group.id}`}
                aria-expanded={expanded}
                aria-controls={`nav-panel-${group.id}`}
                onClick={() => toggle(group.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors md:gap-2.5 md:py-2",
                  "hover:bg-gray-100 dark:hover:bg-white/8",
                  groupActive && "bg-cyan-400/8 dark:bg-white/10",
                  expanded && !groupActive && "bg-gray-50 dark:bg-white/5",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors md:h-8 md:w-8",
                    groupActive
                      ? "border-cyan-400/35 bg-cyan-400/10 tkad-home-accent-text dark:border-cyan-400/35"
                      : "border-gray-200 bg-gray-50 text-gray-600 dark:border-white/12 dark:bg-white/5 dark:text-white/70",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium tracking-tight text-gray-900 dark:text-white">
                    {group.label}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-white/30">
                    {group.labelEn}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform md:h-4 md:w-4 dark:text-white/50",
                    expanded && "rotate-180",
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
                  <div className="space-y-0.5 py-0.5 pl-2 pr-0.5">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isItemActive(pathname, item.href);
                      return (
                        <li key={item.navKey}>
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                              "group/item flex items-start gap-2 rounded-md px-2.5 py-1 transition-colors md:py-1.5",
                              active
                                ? "bg-cyan-400/10 text-gray-900 dark:bg-white/10 dark:text-white"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/6 dark:hover:text-white",
                            )}
                          >
                            <ItemIcon
                              className={cn(
                                "mt-0.5 h-3.5 w-3.5 shrink-0 md:h-4 md:w-4",
                                active
                                  ? "text-cyan-600 dark:text-cyan-300"
                                  : "text-gray-600 group-hover/item:text-gray-900 dark:text-white/60 dark:group-hover/item:text-white",
                              )}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-semibold leading-snug">
                                  {item.label}
                                </span>
                                {item.badge ? <NavBetaBadge /> : null}
                              </span>
                              {item.desc ? (
                                <span className="mt-0.5 block text-[10px] leading-relaxed text-gray-400 md:text-[11px] dark:text-white/40">
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
