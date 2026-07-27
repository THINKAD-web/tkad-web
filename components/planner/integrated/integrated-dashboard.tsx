"use client";

import { useTranslations } from "next-intl";
import {
  BarChart3,
  MousePointerClick,
  Search,
  TrendingUp,
  Eye,
} from "lucide-react";
import type { IntegratedMixResponse } from "@/lib/integrated/schemas";
import type { IntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import { extractMixKpiView } from "@/lib/integrated/map-mix-to-ui";
import { IntegratedMixKpiStrip } from "@/components/planner/integrated/integrated-mix-kpi-strip";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  metrics: IntegratedCampaignMetrics;
  mix?: IntegratedMixResponse | null;
  isKo: boolean;
  months: number;
};

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  testId,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  sub?: string;
  testId?: string;
}) {
  return (
    <div className={cn(plannerNeon.card, "p-5")} data-testid={testId}>
      <Icon className="h-5 w-5 text-[color:var(--qp-accent)]" aria-hidden />
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-foreground dark:text-white">
        {value}
      </p>
      {sub ? (
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

function formatRange(
  min: number | null,
  max: number | null,
  locale: string,
): string {
  if (min == null && max == null) return "—";
  const lo = min ?? max!;
  const hi = max ?? min!;
  if (lo === hi) return lo.toLocaleString(locale);
  return `${lo.toLocaleString(locale)}–${hi.toLocaleString(locale)}`;
}

export function IntegratedCampaignDashboard({
  metrics,
  mix,
  isKo,
  months,
}: Props) {
  const t = useTranslations("plannerIntegrated");
  const locale = isKo ? "ko-KR" : "en-US";
  const mixKpis = mix ? extractMixKpiView(mix) : null;

  return (
    <div className="space-y-8">
      <div>
        <PlannerNeonLabel>{t("dashboardEyebrow")}</PlannerNeonLabel>
        <h2 className={cn("mt-2 text-2xl font-black", plannerNeon.headline)}>
          {t("dashboardTitle")}
        </h2>
        <p className={cn("mt-2 text-sm", plannerNeon.subtext)}>
          {t("dashboardDesc", { months })}
        </p>
      </div>

      {mixKpis ? <IntegratedMixKpiStrip kpis={mixKpis} isKo={isKo} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Eye}
          label={t("kpiOohImpressions")}
          value={(mixKpis?.oohCampaignImpressions ?? metrics.oohImpressions).toLocaleString(locale)}
          sub={
            metrics.oohCpmKrw
              ? `CPM ₩${metrics.oohCpmKrw.toLocaleString(locale)}`
              : undefined
          }
          testId="dashboard-kpi-ooh-impressions"
        />
        <KpiCard
          icon={Eye}
          label={t("kpiDigitalMonthlyImpressions")}
          value={
            mixKpis
              ? formatRange(
                  mixKpis.digitalMonthlyImpressionsMin,
                  mixKpis.digitalMonthlyImpressionsMax,
                  locale,
                )
              : metrics.digitalTotalImpressions.toLocaleString(locale)
          }
          testId="dashboard-kpi-digital-monthly-impressions"
        />
        <KpiCard
          icon={Eye}
          label={t("kpiCombinedImpressions")}
          value={
            mixKpis
              ? formatRange(
                  mixKpis.combinedImpressionsMin,
                  mixKpis.combinedImpressionsMax,
                  locale,
                )
              : "—"
          }
          testId="dashboard-kpi-combined-impressions"
        />
        <KpiCard
          icon={MousePointerClick}
          label={t("kpiDigitalClicks")}
          value={metrics.digitalTotalClicks.toLocaleString(locale)}
          sub={t("kpiDigitalClicksSub", {
            count: metrics.digitalChannels.length,
          })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          icon={Search}
          label={t("kpiBrandSearch")}
          value={`+${metrics.brandSearchChangePct}%`}
          sub={t("kpiBrandSearchSub", {
            during: metrics.brandSearchDuring.toLocaleString(locale),
          })}
        />
        <KpiCard
          icon={TrendingUp}
          label={t("kpiIntegratedRoas")}
          value={`${metrics.integratedRoasExpected}${isKo ? "배" : "×"}`}
          sub={t("kpiRoasRange", {
            min: metrics.integratedRoasConservative,
            max: metrics.integratedRoasOptimistic,
          })}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PlannerNeonCard>
          <div className={plannerNeon.cardHeader}>
            <PlannerNeonLabel>OOH</PlannerNeonLabel>
            <h3 className={cn("mt-2 font-bold", plannerNeon.headline)}>
              {t("oohPerformance")}
            </h3>
          </div>
          <dl className="grid grid-cols-2 gap-4 p-5 sm:p-6">
            <div>
              <dt className="text-xs text-muted-foreground">{t("budgetOoh")}</dt>
              <dd className="font-bold">
                {metrics.oohBudgetMan.toLocaleString(locale)}
                {isKo ? "만원" : "M KRW"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("reach")}</dt>
              <dd className="font-bold">
                {metrics.oohReach.toLocaleString(locale)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">
                {t("kpiOohImpressions")}
              </dt>
              <dd className="font-bold">
                {(mixKpis?.oohCampaignImpressions ?? metrics.oohImpressions).toLocaleString(locale)}
              </dd>
            </div>
          </dl>
        </PlannerNeonCard>

        <PlannerNeonCard>
          <div className={plannerNeon.cardHeader}>
            <PlannerNeonLabel>{t("digitalLabel")}</PlannerNeonLabel>
            <h3 className={cn("mt-2 font-bold", plannerNeon.headline)}>
              {t("digitalPerformance")}
            </h3>
          </div>
          <ul className="divide-y dark:divide-white/8 divide-gray-100">
            {metrics.digitalChannels.map((ch) => (
              <li
                key={ch.id}
                className="flex items-center justify-between gap-4 px-5 py-3 sm:px-6"
              >
                <div>
                  <p className="font-semibold text-sm">
                    {isKo ? ch.nameKo : ch.nameEn}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ch.estimatedClicks.toLocaleString(locale)}{" "}
                    {t("clicks")} · CPC ₩{ch.avgCpcWon.toLocaleString()}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-[color:var(--qp-fg-muted)]">
                  {ch.budgetMan.toLocaleString(locale)}
                  {isKo ? "만" : "M"}
                </p>
              </li>
            ))}
          </ul>
          {mixKpis ? (
            <p className="border-t dark:border-white/8 border-gray-100 px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
              {t("kpiDigitalMonthlyImpressions")}:{" "}
              {formatRange(
                mixKpis.digitalMonthlyImpressionsMin,
                mixKpis.digitalMonthlyImpressionsMax,
                locale,
              )}
            </p>
          ) : null}
          <p className="border-t dark:border-white/8 border-gray-100 px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
            {t("apiNote")}
          </p>
        </PlannerNeonCard>
      </div>

      <PlannerNeonCard className="border-emerald-400/20">
        <div className="flex items-start gap-3 p-5 sm:p-6">
          <BarChart3 className="h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="font-bold text-foreground dark:text-white">
              {t("synergySummary", {
                lift: metrics.synergyLiftMultiplier,
              })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("synergySummaryDesc")}
            </p>
          </div>
        </div>
      </PlannerNeonCard>
    </div>
  );
}
