"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
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
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

const navDefs = [
  { href: "/admin", key: "dashboard" as const, icon: LayoutDashboard },
  { href: "/admin/inquiries", key: "inquiries" as const, icon: MessageSquareText },
  { href: "/admin/campaigns", key: "campaigns" as const, icon: Megaphone },
  { href: "/admin/crm-records", key: "crmRecords" as const, icon: ContactRound },
  { href: "/admin/crm", key: "crm" as const, icon: UsersRound },
  { href: "/admin/medias", key: "medias" as const, icon: Monitor },
  { href: "/admin/verification", key: "verification" as const, icon: ShieldCheck },
  { href: "/admin/users", key: "users" as const, icon: UserCog },
  { href: "/admin/networks", key: "networks" as const, icon: Share2 },
  { href: "/admin/media-hub", key: "mediaHub" as const, icon: Database },
  { href: "/admin/quote-templates", key: "quoteTemplates" as const, icon: FileText },
  { href: "/admin/quotes", key: "quotesList" as const, icon: ClipboardList },
  { href: "/admin/quotes/new", key: "quotesNew" as const, icon: Calculator },
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
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <span className="text-lg font-extrabold tracking-tight">
          THINK<span className="text-gold">AD</span>
        </span>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-gold">
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
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/15 text-gold"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {tNav("backToSite")}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 shrink-0 md:block">{sidebar}</aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative h-full w-60">{sidebar}</div>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-white px-4 md:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 hover:bg-slate-100 md:hidden"
          >
            <Menu className="h-5 w-5 text-navy" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
            {navItems.find((n) => isActive(n.href))?.label ?? "관리자"}
          </h1>
          <SignOutButton locale={locale} label={tNav("signOut")} />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
