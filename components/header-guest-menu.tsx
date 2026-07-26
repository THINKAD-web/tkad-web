"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { BookOpen, ChevronRight, Globe, Moon, MoreHorizontal, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  headerChromeDropdownBackdropClass,
  headerChromeDropdownPanelClass,
  headerChromeIconGhostClass,
  headerChromeMenuItemClass,
} from "@/components/public-chrome/header-chrome-buttons";
import { setManualTheme } from "@/lib/theme-auto";
import { HeaderUsageGuideMenuPanel } from "@/components/header-usage-guide-menu";

export function HeaderGuestMenu() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("auth");
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [menuPanel, setMenuPanel] = useState<"main" | "usage">("main");
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const close = () => {
    setOpen(false);
    setMenuPanel("main");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(headerChromeIconGhostClass, open && "bg-gray-100 dark:bg-white/10")}
        aria-label={isKo ? "더보기" : "More"}
        aria-expanded={open}
      >
        <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label={isKo ? "메뉴 닫기" : "Close menu"}
            className={headerChromeDropdownBackdropClass}
            onClick={close}
          />
          <div className={headerChromeDropdownPanelClass}>
            {menuPanel === "usage" ? (
              <HeaderUsageGuideMenuPanel
                isKo={isKo}
                onClose={close}
                onBack={() => setMenuPanel("main")}
                title={t("usageGuide")}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMenuPanel("usage")}
                  className={headerChromeMenuItemClass}
                >
                  <BookOpen className="h-4 w-4 opacity-70" />
                  <span className="min-w-0 flex-1 text-left">{t("usageGuide")}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const next = locale === "ko" ? "en" : "ko";
                    startTransition(() => {
                      if (pathname == null || pathname === "") return;
                      router.replace(pathname, { locale: next });
                    });
                    close();
                  }}
                  className={headerChromeMenuItemClass}
                >
                  <Globe className="h-4 w-4 opacity-70" />
                  {locale === "ko" ? "English" : "한국어"}
                </button>
                {mounted ? (
                  <button
                    type="button"
                    onClick={() => {
                      const isDark = resolvedTheme === "dark";
                      setManualTheme(isDark ? "light" : "dark");
                      setTheme(isDark ? "light" : "dark");
                    }}
                    className={headerChromeMenuItemClass}
                  >
                    {resolvedTheme === "dark" ? (
                      <Sun className="h-4 w-4 opacity-70" />
                    ) : (
                      <Moon className="h-4 w-4 opacity-70" />
                    )}
                    {resolvedTheme === "dark"
                      ? isKo
                        ? "라이트 모드"
                        : "Light mode"
                      : isKo
                        ? "다크 모드"
                        : "Dark mode"}
                  </button>
                ) : null}
                <div className="my-1 border-t border-gray-100 dark:border-white/10" />
                <Link
                  href="/login"
                  onClick={close}
                  className={headerChromeMenuItemClass}
                >
                  {t("login")}
                </Link>
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
