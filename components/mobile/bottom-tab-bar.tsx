"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Home,
  LayoutGrid,
  MessageCircle,
  Search,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptic";
import { useMobileTabBadges } from "@/hooks/use-mobile-tab-badges";
import { openContactChannelSheet } from "@/components/contact/contact-channel-provider";

export type MobileBottomTabDef = {
  id: string;
  /** i18n key under `mobileTabs` */
  labelKey: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
  href?: string;
  emphasized?: boolean;
  badgeKey?: "contact" | "my";
  /** Opens contact channel sheet instead of navigating */
  action?: "contact-sheet";
};

/** 모바일 하단 탭 정의 — 항목 추가 시 이 배열만 수정 */
export const MOBILE_BOTTOM_TABS: MobileBottomTabDef[] = [
  {
    id: "home",
    href: "/",
    labelKey: "home",
    icon: Home,
    match: (p) => p === "/" || p === "",
  },
  {
    id: "explore",
    href: "/media",
    labelKey: "explore",
    icon: Search,
    match: (p) =>
      (p.startsWith("/media") && !p.startsWith("/media-owner")) ||
      p.startsWith("/search"),
  },
  {
    id: "planner",
    href: "/planner",
    labelKey: "planner",
    icon: LayoutGrid,
    match: (p) => p.startsWith("/planner"),
    emphasized: true,
  },
  {
    id: "contact",
    labelKey: "contact",
    icon: MessageCircle,
    match: (p) => p.startsWith("/contact"),
    badgeKey: "contact",
    action: "contact-sheet",
  },
  {
    id: "my",
    href: "/my",
    labelKey: "my",
    icon: User,
    match: (p) => p.startsWith("/my"),
    badgeKey: "my",
  },
];

const TAB_LABEL_ACTIVE = "font-semibold text-[color:var(--qp-accent)]";

const TAB_LABEL_INACTIVE =
  "text-[color:var(--qp-fg-muted)]/70 dark:text-white/40";

function isHiddenPath(pathname: string | null): boolean {
  if (!pathname) return true;
  return (
    pathname.includes("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/signup") ||
    pathname.includes("/reset-password") ||
    pathname.includes("/forgot-password")
  );
}

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 z-10 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--qp-accent)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-[#05050a]">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function TabNeonIcon({
  Icon,
  active,
  badgeCount,
  variant = "chip",
}: {
  Icon: LucideIcon;
  active: boolean;
  badgeCount: number;
  variant?: "chip" | "fab";
}) {
  const glyph = (
    <Icon
      className={cn(
        "tkad-mobile-tab-icon",
        variant === "fab" ? "h-6 w-6" : "h-5 w-5",
      )}
      strokeWidth={active ? 2.25 : 2}
      aria-hidden
    />
  );

  if (variant === "fab") {
    return (
      <span className="relative inline-flex">
        {glyph}
        <TabBadge count={badgeCount} />
      </span>
    );
  }

  return (
    <span
      className="tkad-mobile-tab-icon-wrap"
      data-active={active ? "true" : "false"}
    >
      {glyph}
      {active ? (
        <span
          aria-hidden
          className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[color:var(--qp-accent)]"
        />
      ) : null}
      <TabBadge count={badgeCount} />
    </span>
  );
}

function TabLabel({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "mt-1 w-full truncate text-center text-[10px] transition-colors duration-200",
        active ? TAB_LABEL_ACTIVE : TAB_LABEL_INACTIVE,
      )}
    >
      {children}
    </span>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();
  const t = useTranslations("mobileTabs");
  const badges = useMobileTabBadges();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isHiddenPath(pathname)) return null;

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[80] block h-[4.25rem] md:hidden",
        "border-t border-[color:var(--qp-line)]/70 bg-white/95 backdrop-blur-xl",
        "shadow-[0_-4px_24px_rgba(15,23,42,0.06)]",
        "dark:border-white/10 dark:bg-[#05050a]/92",
        "dark:shadow-[0_-6px_28px_rgba(0,0,0,0.45)]",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label={t("navAria")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[color:var(--qp-line)]/80 dark:bg-white/10"
      />
      <ul className="flex h-full w-full items-end">
        {MOBILE_BOTTOM_TABS.map((tab) => {
          const active = tab.match(pathname ?? "");
          const Icon = tab.icon;
          const label = t(tab.labelKey);
          const badgeCount = tab.badgeKey ? badges[tab.badgeKey] : 0;

          if (tab.emphasized && tab.href) {
            return (
              <li key={tab.id} className="relative z-10 flex min-w-0 flex-1 basis-0">
                <Link
                  href={tab.href}
                  onClick={() => hapticLight()}
                  className="tkad-mobile-tab-fab relative z-10 -translate-y-2 flex w-full min-w-0 flex-col items-center transition-all duration-200 active:scale-95"
                  aria-current={active ? "page" : undefined}
                >
                  <span className="tkad-qp-cta tkad-mobile-tab-fab relative z-10 flex h-14 w-14 items-center justify-center rounded-full">
                    <TabNeonIcon
                      Icon={Icon}
                      active={active}
                      badgeCount={0}
                      variant="fab"
                    />
                  </span>
                  <TabLabel active={active}>{label}</TabLabel>
                </Link>
              </li>
            );
          }

          if (tab.action === "contact-sheet") {
            return (
              <li key={tab.id} className="flex min-w-0 flex-1 basis-0">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    openContactChannelSheet();
                  }}
                  className="flex w-full min-w-0 flex-col items-center pb-2 pt-1 transition-all duration-200 active:scale-95"
                  aria-current={active ? "page" : undefined}
                >
                  <TabNeonIcon
                    Icon={Icon}
                    active={active}
                    badgeCount={badgeCount}
                  />
                  <TabLabel active={active}>{label}</TabLabel>
                </button>
              </li>
            );
          }

          if (!tab.href) return null;

          return (
            <li key={tab.id} className="flex min-w-0 flex-1 basis-0">
              <Link
                href={tab.href}
                className="flex w-full min-w-0 flex-col items-center pb-2 pt-1 transition-all duration-200 active:scale-95"
                aria-current={active ? "page" : undefined}
                onClick={() => hapticLight()}
              >
                <TabNeonIcon
                  Icon={Icon}
                  active={active}
                  badgeCount={badgeCount}
                />
                <TabLabel active={active}>{label}</TabLabel>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
