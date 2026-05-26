"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { BookOpen, Globe, Moon, MoreHorizontal, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  headerChromeIconGhostClass,
  headerChromeMenuItemClass,
} from "@/components/public-chrome/header-chrome-buttons";
import { openHomeOnboardingTour } from "@/lib/home-tour";
import { isAutoThemeMode, setManualTheme } from "@/lib/theme-auto";

export function HeaderGuestMenu() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("auth");
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
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

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(headerChromeIconGhostClass, open && "bg-gray-100 dark:bg-white/10")}
        aria-label={isKo ? "더보기" : "More"}
        aria-expanded={open}
      >
        <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.35rem)] z-[60] w-52 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-white/12 dark:bg-[#0a0a12]">
          <button
            type="button"
            onClick={() => {
              openHomeOnboardingTour();
              close();
            }}
            className={headerChromeMenuItemClass}
          >
            <BookOpen className="h-4 w-4 opacity-70" />
            {t("usageGuide")}
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
          <Link href="/login" onClick={close} className={headerChromeMenuItemClass}>
            {t("login")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
