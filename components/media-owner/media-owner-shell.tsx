"use client";

import { useEffect, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  Building2,
  Gavel,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  MessageCircle,
  Wallet,
  FileBarChart,
  Palette,
} from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import { FullPageSpinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { isMediaOwnerPortalRole } from "@/lib/media-owner-role";

const NAV = [
  { href: "/media-owner/dashboard", icon: LayoutDashboard, ko: "대시보드", en: "Dashboard" },
  { href: "/media-owner/matches", icon: Gavel, ko: "매칭·비딩", en: "Matches" },
  { href: "/media-owner/media", icon: Building2, ko: "내 매체", en: "My media" },
  { href: "/chat?side=owner", icon: MessageCircle, ko: "문의 채팅", en: "Inquiries" },
  { href: "/media-owner/campaigns", icon: Megaphone, ko: "집행 현황", en: "Campaigns" },
  { href: "/media-owner/reports", icon: FileBarChart, ko: "데이터 보고서", en: "Reports" },
  { href: "/media-owner/branding", icon: Palette, ko: "브랜딩", en: "Branding" },
  { href: "/media-owner/settlements", icon: Wallet, ko: "정산", en: "Settlements" },
] as const;

type Me = { id: string; name: string; email: string; role: string };

export function MediaOwnerShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const isKo = locale === "ko";
  const { user, loading } = useAuthSession();

  const me: Me | null =
    user?.id && user.name && user.email && user.role
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      : null;
  const role = user?.role;

  useEffect(() => {
    if (loading) return;
    if (!user?.id) {
      router.replace("/login?redirect=/media-owner/dashboard");
      return;
    }
    if (!role || !isMediaOwnerPortalRole(role)) {
      router.replace("/my");
    }
  }, [loading, user?.id, role, router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (loading) {
    return (
      <HomeLandingDayNight>
        <FullPageSpinner />
      </HomeLandingDayNight>
    );
  }

  if (!me || !isMediaOwnerPortalRole(me.role)) return null;

  return (
    <HomeLandingDayNight>
      <div className="mx-auto flex min-h-[80vh] max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:py-12">
        <aside className="lg:w-56 lg:shrink-0">
          <p className="tkad-type-label text-violet-300/80">
            {isKo ? "매체사 포털" : "Media owner"}
          </p>
          <h1 className="mt-2 text-lg font-bold dark:text-white text-gray-900">{me.name}</h1>
          <p className="truncate text-xs dark:text-white text-gray-400">{me.email}</p>

          <nav className="mt-6 flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
            {NAV.map(({ href, icon: Icon, ko, en }) => {
              const active = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-violet-500/20 text-violet-100"
                      : "dark:text-white text-gray-600 hover:dark:bg-white/5 bg-gray-50 hover:dark:text-white text-gray-900",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {isKo ? ko : en}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/register/media"
              className="text-xs text-violet-300 hover:underline"
            >
              {isKo ? "+ 매체 추가 등록" : "+ Register media"}
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-2 text-xs dark:text-white text-gray-400 hover:dark:text-white text-gray-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              {isKo ? "로그아웃" : "Log out"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </HomeLandingDayNight>
  );
}

export function MediaOwnerPageLoader() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
    </div>
  );
}

export const ownerGlassCard =
  "rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur";

export const ownerInputCls =
  "h-10 w-full rounded-xl border dark:border-white/12 border-gray-200 dark:bg-black bg-white/30 px-3  text-sm dark:text-white text-gray-900 outline-none focus:border-violet-400/40";
