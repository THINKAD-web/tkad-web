"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderDesktopChrome } from "@/components/header-desktop-chrome";
import { MediaNavHoverPanel } from "@/components/navigation/media-nav-hover-panel";
import { PublicNavSidebar } from "@/components/navigation/public-nav-sidebar";
import {
  buildPublicNavGroups,
  findActiveNavGroupId,
  type ResolvedPublicNavGroup,
  type ResolvedPublicNavItem,
} from "@/lib/navigation/build-public-nav";

function isMobileDetailPath(pathname: string): boolean {
  return (
    (/^\/media\/[^/]+$/.test(pathname) && !pathname.startsWith("/media/map")) ||
    /^\/cases\/[^/]+$/.test(pathname)
  );
}

function navItemClass(active: boolean, open: boolean) {
  return cn(
    "inline-flex min-h-8 items-center gap-0.5 rounded-[var(--qp-radius-md)] px-3 py-1.5 text-[13px] font-semibold leading-none transition-colors",
    active || open
      ? "bg-[color:var(--qp-accent)] text-white [&_svg]:text-white"
      : "text-gray-600 hover:bg-gray-100 dark:text-white/70 dark:hover:bg-white/8",
  );
}

function NavDropdown({
  label,
  open,
  onOpen,
  onClose,
  children,
  active,
}: {
  label: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);
  return (
    <div
      ref={ref}
      className="relative hidden md:block"
      onMouseLeave={() => {
        if (window.matchMedia("(hover: hover)").matches) onClose();
      }}
    >
      <button
        type="button"
        onMouseEnter={onOpen}
        onClick={() => (open ? onClose() : onOpen())}
        className={navItemClass(!!active, open)}
        aria-expanded={open}
      >
        {label}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            (active || open) && "text-white",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 pt-1.5"
          onMouseEnter={onOpen}
        >
          <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white/98 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-[#0a0a12]/98 dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NavGroupPanel({
  group,
  onClose,
}: {
  group: ResolvedPublicNavGroup;
  onClose: () => void;
}) {
  return (
    <ul className="min-w-[15rem] space-y-0.5 p-2">
      {group.items.map((item: ResolvedPublicNavItem, index) => {
        const Icon = item.icon;
        const showPlanningDivider =
          group.id === "planning" &&
          item.id === "ai-recommend" &&
          index > 0;
        return (
          <li key={item.id}>
            {showPlanningDivider ? (
              <div
                className="mx-3 my-1.5 border-t border-gray-200/80 dark:border-white/10"
                aria-hidden
              />
            ) : null}
            <Link
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5",
                item.id === "ai-recommend" && "py-2",
              )}
            >
              {Icon ? (
                <Icon
                  className={cn(
                    "mt-0.5 shrink-0 text-[color:var(--qp-accent)]",
                    item.id === "ai-recommend"
                      ? "h-3.5 w-3.5 opacity-70"
                      : item.secondary
                        ? "h-3.5 w-3.5"
                        : "h-4 w-4",
                  )}
                  aria-hidden
                />
              ) : null}
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "block text-gray-800 dark:text-white/90",
                      item.id === "ai-recommend"
                        ? "text-[13px] font-medium text-gray-600 dark:text-white/65"
                        : item.secondary
                          ? "text-[13px] font-semibold"
                          : "text-sm font-semibold",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span className="rounded-full border border-[color:var(--qp-accent)]/30 bg-[color:var(--qp-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--qp-accent)]">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                {item.desc && item.id !== "ai-recommend" ? (
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-white/45">
                    {item.desc}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function discoveryLinksFromGroup(group: ResolvedPublicNavGroup) {
  return group.items.map((item) => ({
    id: item.id,
    labelKo: item.label,
    labelEn: item.label,
    href: item.href,
    descKo: item.desc,
    descEn: item.desc,
    icon: item.icon,
  }));
}

export function DesktopGlobalNav() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navGroups = useMemo(() => buildPublicNavGroups(t), [t]);
  const activeGroupId = findActiveNavGroupId(pathname, navGroups, searchParams);
  const showMobileBack = isMobileDetailPath(pathname);

  useEffect(() => {
    setMobileNavOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <>
      <header className="tkad-nav-chrome sticky top-0 z-50 w-full border-b border-gray-200/90 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-[#05050a]/95">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-4 sm:gap-4 md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            {showMobileBack ? (
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 md:hidden dark:text-white/80 dark:hover:bg-white/10"
                aria-label={isKo ? "뒤로" : "Back"}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMobileNavOpen((v) => !v)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 md:hidden dark:text-white/80 dark:hover:bg-white/10"
                aria-label={isKo ? "메뉴" : "Menu"}
                aria-expanded={mobileNavOpen}
              >
                {mobileNavOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            )}

            <Link
              href="/"
              className="shrink-0 whitespace-nowrap text-base font-black tracking-tight text-gray-900 sm:text-lg dark:text-white"
            >
              <span>THINK</span>{" "}
              <span className="tkad-home-accent-text">AD</span>
            </Link>
          </div>

          <nav
            className="hidden min-w-0 flex-1 items-center gap-1 md:flex"
            aria-label={isKo ? "주 메뉴" : "Main menu"}
          >
            {navGroups.map((group) => {
              const label = isKo ? group.label : group.labelEn;
              const isDiscovery = group.id === "discovery";

              return (
                <NavDropdown
                  key={group.id}
                  label={label}
                  open={openMenu === group.id}
                  onOpen={() => setOpenMenu(group.id)}
                  onClose={() => setOpenMenu(null)}
                  active={activeGroupId === group.id}
                >
                  {isDiscovery ? (
                    <MediaNavHoverPanel links={discoveryLinksFromGroup(group)} />
                  ) : (
                    <NavGroupPanel
                      group={group}
                      onClose={() => setOpenMenu(null)}
                    />
                  )}
                </NavDropdown>
              );
            })}
          </nav>

          <div className="relative z-10 ml-auto shrink-0">
            <HeaderDesktopChrome isKo={isKo} />
          </div>
        </div>
      </header>

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-label={isKo ? "메뉴 닫기" : "Close menu"}
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed inset-x-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-gray-200 bg-white shadow-xl md:hidden dark:border-white/10 dark:bg-[#05050a]">
            <PublicNavSidebar
              groups={navGroups}
              onNavigate={() => setMobileNavOpen(false)}
              density="comfortable"
            />
          </div>
        </>
      ) : null}
    </>
  );
}
