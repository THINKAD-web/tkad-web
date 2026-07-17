"use client";

import { useTranslations } from "next-intl";
import {
  BarChart3,
  MousePointerClick,
  Search,
  TrendingUp,
  Eye,
} from "lucide-react";
import type { IntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  metrics: IntegratedCampaignMetrics;
  isKo: boolean;
  months: number;
};

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className={cn(plannerNeon.card, "p-5")}>
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

export function IntegratedCampaignDashboard({ metrics, isKo, months }: Props) {
  const t = useTranslations("plannerIntegrated");

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Eye}
          label={t("kpiOohImpressions")}
          value={metrics.oohImpressions.toLocaleString(isKo ? "ko-KR" : "en-US")}
          sub={
            metrics.oohCpmKrw
              ? `CPM ₩${metrics.oohCpmKrw.toLocaleString(isKo ? "ko-KR" : "en-US")}`
              : undefined
          }
        />
        <KpiCard
          icon={MousePointerClick}
          label={t("kpiDigitalClicks")}
          value={metrics.digitalTotalClicks.toLocaleString(isKo ? "ko-KR" : "en-US")}
          sub={t("kpiDigitalClicksSub", {
            count: metrics.digitalChannels.length,
          })}
        />
        <KpiCard
          icon={Search}
          label={t("kpiBrandSearch")}
          value={`+${metrics.brandSearchChangePct}%`}
          sub={t("kpiBrandSearchSub", {
            during: metrics.brandSearchDuring.toLocaleString(isKo ? "ko-KR" : "en-US"),
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
                {metrics.oohBudgetMan.toLocaleString(isKo ? "ko-KR" : "en-US")}
                {isKo ? "만원" : "M KRW"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("reach")}</dt>
              <dd className="font-bold">
                {metrics.oohReach.toLocaleString(isKo ? "ko-KR" : "en-US")}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">{t("impressions")}</dt>
              <dd className="font-bold">
                {metrics.oohImpressions.toLocaleString(isKo ? "ko-KR" : "en-US")}
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
                    {ch.estimatedClicks.toLocaleString(isKo ? "ko-KR" : "en-US")}{" "}
                    {t("clicks")} · CPC ₩{ch.avgCpcWon.toLocaleString()}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-[color:var(--qp-fg-muted)]">
                  {ch.budgetMan.toLocaleString(isKo ? "ko-KR" : "en-US")}
                  {isKo ? "만" : "M"}
                </p>
              </li>
            ))}
          </ul>
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
