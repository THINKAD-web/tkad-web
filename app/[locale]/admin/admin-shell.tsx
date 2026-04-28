"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  MessageSquareText,
  Monitor,
  BarChart3,
  UsersRound,
  ArrowLeft,
  Menu,
  LogOut,
  Megaphone,
  ContactRound,
  Database,
  FileText,
  Calculator,
  ClipboardList,
  Sparkles,
  Share2,
  ShieldCheck,
  UserCog,
} from "lucide-react";

function SignOutButton({ locale, label }: { locale: string; label: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/auth/logout", { method: "POST" });
        window.location.href = `/${locale}/admin/login`;
      }}
      className="inline-flex shrink-0 items-center gap-1.5 border-2 border-bx-black bg-bx-white px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white dark:border-bx-white dark:bg-bx-black dark:text-bx-white dark:hover:bg-bx-white dark:hover:text-bx-black"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

const navDefs = [
  // 1) 홈/요약
  { href: "/admin", key: "dashboard" as const, icon: LayoutDashboard },
  // 2) 영업/리드
  { href: "/admin/inquiries", key: "inquiries" as const, icon: MessageSquareText },
  { href: "/admin/crm", key: "crm" as const, icon: UsersRound },
  { href: "/admin/crm-records", key: "crmRecords" as const, icon: ContactRound },
  // 3) 견적/계약
  { href: "/admin/quotes", key: "quotesList" as const, icon: ClipboardList },
  { href: "/admin/quotes/new", key: "quotesNew" as const, icon: Calculator },
  { href: "/admin/quote-templates", key: "quoteTemplates" as const, icon: FileText },
  // 4) 캠페인 운영
  { href: "/admin/campaigns", key: "campaigns" as const, icon: Megaphone },
  { href: "/admin/community", key: "community" as const, icon: MessageSquareText },
  // 5) 매체/검증/네트워크
  { href: "/admin/medias", key: "medias" as const, icon: Monitor },
  { href: "/admin/verification", key: "verification" as const, icon: ShieldCheck },
  { href: "/admin/networks", key: "networks" as const, icon: Share2 },
  { href: "/admin/media-hub", key: "mediaHub" as const, icon: Database },
  // 6) 사람/권한
  { href: "/admin/users", key: "users" as const, icon: UserCog },
  // 7) 분석/도구
  { href: "/admin/analytics", key: "analytics" as const, icon: BarChart3 },
  { href: "/admin/ai-content", key: "aiContent" as const, icon: Sparkles },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tNav = useTranslations("adminNav");

  const locale = pathname.split("/")[1] || "ko";
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  const navItems = navDefs.map((n) => ({
    ...n,
    label: tNav(n.key),
  }));

  const isActive = (href: string) => {
    if (href === "/admin") return pathWithoutLocale === "/admin";
    if (href === "/admin/quotes") {
      return (
        pathWithoutLocale === "/admin/quotes" ||
        (pathWithoutLocale.startsWith("/admin/quotes/") &&
          !pathWithoutLocale.startsWith("/admin/quotes/new"))
      );
    }
    return pathWithoutLocale.startsWith(href);
  };

  const sidebar = (
    <div className="flex h-full flex-col border-r-2 border-bx-black bg-bx-white text-bx-black dark:border-bx-white dark:bg-bx-black dark:text-bx-white">
      <div className="flex h-16 items-center gap-2 border-b-2 border-bx-black px-5 dark:border-bx-white">
        <span className="text-lg font-extrabold tracking-tight">
          THINK<span className="text-bx-accent">AD</span>
        </span>
        <span className="border-2 border-bx-black bg-bx-accent px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-white dark:border-bx-white">
          ADMIN
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={`/${locale}${item.href}`}
              onClick={() => setSidebarOpen(false)}
              className={[
                "flex items-center gap-3 border-2 border-bx-black px-3 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition-colors dark:border-bx-white",
                active
                  ? "bg-bx-black text-bx-white dark:bg-bx-white dark:text-bx-black"
                  : "bg-bx-white text-bx-black hover:bg-bx-off dark:bg-bx-black dark:text-bx-white dark:hover:bg-bx-gray-dim/30",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t-2 border-bx-black p-3 dark:border-bx-white">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 border-2 border-bx-black bg-bx-white px-3 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-bx-black transition-colors hover:bg-bx-off dark:border-bx-white dark:bg-bx-black dark:text-bx-white dark:hover:bg-bx-gray-dim/30"
        >
          <ArrowLeft className="h-4 w-4" />
          {tNav("backToSite")}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard-root flex min-h-screen bg-bx-off text-bx-black dark:bg-bx-black dark:text-bx-white">
      <aside className="hidden w-60 shrink-0 md:block">{sidebar}</aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-bx-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative h-full w-60">{sidebar}</div>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b-2 border-bx-black bg-bx-white px-4 dark:border-bx-white dark:bg-bx-black md:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="border-2 border-bx-black bg-bx-white p-1.5 text-bx-black transition-colors hover:bg-bx-off dark:border-bx-white dark:bg-bx-black dark:text-bx-white dark:hover:bg-bx-gray-dim/30 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-mono text-[12px] font-bold uppercase tracking-[0.18em]">
            {navItems.find((n) => isActive(n.href))?.label ?? "관리자"}
          </h1>
          <ThemeToggle className="inline-flex h-9 w-9 items-center justify-center border-2 border-bx-black bg-bx-white text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white dark:border-bx-white dark:bg-bx-black dark:text-bx-white dark:hover:bg-bx-white dark:hover:text-bx-black" />
          <SignOutButton locale={locale} label={tNav("signOut")} />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
