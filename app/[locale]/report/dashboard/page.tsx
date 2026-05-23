import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { Link } from "@/i18n/navigation";
import { ReportDashboardClient } from "@/components/report/report-dashboard-client";
import { CategoryHeroBetaBadge } from "@/components/category-explore-hero";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  return {
    title: isKo
      ? "OOH 트렌드 대시보드 | THINKAD"
      : "OOH Trend Dashboard | THINKAD",
    description: isKo
      ? "이번 달 인기 매체, 매체 유형 비중, 신규 등록 매체, 평균 CPM 트렌드를 한눈에."
      : "Top media, type share, new listings and CPM trend at a glance.",
  };
}

export default async function ReportDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b-2 border-black bg-hero-void py-12 sm:py-14">
        <div className="ui-container">
          <p className="flex flex-wrap items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-[#FF6600]">
            <span>[ Report ] / Dashboard // ooh activity</span>
            <CategoryHeroBetaBadge />
          </p>
          <h1 className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-hero-fg sm:text-4xl">
            {isKo ? "OOH 트렌드 대시보드" : "OOH Trend Dashboard"}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-hero-fg/85">
            {isKo
              ? "본 대시보드는 싱커드 자체 데이터를 기반으로 매월 갱신됩니다. 매체사·광고주·대행사 모두를 위한 인사이트입니다."
              : "Updated monthly from THINKAD’s own data — for advertisers, media owners, and agencies."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/report"
              className="inline-flex items-center gap-1.5 border-2 border-foreground bg-card px-3 py-1.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              ← {isKo ? "리포트 아카이브" : "Report archive"}
            </Link>
            <Link
              href="/insights/market"
              className="inline-flex items-center gap-1.5 border-2 border-[#FF6600] bg-[#FF6600]/10 px-3 py-1.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-[#FF6600] transition-colors hover:bg-[#FF6600] hover:dark:text-white text-gray-900"
            >
              PRO · {isKo ? "시장 인사이트" : "Market insights"} →
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <ReportDashboardClient isKo={isKo} />
      </section>
    </div>
  );
}
