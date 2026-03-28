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
      className="flex items-center gap-1.5 rounded-full border border-navy/10 bg-white/80 px-3 py-1.5 text-xs font-semibold transition-all hover:border-gold/40 hover:bg-gold/5 disabled:opacity-60"
    >
      <span className="text-base leading-none">{locale === "ko" ? "🇰🇷" : "🇺🇸"}</span>
      <span className="text-navy/70">{locale === "ko" ? "한국어" : "EN"}</span>
      <span className="text-navy/30">|</span>
      <span className="text-navy/40">{locale === "ko" ? "EN" : "한국어"}</span>
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
    { href: "/media", label: t("nav.media") },
    { href: "/tools", label: t("nav.tools") },
    { href: "/about", label: t("nav.about") },
    { href: "/cases", label: t("nav.cases") },
    { href: "/resources", label: t("nav.resources") },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-2xl font-extrabold tracking-tight text-navy">
            THINK<span className="text-gold">AD</span>
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
              className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors hover:text-navy ${
                pathname === item.href
                  ? "text-navy after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-5 after:-translate-x-1/2 after:rounded-full after:bg-gold after:content-['']"
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
            <Button className="bg-gold text-navy hover:bg-gold-dark rounded-full px-6 font-bold shadow-md transition-all hover:shadow-lg">
              {t("nav.contact")}
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="mobile-sheet w-72 border-l-0 bg-white/95 backdrop-blur-xl">
              <nav className="mt-8 flex flex-col gap-1">
                {navItems.map((item, i) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`mobile-nav-item rounded-lg px-4 py-3.5 text-sm font-medium transition-colors hover:bg-gold/5 ${
                      pathname === item.href
                        ? "bg-gold/10 text-navy font-bold"
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
                  className="mobile-nav-item"
                  style={{ animationDelay: `${navItems.length * 60}ms` }}
                >
                  <Button className="mt-3 w-full bg-gold text-navy hover:bg-gold-dark rounded-full font-bold">
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
