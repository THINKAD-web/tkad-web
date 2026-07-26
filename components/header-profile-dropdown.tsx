"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  BookOpen,
  ChevronRight,
  Gift,
  Globe,
  LogOut,
  Megaphone,
  Moon,
  Sparkles,
  Sun,
  User as UserIcon,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  headerChromeDropdownBackdropClass,
  headerChromeDropdownPanelClass,
  headerChromeIconGhostClass,
  headerChromeMenuItemClass,
} from "@/components/public-chrome/header-chrome-buttons";
import { isAutoThemeMode, setManualTheme } from "@/lib/theme-auto";
import { isPro } from "@/lib/plan-check-shared";
import { HeaderUsageGuideMenuPanel } from "@/components/header-usage-guide-menu";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  pointBalance?: number;
  plan?: string;
  trialDaysLeft?: number;
};

export function HeaderProfileDropdown({
  session,
  onNavigate,
  myPageLabel,
  campaignsLabel,
  logoutLabel,
  pointsShopLabel,
  referralLabel,
}: {
  session: SessionUser;
  onNavigate?: () => void;
  myPageLabel: string;
  campaignsLabel: string;
  logoutLabel: string;
  pointsLabel?: string;
  pointsShopLabel?: string;
  referralLabel?: string;
}) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const tGuide = useTranslations("auth");
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [menuPanel, setMenuPanel] = useState<"main" | "usage">("main");
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const days = session.trialDaysLeft ?? 0;
  const pro = isPro(session);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logout = async () => {
    setOpen(false);
    onNavigate?.();
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = `/${locale}/login`;
  };

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) setMenuPanel("main");
  }, [open]);

  const close = () => {
    setOpen(false);
    setMenuPanel("main");
  };

  const switchLocale = () => {
    const next = locale === "ko" ? "en" : "ko";
    startTransition(() => {
      if (pathname == null || pathname === "") return;
      router.replace(pathname, { locale: next });
    });
    close();
  };

  const toggleTheme = () => {
    const isDark = resolvedTheme === "dark";
    const next = isDark ? "light" : "dark";
    setManualTheme(next);
    setTheme(next);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(headerChromeIconGhostClass, open && "bg-gray-100 dark:bg-white/10")}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={myPageLabel}
      >
        <UserIcon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label={isKo ? "메뉴 닫기" : "Close menu"}
            className={headerChromeDropdownBackdropClass}
            onClick={close}
          />
          <div role="menu" className={headerChromeDropdownPanelClass}>
            {menuPanel === "usage" ? (
              <HeaderUsageGuideMenuPanel
                isKo={isKo}
                onClose={() => {
                  close();
                  onNavigate?.();
                }}
                onBack={() => setMenuPanel("main")}
                title={tGuide("usageGuide")}
              />
            ) : (
              <>
          <p className="truncate px-3 py-2 text-xs font-semibold text-gray-500 dark:text-white/50">
            {session.name}
          </p>

          {pro ? (
            <Link
              href="/pricing"
              role="menuitem"
              onClick={() => {
                close();
                onNavigate?.();
              }}
              className="mx-2 mb-1 flex items-center gap-2 rounded-lg tkad-neon-cta-clean px-3 py-2 text-xs font-bold text-white"
            >
              <Sparkles className="h-3.5 w-3.5 text-white" />
              {session.plan === "PRO_TRIAL" && days > 0
                ? isKo
                  ? `PRO 체험 D-${days}`
                  : `PRO trial D-${days}`
                : session.plan === "ENTERPRISE"
                  ? "ENTERPRISE"
                  : "PRO"}
            </Link>
          ) : (
            <Link
              href="/pricing"
              role="menuitem"
              onClick={() => {
                close();
                onNavigate?.();
              }}
              className="mx-2 mb-1 flex items-center justify-between gap-2 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-800 dark:text-violet-200"
            >
              <span className="rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-700 dark:border-white/15 dark:bg-white/10 dark:text-white/80">
                FREE
              </span>
              <span>{isKo ? "PRO 업그레이드 →" : "Upgrade to PRO →"}</span>
            </Link>
          )}

          {typeof session.pointBalance === "number" ? (
            <Link
              href="/points"
              role="menuitem"
              onClick={() => {
                close();
                onNavigate?.();
              }}
              className={cn(headerChromeMenuItemClass, "font-bold text-cyan-600 dark:text-cyan-300")}
            >
              <Sparkles className="h-4 w-4" />
              ✦ {session.pointBalance.toLocaleString()}P
            </Link>
          ) : null}

          <Link href="/my" role="menuitem" onClick={() => { close(); onNavigate?.(); }} className={headerChromeMenuItemClass}>
            <UserIcon className="h-4 w-4 opacity-70" />
            {myPageLabel}
          </Link>
          <Link href="/my?tab=campaigns" role="menuitem" onClick={() => { close(); onNavigate?.(); }} className={headerChromeMenuItemClass}>
            <Megaphone className="h-4 w-4 opacity-70" />
            {campaignsLabel}
          </Link>
          <Link href="/points" role="menuitem" onClick={() => { close(); onNavigate?.(); }} className={headerChromeMenuItemClass}>
            <Gift className="h-4 w-4 opacity-70" />
            {pointsShopLabel ?? "포인트 샵"}
          </Link>
          <Link href="/my/referral" role="menuitem" onClick={() => { close(); onNavigate?.(); }} className={headerChromeMenuItemClass}>
            <Users className="h-4 w-4 opacity-70" />
            {referralLabel ?? "친구 초대"}
          </Link>

          <div className="my-1 border-t border-gray-100 dark:border-white/10" />

          <button
            type="button"
            role="menuitem"
            onClick={() => setMenuPanel("usage")}
            className={headerChromeMenuItemClass}
          >
            <BookOpen className="h-4 w-4 opacity-70" />
            <span className="min-w-0 flex-1 text-left">{tGuide("usageGuide")}</span>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
          </button>
          <button type="button" role="menuitem" onClick={switchLocale} disabled={isPending} className={headerChromeMenuItemClass}>
            <Globe className="h-4 w-4 opacity-70" />
            {locale === "ko" ? "English" : "한국어"}
          </button>
          {mounted ? (
            <button type="button" role="menuitem" onClick={toggleTheme} className={headerChromeMenuItemClass}>
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
              {isAutoThemeMode() ? (
                <span className="ml-auto text-[10px] text-gray-400">{isKo ? "자동" : "Auto"}</span>
              ) : null}
            </button>
          ) : null}

          <div className="my-1 border-t border-gray-100 dark:border-white/10" />

          <button
            type="button"
            role="menuitem"
            onClick={() => void logout()}
            className={cn(headerChromeMenuItemClass, "text-red-600 dark:text-red-400")}
          >
            <LogOut className="h-4 w-4 opacity-70" />
            {logoutLabel}
          </button>
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
