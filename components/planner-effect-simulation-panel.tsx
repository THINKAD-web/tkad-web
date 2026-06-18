"use client";

import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  budgetSplitByCategory,
  computeAdvancedPlannerMetrics,
  formatPlannerSharePct,
  type BudgetPieSlice,
} from "@/lib/planner-logic";
import type { MediaItem } from "@/lib/media-data";
import {
  formatCpmKrw,
  formatMediaPriceCompactWon,
} from "@/lib/media-price-format";
import { cn } from "@/lib/utils";
import { useIsPro } from "@/hooks/use-is-pro";
import {
  PLANNER_CHART_COLORS,
  PlannerNeonCard,
  PlannerNeonLabel,
  PlannerProGate,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";

const PIE_COLORS = [
  PLANNER_CHART_COLORS.violet,
  PLANNER_CHART_COLORS.cyan,
  PLANNER_CHART_COLORS.pink,
  PLANNER_CHART_COLORS.indigo,
  "#f43f5e",
  "#0ea5e9",
];

type Props = {
  isKo: boolean;
  portfolio: MediaItem[];
  budgetMan: number;
  months: number;
  totalImpressionsFromMetrics?: number | null;
  /** 외부 PlannerProGate로 감쌀 때 내부 게이트 비활성화 */
  skipProGate?: boolean;
  /** metrics: Reach/Freq/CPM/OTS만, budget: 예산 도넛만, full: 전체 */
  variant?: "full" | "metrics-only" | "budget-only";
};

export function PlannerEffectSimulationPanel({
  isKo,
  portfolio,
  budgetMan,
  months,
  totalImpressionsFromMetrics,
  skipProGate = false,
  variant = "full",
}: Props) {
  const { isPro, loading: proLoading } = useIsPro();

  const advanced = useMemo(
    () =>
      computeAdvancedPlannerMetrics({
        portfolio,
        budgetMan,
        months,
      }),
    [portfolio, budgetMan, months],
  );

  const budgetSlices: BudgetPieSlice[] = useMemo(
    () => budgetSplitByCategory(portfolio),
    [portfolio],
  );

  const pieData = useMemo(
    () =>
      budgetSlices.map((s) => ({
        key: s.key,
        label: isKo ? s.labelKo : s.labelEn,
        value: s.value,
        actualWon: s.actualWon,
        pct: s.pct,
      })),
    [budgetSlices, isKo],
  );

  if (!advanced) return null;

  const heroImpressions =
    totalImpressionsFromMetrics ?? advanced.totalImpressions;
  const localeTag = isKo ? "ko-KR" : "en-US";

  const metricsBlock = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        {
          label: isKo ? "평균 빈도" : "Avg Frequency",
          value: `${advanced.avgFrequency.toFixed(1)}${isKo ? "회" : "×"}`,
          hint: isKo ? "1인당 평균 노출" : "Exposures per person",
        },
        {
          label: "CPM",
          value: formatCpmKrw(advanced.cpmKrw ?? 0, localeTag),
          hint: isKo ? "천회당 비용 (원)" : "Cost per 1,000 imp.",
        },
        {
          label: "OTS",
          value: advanced.totalOts.toLocaleString(localeTag),
          hint: isKo ? "가시성 가중 노출" : "Visibility-weighted",
        },
        {
          label: isKo ? "총 도달" : "Total Reach",
          value: advanced.uniqueReach.toLocaleString(localeTag),
          hint: isKo ? "중복 제거 추정" : "De-duplicated est.",
        },
      ].map((tile) => (
        <div key={tile.label} className={plannerNeon.kpiCard}>
          <p className={plannerNeon.kpiLabel}>{tile.label}</p>
          <p className={cn("mt-1", plannerNeon.kpiValue)}>{tile.value}</p>
          <p className={cn("mt-1", plannerNeon.kpiLabel)}>{tile.hint}</p>
        </div>
      ))}
    </div>
  );

  const budgetBlock =
    pieData.length > 0 ? (
      <PlannerNeonCard>
        <div className={plannerNeon.cardHeader}>
          <PlannerNeonLabel>
            {isKo ? "예산 배분" : "Budget Split"}
          </PlannerNeonLabel>
          <p className={cn("mt-1", plannerNeon.subtext)}>
            {isKo
              ? "포트폴리오 매체 단가(원) 비중"
              : "Share of portfolio unit prices (KRW)"}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[1.3fr,1fr]">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="transparent"
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`pie-${entry.key}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(10,10,15,0.92)",
                    color: "#fff",
                  }}
                  formatter={(value: number, _name: string, item) => {
                    const payload = item?.payload as {
                      pct?: number;
                      actualWon?: number;
                    };
                    const won = payload?.actualWon ?? value;
                    const pct = payload?.pct;
                    return [
                      `${formatMediaPriceCompactWon(won, localeTag)}${pct != null ? ` (${formatPlannerSharePct(pct)})` : ""}`,
                      "",
                    ];
                  }}
                />
                <Legend verticalAlign="bottom" height={32} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="divide-y dark:divide-white/10 divide-gray-100">
            {pieData.map((s, i) => (
              <li
                key={s.key}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                  }}
                />
                <span className="min-w-0 flex-1 dark:text-white/80 text-gray-700">
                  {s.label}
                </span>
                <span className="shrink-0 tabular-nums dark:text-white/50 text-gray-500">
                  {formatMediaPriceCompactWon(s.actualWon || s.value, localeTag)}
                </span>
                <span className="w-12 shrink-0 text-right font-semibold tabular-nums dark:text-white text-gray-900">
                  {formatPlannerSharePct(s.pct)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </PlannerNeonCard>
    ) : null;

  const perMediaBlock = (
    <PlannerNeonCard>
      <div className={plannerNeon.cardHeader}>
        <PlannerNeonLabel>
          {isKo ? "매체별 노출·OTS·CPM" : "Per-Media Metrics"}
        </PlannerNeonLabel>
      </div>
      <div className="overflow-x-auto p-4 sm:p-5">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b dark:border-white/10 border-gray-100 dark:text-white/40 text-gray-400">
              <th className="px-2 py-2 text-xs uppercase tracking-wider">
                {isKo ? "매체" : "Media"}
              </th>
              <th className="px-2 py-2 text-xs uppercase tracking-wider">
                {isKo ? "유형" : "Type"}
              </th>
              <th className="px-2 py-2 text-right text-xs uppercase tracking-wider">
                {isKo ? "총 노출" : "Imp"}
              </th>
              <th className="px-2 py-2 text-right text-xs uppercase tracking-wider">
                OTS
              </th>
              <th className="px-2 py-2 text-right text-xs uppercase tracking-wider">
                CPM
              </th>
            </tr>
          </thead>
          <tbody>
            {advanced.perMedia.map((row) => (
              <tr
                key={row.id}
                className="border-b dark:border-white/5 border-gray-50 dark:text-white/80 text-gray-700"
              >
                <td className="max-w-[10rem] truncate px-2 py-2 font-medium">
                  {row.name}
                </td>
                <td className="px-2 py-2">{row.type}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {row.totalImpressions.toLocaleString(localeTag)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {row.ots.toLocaleString(localeTag)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {row.cpmKrw != null
                    ? formatCpmKrw(row.cpmKrw, localeTag)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold dark:text-white text-gray-900">
              <td className="px-2 py-2" colSpan={4}>
                {isKo ? "포트폴리오 CPM" : "Portfolio CPM"}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">
                {advanced.cpmKrw != null
                  ? formatCpmKrw(advanced.cpmKrw, localeTag)
                  : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </PlannerNeonCard>
  );

  const proDetail = (
    <div className="space-y-6">
      {(variant === "full" || variant === "metrics-only") && metricsBlock}
      {(variant === "full" || variant === "budget-only") && budgetBlock}
      {variant === "full" ? perMediaBlock : null}
    </div>
  );

  if (variant === "budget-only" && !budgetBlock) return null;
  if (variant === "metrics-only") {
    return (
      <PlannerNeonCard>
        <div className={plannerNeon.cardHeader}>
          <PlannerNeonLabel>
            {isKo ? "효과 시뮬레이션" : "Effect Simulation"}
          </PlannerNeonLabel>
          <h3 className={cn("mt-2 text-lg", plannerNeon.headline)}>
            {isKo ? "도달 · 빈도 · CPM · OTS" : "Reach · Frequency · CPM · OTS"}
          </h3>
        </div>
        <div className="p-5 sm:p-6">{proDetail}</div>
      </PlannerNeonCard>
    );
  }

  if (variant === "budget-only") {
    return budgetBlock;
  }

  return (
    <PlannerNeonCard>
      <div className={plannerNeon.cardHeader}>
        <PlannerNeonLabel>
          {isKo ? "효과 시뮬레이션" : "Effect Simulation"}
        </PlannerNeonLabel>
        <h3 className={cn("mt-2 text-lg", plannerNeon.headline)}>
          {isKo
            ? "도달 · 빈도 · CPM · OTS"
            : "Reach · Frequency · CPM · OTS"}
        </h3>
        <p className={cn("mt-1", plannerNeon.subtext)}>
          {isKo
            ? `${heroImpressions.toLocaleString("ko-KR")}회 추정 노출 기준. 실제 결과는 매체·집행 환경에 따라 달라질 수 있습니다.`
            : `Based on ~${heroImpressions.toLocaleString("en-US")} estimated impressions.`}
        </p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {/* 기본 KPI — FREE 포함 공개 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={plannerNeon.kpiCard}>
            <p className={plannerNeon.kpiLabel}>
              {isKo ? "총 노출수" : "Total Impressions"}
            </p>
            <p className={cn("mt-1", plannerNeon.kpiValue)}>
              {heroImpressions.toLocaleString(localeTag)}
            </p>
          </div>
          <div className={plannerNeon.kpiCard}>
            <p className={plannerNeon.kpiLabel}>
              {isKo ? "예상 도달 (Reach)" : "Est. Reach"}
            </p>
            <p className={cn("mt-1", plannerNeon.kpiValue)}>
              {advanced.uniqueReach.toLocaleString(localeTag)}
            </p>
          </div>
        </div>

        {/* 상세 시뮬레이션 — PRO / PRO_TRIAL */}
        {!proLoading ? (
          skipProGate ? (
            proDetail
          ) : (
          <PlannerProGate isPro={isPro} isKo={isKo}>
            {proDetail}
          </PlannerProGate>
          )
        ) : null}
      </div>
    </PlannerNeonCard>
  );
}
