import { setRequestLocale } from "next-intl/server";
import { MarketDashboardClient } from "@/components/insights/market-dashboard-client";
import { checkReportAccess } from "@/lib/report-access";
import { getCurrentUser } from "@/lib/user-session";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "OOH 시장 인사이트 · PRO" : "OOH market insights · PRO";
  const description = isKo
    ? "실시간 OOH 시장 KPI, 지역별 단가, 업종 집행, 매체 유형 효율 — THINKAD PRO 전용"
    : "Live OOH market KPIs, district pricing, industry mix — THINKAD PRO";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/insights/market"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/insights/market",
      image: { kind: "segment", segment: "insights" },
    }),
    robots: { index: false, follow: true },
  };
}

export default async function MarketInsightsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const user = await getCurrentUser();
  const access = await checkReportAccess(user?.id ?? null, "market_dashboard");

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <MarketDashboardClient isKo={isKo} access={access} />
    </main>
  );
}
