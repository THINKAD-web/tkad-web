"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminShellNav } from "@/components/admin/admin-shell-nav";
import type { AdminNavKey } from "@/lib/admin-nav-config";
import {
  Activity,
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
  Bot,
  Coins,
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
  FlaskConical,
  Radar,
  KeyRound,
  Kanban,
  TrendingUp,
  Mail,
  Gift,
  Shield,
  FileSignature,
  type LucideIcon,
} from "lucide-react";

function SignOutButton({ locale, label }: { locale: string; label: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/admin/auth/logout", { method: "POST" });
        window.location.href = `/${locale}/admin/login`;
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 font-display text-[11px] font-black uppercase tracking-[0.18em] text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

type NavKey = AdminNavKey;

type NavDef = {
  href: string;
  key: NavKey;
  icon: LucideIcon;
};

const navDefs: NavDef[] = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/monitoring", key: "monitoring", icon: Radar },
  { href: "/admin/launch-monitor", key: "launchMonitor", icon: Activity },
  { href: "/admin/health", key: "linkHealth", icon: Radar },
  { href: "/admin/manual", key: "operatorManual", icon: FileText },
  { href: "/admin/inquiries", key: "inquiries", icon: MessageSquareText },
  { href: "/admin/biddings", key: "biddings", icon: ClipboardList },
  { href: "/admin/chat", key: "chatMonitor", icon: Inbox },
  { href: "/admin/chatbot", key: "chatbotLogs", icon: Bot },
  { href: "/admin/pipeline", key: "pipeline", icon: Kanban },
  { href: "/admin/crm-records", key: "crmRecords", icon: ContactRound },
  { href: "/admin/forecast", key: "forecast", icon: TrendingUp },
  { href: "/admin/email-templates", key: "emailTemplates", icon: Mail },
  { href: "/admin/crm", key: "crm", icon: UsersRound },
  { href: "/admin/quotes", key: "quotesList", icon: ClipboardList },
  { href: "/admin/contracts", key: "contractsDashboard", icon: FileSignature },
  { href: "/admin/contracts/new", key: "contractsNew", icon: FileText },
  { href: "/admin/quotes?tab=booking", key: "quotesBooking", icon: CalendarCheck },
  { href: "/admin/quotes/new", key: "quotesNew", icon: Calculator },
  { href: "/admin/quote-templates", key: "quoteTemplates", icon: FileText },
  { href: "/admin/campaigns", key: "campaigns", icon: Megaphone },
  { href: "/admin/calendar", key: "campaignCalendar", icon: CalendarCheck },
  { href: "/admin/community", key: "community", icon: MessageSquareText },
  { href: "/admin/plan-snapshots", key: "planSnapshots", icon: ClipboardList },
  { href: "/admin/applications", key: "mediaApplications", icon: ClipboardList },
  { href: "/admin/leads/media", key: "mediaLeads", icon: Radar },
  { href: "/admin/media-owner", key: "mediaOwnerOps", icon: CalendarCheck },
  { href: "/admin/reviews", key: "mediaReviews", icon: Star },
  { href: "/admin/medias", key: "medias", icon: Monitor },
  { href: "/admin/verification", key: "verification", icon: ShieldCheck },
  { href: "/admin/networks", key: "networks", icon: Share2 },
  { href: "/admin/media-hub", key: "mediaHub", icon: Database },
  { href: "/admin/users", key: "users", icon: UserCog },
  { href: "/admin/points", key: "points", icon: Gift },
  { href: "/admin/analytics", key: "analytics", icon: BarChart3 },
  { href: "/admin/funnel", key: "funnel", icon: BarChart3 },
  { href: "/admin/search-stats", key: "searchStats", icon: Search },
  { href: "/admin/recommendations", key: "recommendations", icon: Sparkles },
  { href: "/admin/api-usage", key: "apiUsage", icon: KeyRound },
  { href: "/admin/ai-usage", key: "aiUsage", icon: Coins },
  { href: "/admin/trust-metrics", key: "trustMetrics", icon: TrendingUp },
  { href: "/admin/ab-test", key: "abTest", icon: FlaskConical },
  { href: "/admin/reports/new", key: "trendReports", icon: FileText },
  { href: "/admin/academy/new", key: "academyNew", icon: Sparkles },
  { href: "/admin/content", key: "content", icon: FileText },
  { href: "/admin/content-seed", key: "contentSeed", icon: Sparkles },
  { href: "/admin/ai-content", key: "aiContent", icon: Sparkles },
  { href: "/admin/entitlements", key: "memberEntitlements", icon: Shield },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const quotesTab = searchParams.get("tab");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tNav = useTranslations("adminNav");

  const locale = pathname.split("/")[1] || "ko";
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  const navItemByKey = useMemo(() => {
    const map = new Map<
      AdminNavKey,
      {
        href: string;
        key: AdminNavKey;
        label: string;
        icon: LucideIcon;
        description?: string;
      }
    >();
    const quickDescKeys: Partial<Record<AdminNavKey, string>> = {
      medias: "mediasQuickDesc",
      quotesList: "quotesListQuickDesc",
      contractsDashboard: "contractsDashboardQuickDesc",
    };
    for (const n of navDefs) {
      const descKey = quickDescKeys[n.key];
      map.set(n.key, {
        href: n.href,
        key: n.key,
        icon: n.icon,
        label: tNav(n.key),
        description: descKey ? tNav(descKey) : undefined,
      });
    }
    return map;
  }, [tNav]);

  const navItems = useMemo(
    () => navDefs.map((n) => ({ ...n, label: tNav(n.key) })),
    [tNav],
  );

  const isActive = (href: string) => {
    if (href === "/admin") return pathWithoutLocale === "/admin";
    if (href === "/admin/contracts/new") {
      return pathWithoutLocale.startsWith("/admin/contracts/new");
    }
    if (href === "/admin/contracts") {
      return (
        pathWithoutLocale.startsWith("/admin/contracts") &&
        !pathWithoutLocale.startsWith("/admin/contracts/new")
      );
    }
    if (href === "/admin/quotes?tab=booking") {
      return pathWithoutLocale === "/admin/quotes" && quotesTab === "booking";
    }
    if (href === "/admin/quotes") {
      return (
        (pathWithoutLocale === "/admin/quotes" && quotesTab !== "booking") ||
        (pathWithoutLocale.startsWith("/admin/quotes/") &&
          !pathWithoutLocale.startsWith("/admin/quotes/new"))
      );
    }
    if (href === "/admin/medias/quick-add") {
      return pathWithoutLocale.startsWith("/admin/medias/quick-add");
    }
    if (href === "/admin/medias") {
      return (
        (pathWithoutLocale === "/admin/medias" ||
          (pathWithoutLocale.startsWith("/admin/medias/") &&
            !pathWithoutLocale.startsWith("/admin/medias/quick-add")) ||
          pathWithoutLocale === "/admin/media/new")
      );
    }
    if (href === "/admin/health") {
      return pathWithoutLocale.startsWith("/admin/health");
    }
    return pathWithoutLocale.startsWith(href);
  };

  const activeNavItem =
    navItems.find((n) => isActive(n.href)) ??
    navItems
      .filter((n) => pathWithoutLocale.startsWith(n.href) && n.href !== "/admin")
      .sort((a, b) => b.href.length - a.href.length)[0];

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
        <span className="rounded-2xl border border-border/60 bg-card/70 px-2 py-1 font-display text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground shadow-sm backdrop-blur">
          ADMIN
        </span>
      </div>

      <AdminShellNav
        locale={locale}
        isActive={isActive}
        navItemByKey={navItemByKey}
        tNav={tNav}
        onNavigate={() => setSidebarOpen(false)}
      />

      <div className="relative border-t border-border/60 p-3">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 rounded-[14px] border border-border/70 bg-card/60 px-3 py-2.5 font-display text-[12px] font-black uppercase tracking-[0.12em] text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
          {tNav("backToSite")}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard-root tkad-landing-neon tkad-planner-neon flex min-h-screen overflow-x-clip bg-background font-sans text-foreground">
      <aside className="hidden w-72 shrink-0 md:block">{sidebar}</aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-gray-500/50 backdrop-blur-md dark:bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative h-full w-72">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex h-14 min-w-0 items-center gap-3 border-b border-border/60 bg-card/70 px-4 backdrop-blur md:px-6">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] tkad-neon-grid" />
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-full border border-border/70 bg-card/70 p-2 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-display text-xs font-medium uppercase tracking-[0.18em]">
            {activeNavItem?.label ?? "관리자"}
          </h1>
          <ThemeToggle className="rounded-full border border-border/70 bg-card/70 shadow-sm backdrop-blur" />
          <SignOutButton locale={locale} label={tNav("signOut")} />
        </header>
        <main className="min-w-0 flex-1 overflow-x-clip overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
