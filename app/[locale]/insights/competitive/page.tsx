import { setRequestLocale } from "next-intl/server";
import { CompetitiveDashboardClient } from "@/components/insights/competitive-dashboard-client";
import { checkReportAccess } from "@/lib/report-access";
import { getCurrentUser } from "@/lib/user-session";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { buildCompetitiveDashboardTeaser } from "@/lib/insights/competitive-dashboard-data";
import { pageAlternates } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  return {
    title: isKo ? "OOH 경쟁 분석 · PRO" : "OOH competitive intel · PRO",
    description: isKo
      ? "업종별·지역별 OOH 집행 현황, 시즌 트렌드 히트맵 — THINKAD PRO 전용"
      : "Industry & region OOH flight intel, seasonal heatmap — THINKAD PRO",
    alternates: pageAlternates(locale, "/insights/competitive"),
    robots: { index: false, follow: true },
  };
}

export default async function CompetitiveInsightsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const user = await getCurrentUser();
  const access = await checkReportAccess(user?.id ?? null, "competitor");
  const teaser = await buildCompetitiveDashboardTeaser({ isKo });

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <CompetitiveDashboardClient
            isKo={isKo}
            access={access}
            teaser={teaser}
          />
        </main>
      </div>
    </HomeLandingDayNight>
  );
}
