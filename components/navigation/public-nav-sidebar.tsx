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
  /** 모바일 칩 등에서 특정 그룹을 펼친 채로 열 때 */
  initialOpenId?: string | null;
  className?: string;
  /** 고정 사이드바용 여백 */
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
          "flex flex-col gap-1",
          comfortable ? "p-2" : "p-2 sm:p-3",
        )}
      >
        {groups.map((group) => {
          const Icon = group.icon;
          const expanded = openId === group.id;
          const groupActive =
            activeGroupId === group.id ||
            group.items.some((item) => isItemActive(pathname, item.href));

          return (
            <li key={group.id} className="rounded-xl">
              <button
                type="button"
                id={`nav-group-${group.id}`}
                aria-expanded={expanded}
                aria-controls={`nav-panel-${group.id}`}
                onClick={() => toggle(group.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                  "hover:bg-zinc-200/80 dark:hover:dark:bg-white/8 bg-gray-100",
                  groupActive &&
                    "bg-zinc-200/90 dark:bg-white/10 bg-gray-100",
                  expanded && "bg-zinc-200/70 dark:bg-white/8 bg-gray-100",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                    groupActive
                      ? "border-violet-500/40 bg-gradient-to-br from-violet-500/20 to-cyan-400/15 text-violet-700 dark:border-violet-400/35 dark:text-violet-200"
                      : "border-zinc-300/90 bg-white text-zinc-700 dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 dark:text-white text-gray-800",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold tracking-tight text-zinc-900 dark:text-white text-gray-900">
                    {group.label}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-white">
                    {group.labelEn}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-zinc-500 transition-transform dark:text-white text-gray-400",
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
                  <div className="space-y-0.5 py-1 pl-3 pr-1">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isItemActive(pathname, item.href);
                      return (
                        <li key={item.navKey}>
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                              "group/item flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition-colors",
                              active
                                ? "bg-violet-500/12 text-violet-900 ring-1 ring-violet-500/25 dark:bg-violet-500/18 dark:text-white text-gray-900 dark:ring-violet-400/30"
                                : "text-zinc-800 hover:bg-zinc-100 dark:text-white text-gray-800 dark:hover:dark:bg-white/8 bg-gray-100",
                            )}
                          >
                            <ItemIcon
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                active
                                  ? "text-violet-600 dark:text-cyan-300"
                                  : "text-zinc-500 group-hover/item:text-zinc-700 dark:text-white text-gray-400 dark:group-hover/item:dark:text-white text-gray-700",
                              )}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[13px] font-semibold leading-snug">
                                  {item.label}
                                </span>
                                {item.badge ? <NavBetaBadge /> : null}
                              </span>
                              {item.desc ? (
                                <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-600 dark:text-white text-gray-400">
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
