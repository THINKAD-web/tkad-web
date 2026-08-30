"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ChevronDown, ExternalLink, Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderDesktopChrome } from "@/components/header-desktop-chrome";
import { HeaderCartLink } from "@/components/header-cart-link";
import { HeaderNotificationsBell } from "@/components/header-notifications-bell";
import { MediaNavHoverPanel } from "@/components/navigation/media-nav-hover-panel";
import { useCommandPaletteOptional } from "@/components/navigation/command-palette-provider";
import { PublicNavSidebar } from "@/components/navigation/public-nav-sidebar";
import { headerMobileMenuRowClass } from "@/components/public-chrome/header-chrome-buttons";
import {
  buildPublicNavGroups,
  findActiveNavGroupId,
  type ResolvedPublicNavGroup,
  type ResolvedPublicNavItem,
} from "@/lib/navigation/build-public-nav";
import { THINKAD_DIGITAL_URL } from "@/lib/navigation/cross-brand";

/** Ignore rapid double-taps that open-then-immediately-close the panel. */
const MOBILE_NAV_TOGGLE_GUARD_MS = 320;

/**
 * 퇴장 애니메이션 길이 — `--motion-exit` 와 같은 값이어야 한다.
 * 패널을 이 시간만큼 더 mount 해 둔 뒤 언마운트한다.
 *
 * **반드시 MOBILE_NAV_TOGGLE_GUARD_MS 보다 짧게 유지할 것.** 가드보다 길면
 * 닫히는 도중 다시 열 수 없어 버벅이는 것처럼 느껴진다(PR #487 이 고친 문제와
 * 같은 증상이 다시 생긴다).
 */
