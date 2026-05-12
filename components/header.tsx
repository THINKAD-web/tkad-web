"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  ChevronDown,
  Globe,
  Home as HomeIcon,
  Menu,
  Map as MapIcon,
  Layers,
  Sparkles,
  ClipboardList,
  BookOpen,
  LineChart,
  GraduationCap,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect, useTransition, useRef } from "react";

type NavLeaf = { href: string; label: string; desc?: string; icon?: LucideIcon };
type NavGroup = { label: string; items: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

function isGroup(n: NavEntry): n is NavGroup {
  return (n as NavGroup).items !== undefined;
}

function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (next: "ko" | "en") => {
    startTransition(() => {
      if (pathname == null || pathname === "") return;
      router.replace(pathname, { locale: next });
    });
  };

  const next = locale === "ko" ? "en" : "ko";
  return (
    <button
      onClick={() => switchLocale(next)}
      disabled={isPending}
      aria-label={locale === "ko" ? "Switch to English" : "한국어로 전환"}
      title={locale === "ko" ? "English" : "한국어"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/14 bg-white/88 text-primary/70 transition-all duration-300 hover:border-silver/55 hover:bg-white hover:text-primary disabled:opacity-60"
    >
      <Globe className="h-4 w-4" />
      <span className="sr-only">{next === "ko" ? "한국어" : "English"}</span>
    </button>
  );
}

function DesktopNavItem({
  entry,
  pathname,
}: {
  entry: NavEntry;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleClose = () => {
    if (closeRef.current) clearTimeout(closeRef.current);
    closeRef.current = setTimeout(() => setOpen(false), 140);
  };
  const cancelClose = () => {
    if (closeRef.current) {
      clearTimeout(closeRef.current);
      closeRef.current = null;
    }
  };

  if (!isGroup(entry)) {
    return (
      <Link
        href={entry.href}
        className={`nav-link rounded-md px-3 py-2 text-sm font-medium transition-colors duration-300 hover:text-primary ${
          pathname === entry.href ? "active text-primary" : "text-muted-foreground"
        }`}
      >
        {entry.label}
      </Link>
    );
  }

  const isActive = entry.items.some((i) => pathname === i.href);
  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) scheduleClose();
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`nav-link inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-300 hover:text-primary ${
          isActive ? "active text-primary" : "text-muted-foreground"
        }`}
      >
        {entry.label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-1.5 w-64 -translate-x-1/2 rounded-xl border border-border/70 bg-white/97 p-1.5 shadow-xl shadow-primary/5 backdrop-blur-md"
        >
          {entry.items.map((leaf) => (
            <Link
              key={leaf.href}
              href={leaf.href}
              onClick={() => setOpen(false)}
              role="menuitem"
              className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${
                pathname === leaf.href
                  ? "bg-primary/5 text-primary font-semibold"
                  : "text-foreground hover:bg-secondary/60"
              }`}
            >
              <div className="font-medium">{leaf.label}</div>
              {leaf.desc && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {leaf.desc}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navEntries: NavEntry[] = [
    { href: "/", label: t("nav.home"), icon: HomeIcon },
    { href: "/services", label: t("nav.services"), icon: Briefcase },
    {
      label: t("nav.media"),
      items: [
        { href: "/media", label: t("nav.media"), desc: "전국 OOH 매체 목록", icon: Layers },
        { href: "/media/map", label: "지도에서 찾기", desc: "위치 기반 탐색", icon: MapIcon },
        { href: "/recommend", label: t("nav.recommend"), desc: "AI 기반 추천", icon: Sparkles },
        { href: "/planner", label: t("nav.planner"), desc: "예산·기간별 플래닝", icon: ClipboardList },
      ],
    },
    {
      label: t("nav.insights"),
      items: [
        { href: "/cases", label: t("nav.cases"), desc: "집행 사례 모음", icon: BookOpen },
        { href: "/insights", label: t("nav.insights"), desc: "OOH 트렌드 리포트", icon: LineChart },
        { href: "/academy", label: t("nav.academy"), desc: "광고주 교육 콘텐츠", icon: GraduationCap },
      ],
    },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-[background,box-shadow,backdrop-filter] duration-500 ${
        scrolled
          ? "header-scrolled border-b border-primary/10 supports-[backdrop-filter]:bg-transparent"
          : "bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/55"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="text-2xl font-extrabold tracking-tight text-primary transition-colors duration-300">
            THINK
            <span className="bg-gradient-to-r from-gold via-gold-light to-silver bg-clip-text text-transparent">
              AD
            </span>
          </span>
          <span className="hidden text-[11px] font-medium tracking-wider text-muted-foreground uppercase sm:inline">
            싱커드
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navEntries.map((entry, i) => (
            <DesktopNavItem
              key={isGroup(entry) ? `g-${i}` : entry.href}
              entry={entry}
              pathname={pathname}
            />
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <HeaderUserMenu />
          <LanguageToggle />
          <ThemeToggle />
          <Link href="/contact">
            <Button
              variant="cta"
              className="btn-gold rounded-full px-5 shadow-md shadow-cta/25"
            >
              {t("nav.contact")}
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 md:hidden">
          <HeaderUserMenu />
          <LanguageToggle />
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 touch-manipulation"
                aria-label="메뉴 열기"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">메뉴 열기</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="mobile-sheet border-l-0 bg-white backdrop-blur-xl p-0 w-[88vw] sm:max-w-sm"
            >
              <div className="flex h-full flex-col overflow-y-auto">
                <div className="sticky top-0 z-10 border-b border-border/60 bg-white/95 backdrop-blur-sm px-5 py-4">
                  <span className="text-lg font-extrabold tracking-tight text-primary">
                    THINK
                    <span className="bg-gradient-to-r from-gold via-gold-light to-silver bg-clip-text text-transparent">
                      AD
                    </span>
                  </span>
                </div>

                <nav className="flex flex-col gap-5 px-4 py-5">
                  {/* 단일 항목(홈·서비스) 은 아이콘 행으로 */}
                  <div className="space-y-1">
                    {navEntries
                      .filter((e): e is NavLeaf => !isGroup(e))
                      .map((leaf) => {
                        const active = pathname === leaf.href;
                        const Icon = leaf.icon;
                        return (
                          <Link
                            key={leaf.href}
                            href={leaf.href}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-3 rounded-xl px-3.5 py-3 transition-colors ${
                              active
                                ? "bg-primary/8 text-primary"
                                : "text-foreground hover:bg-secondary/60"
                            }`}
                          >
                            {Icon && (
                              <span
                                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                                  active
                                    ? "bg-primary text-white"
                                    : "bg-secondary text-muted-foreground"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                            )}
                            <span className="text-sm font-semibold">{leaf.label}</span>
                          </Link>
                        );
                      })}
                  </div>

                  {/* 그룹 항목은 카드 형태 */}
                  {navEntries
                    .filter((e): e is NavGroup => isGroup(e))
                    .map((group, gi) => (
                      <section
                        key={`g-${gi}`}
                        className="rounded-2xl border border-border/60 bg-card/50 p-2"
                      >
                        <h3 className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {group.label}
                        </h3>
                        <div className="space-y-0.5">
                          {group.items.map((leaf) => {
                            const active = pathname === leaf.href;
                            const Icon = leaf.icon;
                            return (
                              <Link
                                key={leaf.href}
                                href={leaf.href}
                                onClick={() => setOpen(false)}
                                className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                                  active
                                    ? "bg-primary/8"
                                    : "hover:bg-secondary/60"
                                }`}
                              >
                                {Icon && (
                                  <span
                                    className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                                      active
                                        ? "bg-primary text-white"
                                        : "bg-secondary text-muted-foreground"
                                    }`}
                                  >
                                    <Icon className="h-4 w-4" />
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <div
                                    className={`text-sm font-semibold ${
                                      active ? "text-primary" : "text-foreground"
                                    }`}
                                  >
                                    {leaf.label}
                                  </div>
                                  {leaf.desc && (
                                    <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                                      {leaf.desc}
                                    </div>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                </nav>

                <div className="sticky bottom-0 mt-auto border-t border-border/60 bg-white/95 backdrop-blur-sm px-4 py-4">
                  <Link href="/contact" onClick={() => setOpen(false)} className="block">
                    <Button
                      variant="cta"
                      className="btn-gold h-11 w-full rounded-full text-sm font-semibold shadow-md shadow-cta/25"
                    >
                      {t("nav.contact")}
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
