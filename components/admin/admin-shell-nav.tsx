"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown, type LucideIcon } from "lucide-react";
import {
  ADMIN_NAV_PRIORITY_1,
  ADMIN_NAV_PRIORITY_2,
  ADMIN_NAV_PRIORITY_2_EXTRAS,
  adminNavGroupDefs,
  filterAdminNavGroupItems,
  type AdminNavExtraDef,
  type AdminNavGroupId,
  type AdminNavKey,
} from "@/lib/admin-nav-config";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  key: AdminNavKey | AdminNavExtraDef["key"];
  label: string;
  icon: LucideIcon;
  description?: string;
};

type Props = {
  locale: string;
  isActive: (href: string) => boolean;
  navItemByKey: Map<AdminNavKey, NavItem>;
  tNav: (key: string) => string;
  onNavigate: () => void;
};

function navHref(locale: string, href: string) {
  return `/${locale}${href}`;
}

function PrimaryNavCard({
  item,
  locale,
  active,
  onNavigate,
}: {
  item: NavItem;
  locale: string;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={navHref(locale, item.href)}
      onClick={onNavigate}
      className={cn(
        "group flex min-h-[4rem] items-start gap-3 rounded-2xl border px-3 py-3 transition-all active:scale-[0.99]",
        active
          ? "border-[color:var(--qp-accent)]/45 bg-[color:var(--qp-accent-soft)] dark:bg-[color:var(--qp-accent)]/15"
          : "border-border/70 bg-card/80 hover:border-[color:var(--qp-accent)]/30 hover:bg-[color:var(--qp-accent-soft)] dark:bg-white/[0.04] dark:hover:border-[color:var(--qp-accent)]/30 dark:hover:bg-[color:var(--qp-accent)]/10",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--qp-radius-md)] transition-colors",
          active
            ? "bg-[color:var(--qp-accent)] text-white"
            : "bg-[color:var(--qp-accent-soft)] text-[color:var(--qp-accent)]",
        )}
      >
        <Icon className="h-[17px] w-[17px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span
          className={cn(
            "block text-[14px] font-bold leading-tight tracking-tight",
            active
              ? "text-[color:var(--qp-ink)] dark:text-white"
              : "text-foreground",
          )}
        >
          {item.label}
        </span>
        {item.description ? (
          <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
            {item.description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function SecondaryLink({
  item,
  locale,
  active,
  onNavigate,
}: {
  item: NavItem;
  locale: string;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={navHref(locale, item.href)}
      onClick={onNavigate}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
        active
          ? "border-[color:var(--qp-accent)]/40 bg-[color:var(--qp-accent-soft)] text-[color:var(--qp-ink)] dark:bg-[color:var(--qp-accent)]/15 dark:text-white"
          : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function GroupSection({
  groupId,
  label,
  items,
  locale,
  isActive,
  onNavigate,
  defaultCollapsed,
}: {
  groupId: AdminNavGroupId;
  label: string;
  items: NavItem[];
  locale: string;
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  defaultCollapsed: boolean;
}) {
  const groupActive = items.some((item) => isActive(item.href));
  const [open, setOpen] = useState(!defaultCollapsed || groupActive);

  useEffect(() => {
    if (groupActive) setOpen(true);
  }, [groupActive]);

  if (items.length === 0) return null;

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md py-1.5 pl-2 pr-1 text-left"
        aria-expanded={open}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open ? "rotate-0" : "-rotate-90",
            groupActive && "text-violet-500 dark:text-violet-400",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className="mt-1 space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={`${groupId}-${item.href}`}>
                <Link
                  href={navHref(locale, item.href)}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-r-md py-2 pl-2.5 pr-2 text-[13px] font-medium transition-colors",
                    active
                      ? "border-l-2 border-violet-500 bg-violet-50 text-violet-700 dark:bg-white/10 dark:text-white"
                      : "border-l-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active
                        ? "text-violet-600 dark:text-white/90"
                        : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function AdminShellNav({
  locale,
  isActive,
  navItemByKey,
  tNav,
  onNavigate,
}: Props) {
  const uiLocale = useLocale();
  const isKo = uiLocale === "ko";

  const primaryItems = useMemo(
    () =>
      ADMIN_NAV_PRIORITY_1.map((key) => navItemByKey.get(key)).filter(
        (n): n is NavItem => Boolean(n),
      ),
    [navItemByKey],
  );

  const secondaryItems = useMemo(() => {
    const fromKeys = ADMIN_NAV_PRIORITY_2.map((key) =>
      navItemByKey.get(key),
    ).filter((n): n is NavItem => Boolean(n));
    const extras: NavItem[] = ADMIN_NAV_PRIORITY_2_EXTRAS.map((extra) => ({
      href: extra.href,
      key: extra.key,
      icon: extra.icon,
      label: tNav(extra.key),
    }));
    return [...fromKeys, ...extras];
  }, [navItemByKey, tNav]);

  const tertiaryGroups = useMemo(
    () =>
      adminNavGroupDefs
        .map((group) => ({
          ...group,
          items: filterAdminNavGroupItems(group.itemKeys)
            .map((key) => navItemByKey.get(key))
            .filter((n): n is NavItem => Boolean(n)),
        }))
        .filter((g) => g.items.length > 0),
    [navItemByKey],
  );

  const tertiaryActive = useMemo(
    () =>
      tertiaryGroups.some((g) => g.items.some((item) => isActive(item.href))),
    [tertiaryGroups, isActive],
  );

  const [moreOpen, setMoreOpen] = useState(tertiaryActive);

  useEffect(() => {
    if (tertiaryActive) setMoreOpen(true);
  }, [tertiaryActive]);

  return (
    <nav className="relative flex-1 overflow-y-auto px-2 py-3">
      <p className="mb-2 px-1 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {isKo ? "자주 쓰는" : "Quick access"}
      </p>
      <ul className="grid grid-cols-1 gap-2">
        {primaryItems.map((item) => (
          <li key={item.href}>
            <PrimaryNavCard
              item={item}
              locale={locale}
              active={isActive(item.href)}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>

      {secondaryItems.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {isKo ? "빠른 작업" : "Quick actions"}
          </p>
          <div className="flex flex-wrap gap-1.5 px-0.5">
            {secondaryItems.map((item) => (
              <SecondaryLink
                key={item.href}
                item={item}
                locale={locale}
                active={isActive(item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors",
            moreOpen
              ? "border-border bg-muted/50 text-foreground"
              : "border-dashed border-border/80 text-muted-foreground hover:bg-muted/30",
          )}
          aria-expanded={moreOpen}
        >
          <span>{isKo ? "더 보기" : "More"}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              moreOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {moreOpen ? (
          <div className="mt-2 space-y-0">
            {tertiaryGroups.map((group) => (
              <GroupSection
                key={group.id}
                groupId={group.id}
                label={tNav(group.labelKey)}
                items={group.items}
                locale={locale}
                isActive={isActive}
                onNavigate={onNavigate}
                defaultCollapsed
              />
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
