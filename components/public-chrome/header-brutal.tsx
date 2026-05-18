"use client";

/**
 * HeaderBrutal — OOH 플랫폼 리뉴얼 IA (5 메인 카테고리 · 2depth · BETA는 세부만).
 */

import { Suspense, useMemo, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Globe } from "lucide-react";
import { BrutalNav } from "@/components/brutalist";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { HeaderMediaSearch } from "@/components/header-media-search";
import { ThemeToggle } from "@/components/theme-toggle";
import type { NavContentStatus } from "@/lib/nav-content-status";
import { buildPublicNavGroups } from "@/lib/navigation/build-public-nav";

function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const next = locale === "ko" ? "en" : "ko";
  const label = next === "ko" ? "한국어" : "English";

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(() => {
          if (pathname == null || pathname === "") return;
          router.replace(pathname, { locale: next });
        })
      }
      disabled={isPending}
      aria-label={locale === "ko" ? "Switch to English" : "한국어로 전환"}
      title={label}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border/25 bg-muted text-foreground transition-all duration-300 hover:border-hermes hover:bg-foreground hover:text-white hover:shadow-[0_0_28px_rgba(255,98,0,0.35)] disabled:opacity-50 dark:border-white/15 dark:bg-muted dark:text-foreground dark:hover:border-hermes dark:hover:bg-hermes dark:hover:text-white dark:hover:shadow-[0_0_32px_rgba(255,98,0,0.45)]"
    >
      <Globe className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

type Props = {
  contentStatus?: NavContentStatus;
};

export function HeaderBrutal({ contentStatus: _contentStatus }: Props) {
  const t = useTranslations();
  const navGroups = useMemo(() => buildPublicNavGroups(t), [t]);

  return (
    <BrutalNav
      sidebarLayout
      links={navGroups}
      search={
        <Suspense
          fallback={
            <div
              className="h-10 min-w-0 w-full rounded-xl border-2 border-border/30 bg-muted/25 dark:border-white/10 dark:bg-white/5"
              aria-hidden
            />
          }
        >
          <HeaderMediaSearch />
        </Suspense>
      }
      cta={{ href: "/contact", label: t("nav.contact") }}
      extras={
        <div className="hidden items-center gap-1.5 md:flex">
          <HeaderUserMenu />
          <LanguageToggle />
          <ThemeToggle />
        </div>
      }
      mobileBarExtras={
        <>
          <LanguageToggle />
          <ThemeToggle />
        </>
      }
      mobileMenuExtras={(close) => <HeaderUserMenu variant="menu" onNavigate={close} />}
      mobileMenuFooter={
        <>
          <LanguageToggle />
          <ThemeToggle />
        </>
      }
    />
  );
}
