"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/theme-toggle";
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
  ChevronDown,
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

type NavKey =
  | "dashboard"
  | "monitoring"
  | "launchMonitor"
  | "linkHealth"
  | "operatorManual"
  | "inquiries"
  | "biddings"
  | "chatMonitor"
  | "chatbotLogs"
  | "pipeline"
  | "crmRecords"
  | "forecast"
  | "emailTemplates"
  | "crm"
  | "quotesList"
  | "quotesBooking"
  | "quotesNew"
  | "quoteTemplates"
  | "campaigns"
  | "campaignCalendar"
  | "community"
  | "mediaApplications"
  | "mediaLeads"
  | "mediaOwnerOps"
  | "mediaReviews"
  | "medias"
  | "verification"
  | "networks"
  | "mediaHub"
  | "users"
  | "points"
  | "analytics"
  | "funnel"
  | "searchStats"
  | "recommendations"
  | "apiUsage"
  | "aiUsage"
  | "trustMetrics"
  | "abTest"
  | "trendReports"
  | "academyNew"
  | "content"
  | "contentSeed"
  | "aiContent"
  | "planSnapshots"
  | "memberEntitlements";

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
  { href: "/admin/quotes?tab=booking", key: "quotesBooking", icon: FileSignature },
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

type NavGroupId =
  | "dashboard"
  | "media"
  | "quotes"
  | "customers"
  | "content"
  | "marketing"
  | "settings";

const navGroupDefs: {
  id: NavGroupId;
  labelKey:
    | "groupDashboard"
    | "groupMedia"
    | "groupQuotes"
    | "groupCustomers"
    | "groupContent"
    | "groupMarketing"
    | "groupSettings";
  itemKeys: NavKey[];
}[] = [
  {
    id: "dashboard",
    labelKey: "groupDashboard",
    itemKeys: [
      "dashboard",
      "monitoring",
      "launchMonitor",
      "linkHealth",
      "analytics",
      "funnel",
    ],
  },
  {
    id: "media",
    labelKey: "groupMedia",
    itemKeys: [
      "medias",
      "mediaApplications",
      "mediaLeads",
      "mediaOwnerOps",
      "mediaReviews",
      "verification",
      "networks",
      "mediaHub",
    ],
  },
  {
    id: "quotes",
    labelKey: "groupQuotes",
    itemKeys: [
      "quotesList",
      "quotesBooking",
      "quotesNew",
      "quoteTemplates",
      "biddings",
      "campaigns",
      "campaignCalendar",
      "forecast",
    ],
  },
  {
    id: "customers",
    labelKey: "groupCustomers",
    itemKeys: [
      "inquiries",
      "chatMonitor",
      "chatbotLogs",
      "users",
      "pipeline",
      "crmRecords",
      "crm",
      "planSnapshots",
    ],
  },
  {
    id: "content",
    labelKey: "groupContent",
    itemKeys: [
      "trendReports",
      "academyNew",
      "content",
      "contentSeed",
      "aiContent",
      "community",
    ],
  },
  {
    id: "marketing",
    labelKey: "groupMarketing",
    itemKeys: [
      "points",
      "emailTemplates",
      "recommendations",
      "abTest",
      "searchStats",
    ],
  },
  {
    id: "settings",
    labelKey: "groupSettings",
    itemKeys: ["operatorManual", "memberEntitlements", "apiUsage", "aiUsage", "trustMetrics"],
  },
];

const navByKey = new Map(navDefs.map((n) => [n.key, n]));

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const quotesTab = searchParams.get("tab");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<
    Partial<Record<NavGroupId, boolean>>
  >({});
  const tNav = useTranslations("adminNav");

  const locale = pathname.split("/")[1] || "ko";
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  const navItems = useMemo(
    () => navDefs.map((n) => ({ ...n, label: tNav(n.key) })),
    [tNav],
  );

  const navItemByHref = useMemo(
    () => new Map(navItems.map((n) => [n.href, n])),
    [navItems],
  );

  const isActive = (href: string) => {
    if (href === "/admin") return pathWithoutLocale === "/admin";
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
    if (href === "/admin/medias") {
      return (
        pathWithoutLocale === "/admin/medias" ||
        pathWithoutLocale.startsWith("/admin/medias/") ||
        pathWithoutLocale === "/admin/media/new"
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

  const isGroupCollapsed = (id: NavGroupId) => collapsedGroups[id] === true;

  const toggleGroup = (id: NavGroupId) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [id]: !isGroupCollapsed(id),
    }));
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
        <span className="rounded-2xl border border-border/60 bg-card/70 px-2 py-1 font-display text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground shadow-sm backdrop-blur">
          ADMIN
        </span>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-2 py-3">
        {navGroupDefs.map((group, groupIndex) => {
          const items = group.itemKeys
            .map((key) => navByKey.get(key))
            .filter((n): n is NavDef => Boolean(n))
            .map((n) => ({
              ...n,
              label: navItemByHref.get(n.href)?.label ?? tNav(n.key),
            }));
          const open = !isGroupCollapsed(group.id);
          const groupHasActive = items.some((item) => isActive(item.href));

          return (
            <div
              key={group.id}
              className={groupIndex > 0 ? "mt-5" : undefined}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="flex w-full items-center justify-between rounded-md py-1.5 pl-3 pr-2 text-left"
                aria-expanded={open}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-white/30">
                  {tNav(group.labelKey)}
                </span>
                <ChevronDown
                  className={[
                    "h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform dark:text-white/30",
                    open ? "rotate-0" : "-rotate-90",
                    groupHasActive ? "text-violet-500 dark:text-violet-400" : "",
                  ].join(" ")}
                />
              </button>
              {open && (
                <ul className="mt-1.5 space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={`/${locale}${item.href}`}
                          onClick={() => setSidebarOpen(false)}
                          className={[
                            "flex items-center gap-2.5 rounded-r-md py-2 pl-3 pr-2 text-[13px] font-medium transition-colors",
                            active
                              ? "border-l-2 border-violet-500 bg-violet-50 text-violet-700 dark:bg-white/10 dark:text-white"
                              : "border-l-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                          ].join(" ")}
                        >
                          <Icon
                            className={[
                              "h-4 w-4 shrink-0",
                              active
                                ? "text-violet-600 dark:text-white/90"
                                : "text-muted-foreground",
                            ].join(" ")}
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

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
            className="absolute inset-0 dark:bg-black bg-white dark:bg-white/5 bg-gray-500/50 backdrop-blur-md"
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
