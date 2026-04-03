"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useState, useEffect, useTransition } from "react";

function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (next: "ko" | "en") => {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <button
      onClick={() => switchLocale(locale === "ko" ? "en" : "ko")}
      disabled={isPending}
      aria-label={locale === "ko" ? "Switch to English" : "한국어로 전환"}
      className="touch-target flex min-h-11 items-center gap-1.5 rounded-full border border-primary/14 bg-white/88 px-3 py-2 text-xs font-semibold text-foreground transition-all duration-300 hover:border-silver/55 hover:bg-white disabled:opacity-60 touch-manipulation"
    >
      <span className="text-base leading-none">{locale === "ko" ? "🇰🇷" : "🇺🇸"}</span>
      <span className="text-primary/70">{locale === "ko" ? "한국어" : "EN"}</span>
      <span className="text-primary/25">|</span>
      <span className="text-primary/45">{locale === "ko" ? "EN" : "한국어"}</span>
    </button>
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

  const navItems = [
    { href: "/", label: t("nav.home") },
    { href: "/services", label: t("nav.services") },
    { href: "/media", label: t("nav.media") },
    { href: "/recommend", label: t("nav.recommend") },
    { href: "/planner", label: t("nav.planner") },
    { href: "/cases", label: t("nav.cases") },
    { href: "/insights", label: t("nav.insights") },
    { href: "/academy", label: t("nav.academy") },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-[background,box-shadow,backdrop-filter] duration-500 ${
        scrolled
          ? "header-scrolled border-b border-primary/10 supports-[backdrop-filter]:bg-transparent"
          : "bg-transparent backdrop-blur-0"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="text-2xl font-extrabold tracking-tight text-primary transition-colors duration-300">
            THINK<span className="bg-gradient-to-r from-gold via-gold-light to-silver bg-clip-text text-transparent">AD</span>
          </span>
          <span className="hidden text-[11px] font-medium tracking-wider text-muted-foreground uppercase sm:inline">
            싱커드
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link rounded-md px-4 py-2 text-sm font-medium transition-colors duration-300 hover:text-primary motion-safe:hover:-translate-y-0.5 ${
                pathname === item.href
                  ? "active text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageToggle />
            <Link href="/contact">
            <Button
              variant="cta"
              className="btn-gold rounded-full px-6 shadow-md shadow-cta/25"
            >
              {t("nav.contact")}
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11 touch-manipulation" aria-label="메뉴 열기">
                <Menu className="h-5 w-5" />
                <span className="sr-only">메뉴 열기</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="mobile-sheet border-l-0 bg-white/96 backdrop-blur-xl">
              <nav className="mt-8 flex flex-col gap-1">
                {navItems.map((item, i) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`mobile-nav-item touch-manipulation rounded-lg px-4 py-3.5 text-sm font-medium transition-all duration-300 hover:bg-accent/15 motion-safe:active:scale-[0.98] ${
                      pathname === item.href
                        ? "bg-accent/20 text-primary font-bold"
                        : "text-muted-foreground"
                    }`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="mobile-nav-item flex justify-center"
                  style={{ animationDelay: `${navItems.length * 60}ms` }}
                >
                  <Button
                    variant="cta"
                    className="btn-gold mt-3 h-10 w-auto min-w-[8rem] rounded-full px-6 touch-manipulation shadow-cta/25"
                  >
                    {t("nav.contact")}
                  </Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
