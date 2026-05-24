"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { ChevronDown, HelpCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { HeaderNotificationsBell } from "@/components/header-notifications-bell";
import { HeaderProTrialChip } from "@/components/navigation/header-pro-trial-chip";
import { MediaNavHoverPanel } from "@/components/navigation/media-nav-hover-panel";
import { useCommandPaletteOptional } from "@/components/navigation/command-palette-provider";
import {
  MORE_NAV_SECTIONS,
  TOP_NAV_ITEMS,
  type TopNavLink,
} from "@/lib/navigation/desktop-top-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { headerChromeIconButtonClass } from "@/components/public-chrome/header-chrome-buttons";
import { openHomeOnboardingTour } from "@/lib/home-tour";
import { Globe } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const next = locale === "ko" ? "en" : "ko";
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(() => {
          if (pathname == null || pathname === "") return;
          router.replace(pathname, { locale: next });
        })
      }
      disabled={isPending}
      className={headerChromeIconButtonClass}
      aria-label={locale === "ko" ? "Switch to English" : "한국어로 전환"}
    >
      {" "}
      <Globe className="h-4 w-4" />{" "}
    </button>
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
    <div ref={ref} className="relative" onMouseLeave={onClose}>
      {" "}
      <button
        type="button"
        onMouseEnter={onOpen}
        onClick={() => (open ? onClose() : onOpen())}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
          active
            ? "text-violet-600 dark:text-violet-300"
            : "text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/5",
        )}
        aria-expanded={open}
      >
        {" "}
        {label}{" "}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />{" "}
      </button>{" "}
      {open ? (
        <div
          className="absolute left-0 top-full z-50 pt-1"
          onMouseEnter={onOpen}
        >
          {" "}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#0a0a12]">
            {" "}
            {children}{" "}
          </div>{" "}
        </div>
      ) : null}{" "}
    </div>
  );
}
function MoreDropdownPanel({
  isKo,
  onClose,
}: {
  isKo: boolean;
  onClose: () => void;
}) {
  return (
    <div className="grid w-[min(28rem,calc(100vw-2rem))] grid-cols-2 gap-4 p-4">
      {" "}
      {MORE_NAV_SECTIONS.map((section) => (
        <div key={section.id}>
          {" "}
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-white/40">
            {" "}
            {isKo ? section.titleKo : section.titleEn}{" "}
          </p>{" "}
          <ul className="space-y-0.5">
            {" "}
            {section.items.map((item: TopNavLink) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  {" "}
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/5"
                  >
                    {" "}
                    {Icon ? (
                      <Icon className="h-4 w-4 shrink-0 text-violet-500" />
                    ) : null}{" "}
                    {isKo ? item.labelKo : item.labelEn}{" "}
                  </Link>{" "}
                </li>
              );
            })}{" "}
          </ul>{" "}
        </div>
      ))}{" "}
    </div>
  );
}
export function DesktopGlobalNav() {
  const pathname = usePathname() ?? "/";
  const locale = useLocale();
  const isKo = locale === "ko";
  const palette = useCommandPaletteOptional();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const isMediaActive =
    pathname.startsWith("/media") ||
    pathname.startsWith("/recommend") ||
    pathname.startsWith("/compare");
  return (
    <header className="sticky top-0 z-50 hidden w-full border-b border-gray-200 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-[#05050a]/95 md:block">
      {" "}
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4 lg:px-6">
        {" "}
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap text-lg font-black tracking-tight text-gray-900 dark:text-white"
        >
          {" "}
          <span>THINK</span>{" "}
          <span className="tkad-home-accent-text">AD</span>{" "}
        </Link>{" "}
        <nav
          className="hidden min-w-0 flex-1 items-center gap-1 md:flex"
          aria-label={isKo ? "주 메뉴" : "Main menu"}
        >
          {" "}
          {TOP_NAV_ITEMS.map((item) => {
            const label = isKo ? item.labelKo : item.labelEn;
            if (item.id === "media" && item.megaMenu) {
              return (
                <NavDropdown
                  key={item.id}
                  label={label}
                  open={openMenu === item.id}
                  onOpen={() => setOpenMenu(item.id)}
                  onClose={() => setOpenMenu(null)}
                  active={isMediaActive}
                >
                  {" "}
                  <MediaNavHoverPanel links={item.megaMenu} />{" "}
                </NavDropdown>
              );
            }
            if (item.id === "more") {
              return (
                <NavDropdown
                  key={item.id}
                  label={`${label} ▼`}
                  open={openMenu === item.id}
                  onOpen={() => setOpenMenu(item.id)}
                  onClose={() => setOpenMenu(null)}
                >
                  {" "}
                  <MoreDropdownPanel
                    isKo={isKo}
                    onClose={() => setOpenMenu(null)}
                  />{" "}
                </NavDropdown>
              );
            }
            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    isActive(item.href)
                      ? "text-violet-600 dark:text-violet-300"
                      : "text-gray-700 hover:bg-gray-100 dark:text-white/80 dark:hover:bg-white/5",
                  )}
                >
                  {" "}
                  {label}{" "}
                </Link>
              );
            }
            return null;
          })}{" "}
        </nav>{" "}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {" "}
          <button
            type="button"
            onClick={() => palette?.setOpen(true)}
            className={headerChromeIconButtonClass}
            aria-label={isKo ? "검색 (Cmd+K)" : "Search (Cmd+K)"}
            data-tour="search"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openHomeOnboardingTour()}
            className={headerChromeIconButtonClass}
            aria-label={isKo ? "사용 안내" : "Help tour"}
            title={isKo ? "사용 안내" : "Help tour"}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <HeaderNotificationsBell /> <HeaderProTrialChip /> <HeaderUserMenu />{" "}
          <LanguageToggle />{" "}
          <ThemeToggle className={headerChromeIconButtonClass} />{" "}
        </div>{" "}
      </div>{" "}
    </header>
  );
}
