"use client";

/**
 * HeaderBrutal — b930b10 IA 메뉴 구조를 BrutalNav 로 렌더하는 래퍼.
 *
 * IA (변경 금지):
 *   - 단독: /, /services
 *   - 매체 검색 그룹 (4): /media, /media/map, /recommend, /planner
 *   - 트렌드 & 학습 그룹 (3): /cases, /report, /academy
 *   - CTA: /contact
 */

import { Suspense, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Globe } from "lucide-react";
import { BrutalNav, type BrutalNavEntry } from "@/components/brutalist";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { HeaderMediaSearch } from "@/components/header-media-search";
import { ThemeToggle } from "@/components/theme-toggle";
import type { NavContentStatus } from "@/lib/nav-content-status";

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

export function HeaderBrutal({ contentStatus }: Props) {
  const t = useTranslations();
  const comingSoonBadge = t("nav.comingSoonBadge");

  const links: BrutalNavEntry[] = [
    { href: "/", label: t("nav.home") },
    { href: "/services", label: t("nav.services") },
    {
      label: t("nav.media"),
      items: [
        { href: "/media", label: t("nav.media"), desc: "전국 OOH 매체 목록" },
        { href: "/media/map", label: "지도에서 찾기", desc: "위치 기반 탐색" },
        { href: "/recommend", label: t("nav.recommend"), desc: "AI 기반 추천" },
        { href: "/planner", label: t("nav.planner"), desc: "예산·기간별 플래닝" },
      ],
    },
    {
      label: t("nav.insights"),
      items: [
        { href: "/cases", label: t("nav.cases"), desc: "집행 사례 모음" },
        {
          href: "/report",
          label: t("nav.insights"),
          desc: t("nav.insightsReportDesc"),
          ...(contentStatus && contentStatus.reportCount === 0
            ? { badge: comingSoonBadge }
            : {}),
        },
        {
          href: "/academy",
          label: t("nav.academy"),
          desc: "광고주 교육 콘텐츠",
          ...(contentStatus && contentStatus.academyLessonCount === 0
            ? { badge: comingSoonBadge }
            : {}),
        },
      ],
    },
  ];

  return (
    <BrutalNav
      links={links}
      search={
        <Suspense
          fallback={
            <div
              className="h-10 w-full rounded-xl border-2 border-border/30 bg-muted/25 dark:border-white/10 dark:bg-white/5"
              aria-hidden
            />
          }
        >
          <HeaderMediaSearch />
        </Suspense>
      }
      cta={{ href: "/contact", label: t("nav.contact") }}
      extras={
        <>
          <HeaderUserMenu />
          <LanguageToggle />
          <ThemeToggle />
        </>
      }
    />
  );
}
