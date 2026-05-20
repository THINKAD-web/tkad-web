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
  CalendarCheck,
  Sparkles,
  Share2,
  ShieldCheck,
  UserCog,
  Inbox,
  Star,
  Search,
} from "lucide-react";

function SignOutButton({ locale, label }: { locale: string; label: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/auth/logout", { method: "POST" });
        window.location.href = `/${locale}/admin/login`;
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card"
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
  { href: "/admin/applications", key: "mediaApplications" as const, icon: ClipboardList },
  { href: "/admin/reviews", key: "mediaReviews" as const, icon: Star },
  { href: "/admin/medias", key: "medias" as const, icon: Monitor },
  { href: "/admin/verification", key: "verification" as const, icon: ShieldCheck },
  { href: "/admin/networks", key: "networks" as const, icon: Share2 },
  { href: "/admin/media-hub", key: "mediaHub" as const, icon: Database },
  // 6) 사람/권한
  { href: "/admin/users", key: "users" as const, icon: UserCog },
  // 7) 분석/도구
  { href: "/admin/analytics", key: "analytics" as const, icon: BarChart3 },
  { href: "/admin/search-stats", key: "searchStats" as const, icon: Search },
  { href: "/admin/reports/new", key: "trendReports" as const, icon: FileText },
  { href: "/admin/academy/new", key: "academyNew" as const, icon: Sparkles },
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
    <div className="tkad-admin-shell relative flex h-full flex-col overflow-hidden border-r border-border/60 bg-card/70 text-card-foreground backdrop-blur">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-20 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(168,85,247,0.14),transparent_60%),radial-gradient(circle_at_40%_90%,rgba(236,72,153,0.10),transparent_65%)]"
      />

      <div className="relative flex h-16 items-center gap-2 border-b border-border/60 px-5">
        <span className="text-lg font-black tracking-tight">
          THINK<span className="tkad-home-accent-text">AD</span>
        </span>
        <span className="rounded-2xl border border-border/60 bg-card/70 px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground shadow-sm backdrop-blur">
          ADMIN
        </span>
      </div>

      <nav className="relative flex-1 space-y-1.5 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={`/${locale}${item.href}`}
              onClick={() => setSidebarOpen(false)}
              className={[
                "group flex items-center gap-3 rounded-[14px] border border-border/70 bg-card/60 px-3 py-2.5 font-mono text-[12px] font-black uppercase tracking-[0.12em] text-foreground shadow-sm backdrop-blur transition-all hover:-translate-y-[1px] hover:border-border",
                active
                  ? "border-white/14 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(168,85,247,0.18),rgba(236,72,153,0.14))] shadow-[0_18px_70px_rgba(0,0,0,0.18)]"
                  : "",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 text-foreground/80 transition-colors group-hover:text-foreground" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-border/60 p-3">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 rounded-[14px] border border-border/70 bg-card/60 px-3 py-2.5 font-mono text-[12px] font-black uppercase tracking-[0.12em] text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
          {tNav("backToSite")}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard-root tkad-landing-neon tkad-planner-neon flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-72 shrink-0 md:block">{sidebar}</aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-md"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative h-full w-72">{sidebar}</div>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="relative flex h-14 items-center gap-3 border-b border-border/60 bg-card/70 px-4 backdrop-blur md:px-6">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] tkad-neon-grid" />
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-full border border-border/70 bg-card/70 p-2 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-mono text-[12px] font-bold uppercase tracking-[0.18em]">
            {navItems.find((n) => isActive(n.href))?.label ?? "관리자"}
          </h1>
          <ThemeToggle className="rounded-full border border-border/70 bg-card/70 shadow-sm backdrop-blur" />
          <SignOutButton locale={locale} label={tNav("signOut")} />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
