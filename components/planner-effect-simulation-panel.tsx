"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
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
  type BudgetPieSlice,
} from "@/lib/planner-logic";
import type { MediaItem } from "@/lib/media-data";

/**
 * 플래너 결과 화면(Step 6 보고서) — Reach / Frequency / CPM / OTS KPI + 예산 배분 파이.
 *
 * 매체별 Reach·Frequency 는 `computeAdvancedPlannerMetrics()` 의 region-saturation 모형 결과를 사용.
 * Pie 는 recharts (다른 차트들과 일관). 색은 네온 팔레트 보라 / 시안 / 핑크 / 인디고 회전.
 */
const PIE_COLORS = ["#a855f7", "#22d3ee", "#ec4899", "#7c3aed", "#0ea5e9", "#f43f5e"];

type Props = {
  isKo: boolean;
  portfolio: MediaItem[];
  budgetMan: number;
  months: number;
  /** 단순 노출 합계 (보고서 타 부분과 같은 값) — 중복 카드 표기를 막기 위해 받아옴 */
  totalImpressionsFromMetrics?: number | null;
};

export function PlannerEffectSimulationPanel({
  isKo,
  portfolio,
  budgetMan,
  months,
  totalImpressionsFromMetrics,
}: Props) {
  const t = useTranslations("planner");

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
        pct: s.pct,
      })),
    [budgetSlices, isKo],
  );

  if (!advanced) return null;

  const heroImpressions =
    totalImpressionsFromMetrics ?? advanced.totalImpressions;

  const tiles = [
    {
      key: "reach",
      label: isKo ? "총 도달 (Reach)" : "Total Reach",
      value: advanced.uniqueReach.toLocaleString("ko-KR"),
      hint: isKo
        ? "지역별 중복 제거 추정 인원"
        : "Region-saturated unique audience",
      tone: "primary" as const,
    },
    {
      key: "frequency",
      label: isKo ? "평균 빈도 (Frequency)" : "Avg Frequency",
      value: `${advanced.avgFrequency.toFixed(1)}회`,
      hint: isKo
        ? "1인당 평균 노출 횟수"
        : "Average exposures per reached person",
      tone: "default" as const,
    },
    {
      key: "cpm",
      label: isKo ? "CPM (1,000회 노출)" : "CPM (per 1,000)",
      value: advanced.cpmKrw != null ? `₩${advanced.cpmKrw.toLocaleString("ko-KR")}` : "—",
      hint: isKo ? "총 비용 ÷ (총 노출 / 1,000)" : "Budget ÷ (Imp / 1,000)",
      tone: "default" as const,
    },
    {
      key: "ots",
      label: isKo ? "OTS (실질 노출 기회)" : "OTS",
      value: advanced.totalOts.toLocaleString("ko-KR"),
      hint: isKo
        ? "가시성 점수 가중 노출 합계"
        : "Visibility-weighted impressions",
      tone: "accent" as const,
    },
  ];

  return (
    <div className="border-2 border-bx-black bg-bx-white">
      <div className="border-b-2 border-bx-black p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          [ {isKo ? "효과 시뮬레이션" : "Effect Simulation"} ]
        </p>
        <h3 className="mt-2 text-lg font-bold tracking-tight text-bx-black">
          {isKo
            ? "도달 · 빈도 · CPM · OTS"
            : "Reach · Frequency · CPM · OTS"}
        </h3>
        <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
          {isKo
            ? `${heroImpressions.toLocaleString("ko-KR")}회 추정 노출 기준의 시뮬레이션입니다. 실제 결과는 매체사 협의·집행 환경에 따라 달라질 수 있습니다.`
            : `Simulation based on ~${heroImpressions.toLocaleString("en-US")} estimated impressions. Actuals depend on media operator and execution context.`}
        </p>
      </div>

      <div className="space-y-6 p-5">
        {/* KPI 4 tiles */}
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div
              key={tile.key}
              className={`-mt-[2px] -ml-[2px] border-2 border-bx-black p-4 ${
                tile.tone === "accent"
                  ? "bg-bx-black text-bx-white"
                  : "bg-bx-white"
              }`}
            >
              <p
                className={`font-mono text-[10px] font-bold uppercase tracking-[0.22em] ${
                  tile.tone === "accent"
                    ? "text-bx-accent"
                    : "text-bx-gray-dim"
                }`}
              >
                [ {tile.label} ]
              </p>
              <p
                className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
                  tile.tone === "accent"
                    ? "text-bx-accent"
                    : tile.tone === "primary"
                      ? "text-bx-accent"
                      : "text-bx-black"
                }`}
              >
                {tile.value}
              </p>
              <p
                className={`mt-1 font-mono text-[10px] tracking-tight ${
                  tile.tone === "accent"
                    ? "text-bx-white/65"
                    : "text-bx-gray-dim"
                }`}
              >
                {tile.hint}
              </p>
            </div>
          ))}
        </div>

        {/* 매체 유형별 예산 배분 — recharts Pie */}
        {pieData.length > 0 ? (
          <div className="border-2 border-bx-black bg-bx-white">
            <div className="border-b-2 border-bx-black p-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ {isKo ? "매체 유형별 예산 배분" : "Budget Split by Media Type"} ]
              </p>
              <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
                {isKo
                  ? "포트폴리오에 포함된 매체의 단가 합계 비중입니다."
                  : "Share of recommended unit prices by media type."}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.3fr,1fr]">
              <div className="border-r-2 border-bx-black/10 p-3 sm:p-5">
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
                        stroke="#0a0a0c"
                        strokeWidth={2}
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
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          fontSize: 11,
                          letterSpacing: "0.04em",
                          background: "#ffffff",
                          border: "2px solid #0a0a0c",
                          borderRadius: 0,
                        }}
                        formatter={(value: number, _name: string, item) => {
                          const pct = (item?.payload as { pct?: number } | undefined)?.pct;
                          return [
                            `${value.toLocaleString("ko-KR")}만원${pct != null ? ` (${pct}%)` : ""}`,
                            "",
                          ];
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={32}
                        iconType="square"
                        wrapperStyle={{
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          fontSize: 11,
                          letterSpacing: "0.04em",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <ul className="-ml-[2px] divide-y-2 divide-bx-black/10 border-l-2 border-transparent lg:border-bx-black">
                {pieData.map((s, i) => (
                  <li
                    key={s.key}
                    className="flex items-center gap-3 px-4 py-3 font-mono text-[11px]"
                  >
                    <span
                      aria-hidden
                      className="h-3 w-3 shrink-0 border-2 border-bx-black"
                      style={{
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                    <span className="min-w-0 flex-1 text-bx-black">{s.label}</span>
                    <span className="shrink-0 text-bx-gray-dim">
                      {s.value.toLocaleString("ko-KR")}만
                    </span>
                    <span className="w-12 shrink-0 text-right font-bold tabular-nums text-bx-black">
                      {s.pct}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {/* 매체별 시뮬레이션 표 — 추천 사유의 수치 근거 */}
        <div className="border-2 border-bx-black bg-bx-white">
          <div className="border-b-2 border-bx-black p-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              [ {isKo ? "매체별 노출·OTS·CPM" : "Per-Media Impressions / OTS / CPM"} ]
            </p>
            <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
              {isKo
                ? "AI 추천의 수치 근거 — 일평균 유동인구·가시성·단가를 그대로 반영합니다."
                : "Numeric grounding for the AI recommendation."}
            </p>
          </div>
          <div className="overflow-x-auto p-3 sm:p-5">
            <table className="w-full min-w-[36rem] border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b-2 border-bx-black bg-bx-white text-bx-gray-dim">
                  <th className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.16em]">
                    {isKo ? "매체" : "Media"}
                  </th>
                  <th className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.16em]">
                    {isKo ? "유형" : "Type"}
                  </th>
                  <th className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-[0.16em]">
                    {isKo ? "총 노출" : "Imp"}
                  </th>
                  <th className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-[0.16em]">
                    {isKo ? "가시성" : "Visibility"}
                  </th>
                  <th className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-[0.16em]">
                    OTS
                  </th>
                  <th className="px-2 py-2 text-right font-mono text-[10px] uppercase tracking-[0.16em]">
                    CPM
                  </th>
                </tr>
              </thead>
              <tbody>
                {advanced.perMedia.map((row) => (
                  <tr key={row.id} className="border-b border-bx-black/10">
                    <td className="max-w-[14rem] truncate px-2 py-2 font-bold text-bx-black">
                      {row.name}
                    </td>
                    <td className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-bx-gray-dim">
                      {row.type}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-bx-black">
                      {row.totalImpressions.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-bx-gray-dim">
                      {(row.visibilityNorm * 100).toFixed(0)}/100
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-bx-black">
                      {row.ots.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-bx-gray-dim">
                      {row.cpmKrw != null
                        ? `₩${row.cpmKrw.toLocaleString("ko-KR")}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-bx-black font-bold">
                  <td colSpan={2} className="px-2 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-bx-gray-dim">
                    {isKo ? "합계" : "Total"}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums text-bx-accent">
                    {advanced.totalImpressions.toLocaleString("ko-KR")}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums text-bx-gray-dim">
                    —
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums text-bx-accent">
                    {advanced.totalOts.toLocaleString("ko-KR")}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums text-bx-accent">
                    {advanced.cpmKrw != null
                      ? `₩${advanced.cpmKrw.toLocaleString("ko-KR")}`
                      : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim">
          {`// `}
          {t("reportSummaryDisclaimerShort")}
        </p>
      </div>
    </div>
  );
}
