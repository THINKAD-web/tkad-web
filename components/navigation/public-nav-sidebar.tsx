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

function isItemActive(pathname: string, href: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return path === href || (href !== "/" && path.startsWith(`${href}/`));
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
      className={cn("flex flex-col", className)}
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
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  "hover:bg-gray-100 dark:hover:bg-white/8",
                  groupActive && "bg-gray-100 dark:bg-white/10",
                  expanded && "bg-gray-50 dark:bg-white/6",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                    groupActive
                      ? "border-violet-500/35 bg-gradient-to-br from-violet-500/15 to-cyan-400/10 text-violet-700 dark:border-violet-400/35 dark:text-violet-200"
                      : "border-gray-200 bg-white text-gray-600 dark:border-white/12 dark:bg-white/5 dark:text-white/60",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
                    {group.label}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-white/40">
                    {group.labelEn}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-gray-500 transition-transform dark:text-white/50",
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
                              "group/item flex items-start gap-2 rounded-md px-2.5 py-1.5 transition-colors",
                              active
                                ? "bg-gray-100 text-gray-900 ring-1 ring-violet-500/20 dark:bg-white/10 dark:text-white dark:ring-violet-400/25"
                                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-white/70 dark:hover:bg-white/6 dark:hover:text-white",
                            )}
                          >
                            <ItemIcon
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                active
                                  ? "text-violet-600 dark:text-cyan-300"
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
                                <span className="mt-0.5 block text-[11px] leading-relaxed text-gray-500 dark:text-white/45">
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
