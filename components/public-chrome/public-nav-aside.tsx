"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PublicNavSidebar } from "@/components/navigation/public-nav-sidebar";
import { usePublicNavGroups } from "@/lib/navigation/use-public-nav-groups";

type Props = {
  className?: string;
};

/**
 * 데스크톱(lg+) 고정 사이드바 — 5개 메인 카테고리 아코디언 + 문의 CTA.
 */
export function PublicNavAside({ className }: Props) {
  const t = useTranslations();
  const groups = usePublicNavGroups();

  return (
    <aside
      className={cn(
        "tkad-public-nav-aside hidden lg:flex lg:w-[var(--tkad-nav-sidebar-width)] lg:shrink-0 lg:flex-col",
        "sticky top-0 z-40 h-[100dvh] border-r border-border/60 bg-background text-foreground",
        "dark:border-white/10 border-gray-200 dark:bg-[#05050a] dark:text-white text-gray-900",
        className,
      )}
      aria-label={t("nav.sidebarLabel")}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-border/60 px-5 dark:border-white/10 border-gray-200">
        <Link
          href="/"
          className="whitespace-nowrap text-[18px] font-black tracking-tight text-foreground dark:text-white text-gray-900"
        >
          <span className="font-black">THINK</span>
          <span className="tkad-home-accent-text font-black">AD</span>
        </Link>
      </div>

      <PublicNavSidebar
        groups={groups}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
        density="comfortable"
      />

      <div className="shrink-0 border-t border-border/60 p-4 dark:border-white/10 border-gray-200">
        <Link
          href="/contact"
          className="tkad-neon-cta-clean inline-flex h-11 w-full items-center justify-center rounded-xl px-4 font-mono text-[11px] font-black uppercase tracking-[0.2em] dark:text-white text-gray-900 transition-colors"
        >
          {t("nav.contact")}
        </Link>
      </div>
    </aside>
  );
}