const MOBILE_NAV_EXIT_MS = 150;

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
      ? "tkad-qp-cta bg-[color:var(--qp-accent)]"
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
                {item.desc ? (
                  <span
                    className={cn(
                      "mt-0.5 block text-xs text-gray-500 dark:text-white/45",
                      item.id === "ai-recommend" && "leading-snug",
                    )}
                  >
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
  const [mobileNavContentReady, setMobileNavContentReady] = useState(false);
  /**
   * 퇴장 애니메이션 동안 패널을 살려 두기 위한 렌더 게이트.
   * `mobileNavOpen` 이 열림/닫힘의 단일 진실이고, 이 값은 그것을 뒤따를 뿐이다
   * — #487 의 토글 가드·rAF 로직은 그대로 둔다.
   */
  const [mobileNavRendered, setMobileNavRendered] = useState(false);
  const mobileScrollLockYRef = useRef(0);
  const mobileNavToggleLockUntilRef = useRef(0);
  const commandPalette = useCommandPaletteOptional();

  const navGroups = useMemo(() => buildPublicNavGroups(t), [t]);
  const activeGroupId = findActiveNavGroupId(pathname, navGroups, searchParams);
  const showMobileBack = isMobileDetailPath(pathname);

  const setMobileNavOpenSafe = useCallback((next: boolean | ((v: boolean) => boolean)) => {
    setMobileNavOpen((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      if (resolved && !prev) {
        mobileScrollLockYRef.current = window.scrollY;
      }
      return resolved;
    });
  }, []);

  const toggleMobileNav = useCallback(() => {
    const now = Date.now();
    if (now < mobileNavToggleLockUntilRef.current) return;
    mobileNavToggleLockUntilRef.current = now + MOBILE_NAV_TOGGLE_GUARD_MS;
    setMobileNavOpenSafe((v) => !v);
  }, [setMobileNavOpenSafe]);

  /**
   * 열림/닫힘에 딸린 두 가지를 한 effect 에서 처리한다.
   *  - 내용 mount: #487 이 넣은 rAF 지연 (패널 껍데기를 먼저 보여준다)
   *  - 렌더 게이트: 닫힐 때 퇴장 애니메이션(MOBILE_NAV_EXIT_MS)이 끝난 뒤 unmount
   * 의존성과 목적이 같아 나누면 effect 만 늘어난다.
   */
  useEffect(() => {
    if (!mobileNavOpen) {
      setMobileNavContentReady(false);
      const exitId = window.setTimeout(
        () => setMobileNavRendered(false),
        MOBILE_NAV_EXIT_MS,
      );
      return () => window.clearTimeout(exitId);
    }
    setMobileNavRendered(true);
    const id = requestAnimationFrame(() => setMobileNavContentReady(true));
    return () => cancelAnimationFrame(id);
  }, [mobileNavOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
    setMobileNavContentReady(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpenSafe(false);
    };
    document.addEventListener("keydown", onKey);

    // Keep sticky header in place (no body position:fixed). Block background
    // scroll via overflow + non-passive touchmove outside the panel — iOS Safari.
    const scrollY = mobileScrollLockYRef.current;
    const html = document.documentElement;
    const { body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.classList.add("tkad-nav-scroll-lock");

    const onTouchMove = (e: TouchEvent) => {
      const panel = document.querySelector(".tkad-site-header-panel");
      const target = e.target as Node | null;
      if (panel && target && panel.contains(target)) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("touchmove", onTouchMove);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.classList.remove("tkad-nav-scroll-lock");
      const y = scrollY;
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, left: 0, behavior: "instant" });
      });
    };
  }, [mobileNavOpen, setMobileNavOpenSafe]);

  return (
    <header className="tkad-nav-chrome sticky top-0 z-50 w-full border-b border-gray-200/90 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-[#05050a]/95">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-4 sm:gap-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
          {showMobileBack ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 md:hidden dark:text-white/80 dark:hover:bg-white/10"
              aria-label={isKo ? "뒤로" : "Back"}
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
          ) : null}

          <div className="tkad-site-brand min-w-0">
            <Link
              href="/"
              className="tkad-site-brand-parent"
              aria-label="THINKAD"
            >
              THINK
              <span className="tkad-home-accent-text">AD</span>
            </Link>
            <Link
              href="/"
              className="tkad-site-brand-sub"
              aria-label={isKo ? "THINKAD OOH MKT 홈" : "THINKAD OOH MKT home"}
            >
              OOH MKT
            </Link>
          </div>
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
          <a
            href={THINKAD_DIGITAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={navItemClass(false, false)}
            aria-label={t("nav.thinkadDigitalExternal")}
          >
            {t("nav.thinkadDigital")}
            <ExternalLink className="h-3 w-3 opacity-55" aria-hidden />
          </a>
        </nav>

        <div className="relative z-10 ml-auto flex shrink-0 items-center gap-1">
          <HeaderDesktopChrome isKo={isKo} />
          <button
            type="button"
            onClick={toggleMobileNav}
            className="tkad-site-header-menu-btn md:hidden"
            aria-label={
              mobileNavOpen
                ? isKo
                  ? "메뉴 닫기"
                  : "Close menu"
                : isKo
                  ? "메뉴 열기"
                  : "Open menu"
            }
            aria-expanded={mobileNavOpen}
          >
            {/* 두 아이콘을 겹쳐 두고 회전 페이드로 교차한다 (즉시 교체 대신) */}
            <Menu
              className="tkad-menu-icon h-5 w-5"
              data-hidden={mobileNavOpen ? "true" : "false"}
              aria-hidden
            />
            <X
              className="tkad-menu-icon h-5 w-5"
              data-hidden={mobileNavOpen ? "false" : "true"}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {mobileNavRendered ? (
        <div
          className="tkad-site-header-panel md:hidden"
          data-state={mobileNavOpen ? "open" : "closed"}
          aria-hidden={!mobileNavOpen}
          role="dialog"
          aria-label={isKo ? "모바일 메뉴" : "Mobile menu"}
        >
          {/* Absorbs header icons hidden below md — search / notifications (contact is in sidebar) */}
          <div className="mb-2 border-b border-gray-200/80 pb-2 dark:border-white/10">
            <button
              type="button"
              className={cn(headerMobileMenuRowClass, "w-full px-1")}
              onClick={() => {
                setMobileNavOpenSafe(false);
                // Open after panel unmount so dialog focus does not steal palette
                window.setTimeout(() => commandPalette?.setOpen(true), 0);
              }}
            >
              <Search className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              <span className="flex-1 text-left">
                {isKo ? "검색" : "Search"}
              </span>
            </button>
            <HeaderNotificationsBell
              variant="menu"
              onNavigate={() => setMobileNavOpenSafe(false)}
              className={cn(headerMobileMenuRowClass, "px-1")}
            />
            <HeaderCartLink
              variant="menu"
              onNavigate={() => setMobileNavOpenSafe(false)}
              className={cn(headerMobileMenuRowClass, "px-1")}
            />
          </div>
          {mobileNavContentReady ? (
            /* #487 이 이 내용을 rAF 한 프레임 뒤에 mount 한다 — 그대로 두되,
               패널 애니메이션 도중 툭 튀어나오지 않도록 함께 페이드인시킨다. */
            <div className="tkad-site-header-panel-content">
              <PublicNavSidebar
                groups={navGroups}
                onNavigate={() => setMobileNavOpenSafe(false)}
                density="panel"
              />
            </div>
          ) : (
            <div className="space-y-2 px-1 py-2" aria-hidden>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10"
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </header>
  );
}
