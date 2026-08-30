"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { ChevronDown } from "lucide-react";
import {
  MY_HUB_NAV_GROUPS,
  matchMyHubNavItem,
  type MyHubNavGroup,
  type MyHubNavItem,
} from "@/lib/my-hub-nav-config";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "sidebar" | "stack";
};

function navItemHref(
  item: MyHubNavItem,
): string | { pathname: string; query: Record<string, string> } {
  const qIndex = item.href.indexOf("?");
  if (qIndex === -1) return item.href;
  const pathname = item.href.slice(0, qIndex);
  const query = Object.fromEntries(
    new URLSearchParams(item.href.slice(qIndex + 1)),
  );
  return { pathname, query };
}

function groupHasActive(
  items: MyHubNavItem[],
  pathname: string,
  tab: string | null,
): boolean {
  return items.some((item) => matchMyHubNavItem(item, pathname, tab));
}

function PrimaryNavCard({
  item,
  active,
  isKo,
}: {
  item: MyHubNavItem;
  active: boolean;
  isKo: boolean;
}) {
  const label = isKo ? item.labelKo : item.labelEn;
  const desc = isKo ? item.descriptionKo : item.descriptionEn;
  const Icon = item.icon;

  return (
    <Link
      href={navItemHref(item)}
      className={cn(
        "group flex min-h-[4.25rem] items-start gap-3 rounded-2xl border px-3.5 py-3.5 transition-ui",
        "active:scale-[0.99]",
        active
          ? "border-[color:var(--qp-accent)]/45 bg-[color:var(--qp-accent)]/10 shadow-[0_0_0_1px_color-mix(in_srgb,var(--qp-accent)_30%,transparent)]"
          : "border-gray-200/90 bg-white/80 hover:border-[color:var(--qp-accent)]/35 hover:bg-[color:var(--qp-accent)]/5 dark:border-white/12 dark:bg-white/[0.04] dark:hover:border-[color:var(--qp-accent)]/30 dark:hover:bg-[color:var(--qp-accent)]/10",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
          active
            ? "tkad-qp-cta text-white shadow-md"
            : "bg-[color:var(--qp-accent)]/10 text-[color:var(--qp-accent)] group-hover:bg-[color:var(--qp-accent)]/15",
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span
          className={cn(
            "block text-[15px] font-bold leading-tight tracking-tight",
            active
              ? "text-gray-950 dark:text-white"
              : "text-gray-900 dark:text-white",
          )}
        >
          {label}
        </span>
        {desc ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-gray-500 dark:text-white/45">
            {desc}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function CompactIconLink({
  item,
  active,
  isKo,
  iconOnly,
}: {
  item: MyHubNavItem;
  active: boolean;
  isKo: boolean;
  iconOnly?: boolean;
}) {
  const label = isKo ? item.labelKo : item.labelEn;
  const Icon = item.icon;

  return (
    <Link
      href={navItemHref(item)}
      title={label}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors",
        iconOnly ? "h-9 w-9" : "px-2.5 py-1.5 text-xs",
        active
          ? "bg-[color:var(--qp-accent)]/15 font-semibold text-[color:var(--qp-accent)]"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-white/50 dark:hover:bg-white/8 dark:hover:text-white/85",
      )}
      aria-current={active ? "page" : undefined}
      aria-label={iconOnly ? label : undefined}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {!iconOnly ? <span>{label}</span> : null}
    </Link>
  );
}

function AccountLink({
  item,
  active,
  isKo,
}: {
  item: MyHubNavItem;
  active: boolean;
  isKo: boolean;
}) {
  const label = isKo ? item.labelKo : item.labelEn;

  return (
    <Link
      href={navItemHref(item)}
      className={cn(
        "rounded-md px-1 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "text-[color:var(--qp-accent)] underline decoration-[color:var(--qp-accent)]/60 underline-offset-2"
          : "text-gray-500 hover:text-gray-800 dark:text-white/45 dark:hover:text-white/75",
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function SecondaryListLink({
  item,
  active,
  isKo,
}: {
  item: MyHubNavItem;
  active: boolean;
  isKo: boolean;
}) {
  const label = isKo ? item.labelKo : item.labelEn;
  const Icon = item.icon;

  return (
    <Link
      href={navItemHref(item)}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] transition-colors",
        active
          ? "bg-[color:var(--qp-accent)]/12 font-semibold text-[color:var(--qp-accent)]"
          : "text-gray-600 hover:bg-gray-100 dark:text-white/65 dark:hover:bg-white/5",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

function CollapsibleSection({
  group,
  items,
  pathname,
  tab,
  isKo,
  defaultCollapsed,
  children,
}: {
  group: MyHubNavGroup;
  items: MyHubNavItem[];
  pathname: string;
  tab: string | null;
  isKo: boolean;
  defaultCollapsed: boolean;
  children: React.ReactNode;
}) {
  const hasActive = groupHasActive(items, pathname, tab);
  const [open, setOpen] = useState(!defaultCollapsed || hasActive);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  if (items.length === 0) return null;

  const title = isKo ? group.titleKo : group.titleEn;

  return (
    <div className="border-t border-gray-200/80 pt-3 dark:border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-gray-100/80 dark:hover:bg-white/5"
        aria-expanded={open}
      >
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-gray-700 dark:text-white/70">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform dark:text-white/40",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? <div className="mt-1.5">{children}</div> : null}
    </div>
  );
}

export function MyHubGroupNav({ className, variant = "sidebar" }: Props) {
  const pathname = usePathname() ?? "/my";
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isKo = locale === "ko";
  const tab = searchParams.get("tab");

  const primaryItems = useMemo(
    () =>
      MY_HUB_NAV_GROUPS.flatMap((group) =>
        group.items.filter((item) => item.priority === 1),
      ),
    [],
  );

  const secondaryGroups = useMemo(
    () =>
      MY_HUB_NAV_GROUPS.map((group) => ({
        group,
        items: group.items.filter((item) => item.priority !== 1),
      })).filter((entry) => entry.items.length > 0),
    [],
  );

  const secondaryActive = useMemo(
    () =>
      secondaryGroups.some((entry) =>
        groupHasActive(entry.items, pathname, tab),
      ),
    [secondaryGroups, pathname, tab],
  );

  const [moreOpen, setMoreOpen] = useState(secondaryActive);

  useEffect(() => {
    if (secondaryActive) setMoreOpen(true);
  }, [secondaryActive]);

  return (
    <nav
      className={cn(
        variant === "sidebar" && "w-full shrink-0 lg:w-44 xl:w-48",
        variant === "stack" && "w-full",
        className,
      )}
      aria-label={isKo ? "마이페이지 메뉴" : "My page menu"}
    >
      <p className="mb-2.5 px-0.5 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-gray-800 dark:text-white/80">
        {isKo ? "자주 쓰는 메뉴" : "Quick access"}
      </p>

      <ul
        className={cn(
          "grid gap-2",
          variant === "stack" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        )}
      >
        {primaryItems.map((item) => (
          <li key={item.id}>
            <PrimaryNavCard
              item={item}
              active={matchMyHubNavItem(item, pathname, tab)}
              isKo={isKo}
            />
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors",
            moreOpen
              ? "border-gray-200 bg-gray-50 text-gray-700 dark:border-white/12 dark:bg-white/5 dark:text-white/75"
              : "border-dashed border-gray-300/80 text-gray-500 hover:border-gray-400 hover:bg-gray-50 dark:border-white/15 dark:text-white/50 dark:hover:bg-white/5",
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
            {secondaryGroups.map(({ group, items }) => {
              if (group.id === "save-explore") {
                return (
                  <CollapsibleSection
                    key={group.id}
                    group={group}
                    items={items}
                    pathname={pathname}
                    tab={tab}
                    isKo={isKo}
                    defaultCollapsed
                  >
                    <div className="flex flex-wrap items-center gap-1.5 px-0.5">
                      {items.map((item) => (
                        <CompactIconLink
                          key={item.id}
                          item={item}
                          active={matchMyHubNavItem(item, pathname, tab)}
                          isKo={isKo}
                          iconOnly
                        />
                      ))}
                    </div>
                  </CollapsibleSection>
                );
              }

              if (group.id === "account") {
                return (
                  <CollapsibleSection
                    key={group.id}
                    group={group}
                    items={items}
                    pathname={pathname}
                    tab={tab}
                    isKo={isKo}
                    defaultCollapsed
                  >
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 px-0.5 leading-relaxed">
                      {items.map((item, idx) => (
                        <span key={item.id} className="inline-flex items-center">
                          {idx > 0 ? (
                            <span
                              className="mx-1 text-[10px] text-gray-300 dark:text-white/20"
                              aria-hidden
                            >
                              ·
                            </span>
                          ) : null}
                          <AccountLink
                            item={item}
                            active={matchMyHubNavItem(item, pathname, tab)}
                            isKo={isKo}
                          />
                        </span>
                      ))}
                    </div>
                  </CollapsibleSection>
                );
              }

              return (
                <CollapsibleSection
                  key={group.id}
                  group={group}
                  items={items}
                  pathname={pathname}
                  tab={tab}
                  isKo={isKo}
                  defaultCollapsed={group.id !== "plan-design"}
                >
                  <ul className="space-y-0.5 px-0.5">
                    {items.map((item) => (
                      <li key={item.id}>
                        <SecondaryListLink
                          item={item}
                          active={matchMyHubNavItem(item, pathname, tab)}
                          isKo={isKo}
                        />
                      </li>
                    ))}
                  </ul>
                </CollapsibleSection>
              );
            })}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
