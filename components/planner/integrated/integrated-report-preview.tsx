"use client";

import { forwardRef, useMemo } from "react";
import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { IntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import type { DigitalRecommendResult } from "@/lib/planner/recommend-digital";
import { computeIntegratedProInsights } from "@/lib/planner/integrated-report-insights";
import { IntegratedProBlindSection } from "@/components/planner/integrated/integrated-pro-blind-section";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  isPro: boolean;
  goalTitle: string;
  goal: PlannerCampaignGoal | null;
  budgetNum: number;
  periodDisplay: string;
  regionsText: string;
  portfolio: MediaItem[];
  digitalResult: DigitalRecommendResult;
  metrics: IntegratedCampaignMetrics;
  generatedAt: string;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">
      {children}
    </h2>
  );
}

const IntegratedReportPreview = forwardRef<HTMLDivElement, Props>(
  function IntegratedReportPreview(props, ref) {
    const {
      isKo,
      isPro,
      goalTitle,
      goal,
      budgetNum,
      periodDisplay,
      regionsText,
      portfolio,
      digitalResult,
      metrics,
      generatedAt,
    } = props;

    const proInsights = useMemo(
      () =>
        computeIntegratedProInsights({
          portfolio,
          metrics,
          digitalResult,
          goal,
          isKo,
        }),
      [portfolio, metrics, digitalResult, goal, isKo],
    );

    const digitalPctLabel = digitalResult.digitalBudgetPct;

    return (
      <div
        ref={ref}
        id="integrated-planner-report-content"
        className={cn(
          "box-border w-full max-w-[240mm] space-y-8 rounded-2xl border p-6 antialiased",
          "border-gray-200 bg-white text-gray-900",
          "dark:border-white/10 dark:bg-white/5 dark:text-gray-100",
        )}
      >
        <div className="tkad-planner-dark-surface rounded-xl bg-gradient-to-br from-violet-950/90 via-[#0a0a12] to-cyan-950/80 p-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
            THINKAD Integrated Campaign
          </p>
          <h1 className="mt-3 text-2xl font-black">
            {isKo ? "OOH + 디지털 통합 제안서" : "OOH + Digital Integrated Proposal"}
          </h1>
          <p className="mt-2 text-sm text-white/70">{generatedAt}</p>
        </div>

        {/* A — OOH 기본 (공개) */}
        <section>
          <SectionTitle>
            {isKo ? "A. OOH 매체 기본 정보" : "A. OOH media overview"}
          </SectionTitle>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">{isKo ? "목표" : "Goal"}</dt>
              <dd className="font-semibold">{goalTitle}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{isKo ? "지역" : "Regions"}</dt>
              <dd className="font-semibold">{regionsText}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{isKo ? "총 OOH 예산" : "OOH budget"}</dt>
              <dd className="font-semibold">
                {metrics.oohBudgetMan.toLocaleString()}
                {isKo ? "만원" : "M KRW"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">{isKo ? "집행 기간" : "Flight"}</dt>
              <dd className="font-semibold">{periodDisplay}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-500">{isKo ? "총 캠페인 예산" : "Total budget"}</dt>
              <dd className="font-semibold">
                {budgetNum.toLocaleString()}
                {isKo ? "만원" : "M KRW"}
              </dd>
            </div>
          </dl>
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
                <th className="p-2">{isKo ? "매체" : "Media"}</th>
                <th className="p-2">{isKo ? "지역" : "Region"}</th>
                <th className="p-2">{isKo ? "유형" : "Type"}</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((m) => (
                <tr key={m.id} className="border-b dark:border-white/10">
                  <td className="p-2 font-medium">{m.name}</td>
                  <td className="p-2">{m.region ?? "—"}</td>
                  <td className="p-2">{m.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* B — 디지털 배분 (공개) */}
        <section>
          <SectionTitle>
            {isKo ? "B. 디지털 예산 배분" : "B. Digital budget allocation"}
          </SectionTitle>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isKo
              ? `총 디지털 예산 추천: OOH 대비 ${digitalPctLabel}% (${digitalResult.totalDigitalBudgetMan.toLocaleString()}만원)`
              : `Suggested digital share: ${digitalPctLabel}% of total (${digitalResult.totalDigitalBudgetMan.toLocaleString()}M KRW)`}
          </p>
          {digitalResult.channels.length === 0 ? (
            <p className="mt-3 text-sm text-amber-700">
              {isKo
                ? "선택된 디지털 플랫폼이 없습니다."
                : "No digital platforms selected."}
            </p>
          ) : (
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
                  <th className="p-2">{isKo ? "플랫폼" : "Platform"}</th>
                  <th className="p-2">{isKo ? "비중" : "Share"}</th>
                  <th className="p-2">{isKo ? "예상 노출" : "Est. impressions"}</th>
                </tr>
              </thead>
              <tbody>
                {digitalResult.channels.map((row) => (
                  <tr key={row.channel.id} className="border-b dark:border-white/10">
                    <td className="p-2 font-medium">
                      {isKo ? row.channel.nameKo : row.channel.nameEn}
                    </td>
                    <td className="p-2">{row.budgetPct}%</td>
                    <td className="p-2 tabular-nums">
                      {row.estimatedImpressions.toLocaleString(
                        isKo ? "ko-KR" : "en-US",
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* C — 시너지 (PRO) */}
        <IntegratedProBlindSection
          isPro={isPro}
          isKo={isKo}
          title={isKo ? "OOH × 디지털 시너지" : "OOH × digital synergy"}
          className="border border-gray-200 bg-gray-50/80 dark:border-white/10 dark:bg-white/5"
        >
          <section className="p-5">
            <SectionTitle>
              {isKo ? "C. OOH × 디지털 시너지 효과" : "C. Cross-media synergy"}
            </SectionTitle>
            <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {proInsights.mediaSynergyStrategies.map((row) => (
                <li key={row.mediaName} className="rounded-lg bg-white px-3 py-2 dark:bg-white/5">
                  <span className="font-semibold">{row.mediaName}</span>
                  <span className="mt-1 block text-gray-600 dark:text-gray-400">
                    {isKo ? row.strategyKo : row.strategyEn}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">
                  {isKo ? "크로스미디어 도달 증폭" : "Reach amplification"}
                </dt>
                <dd className="text-xl font-black text-violet-700">
                  +{proInsights.crossMediaReachAmplificationPct}%
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">
                  {isKo ? "시너지 노출 추정" : "Synergy impressions"}
                </dt>
                <dd className="text-xl font-black text-cyan-700 tabular-nums">
                  {proInsights.synergyImpressionsEstimate.toLocaleString()}
                </dd>
              </div>
            </dl>
          </section>
        </IntegratedProBlindSection>

        {/* D — CPM (PRO) */}
        <IntegratedProBlindSection
          isPro={isPro}
          isKo={isKo}
          title={isKo ? "통합 CPM 분석" : "Blended CPM analysis"}
          className="border border-gray-200 bg-gray-50/80 dark:border-white/10 dark:bg-white/5"
        >
          <section className="p-5">
            <SectionTitle>
              {isKo ? "D. 통합 CPM 분석" : "D. Integrated CPM analysis"}
            </SectionTitle>
            <table className="mt-4 w-full border-collapse text-sm">
              <tbody>
                <tr className="border-b dark:border-white/10">
                  <td className="p-2 text-gray-500">OOH CPM</td>
                  <td className="p-2 text-right font-bold tabular-nums">
                    ₩{proInsights.oohCpm.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b dark:border-white/10">
                  <td className="p-2 text-gray-500">
                    {isKo ? "디지털 CPM" : "Digital CPM"}
                  </td>
                  <td className="p-2 text-right font-bold tabular-nums">
                    ₩{proInsights.digitalCpm.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b dark:border-white/10">
                  <td className="p-2 text-gray-500">
                    {isKo ? "통합 효율 점수" : "Efficiency score"}
                  </td>
                  <td className="p-2 text-right text-xl font-black text-violet-700">
                    {proInsights.integratedEfficiencyScore}/100
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {isKo
                ? proInsights.competitiveAdvantageKo
                : proInsights.competitiveAdvantageEn}
            </p>
          </section>
        </IntegratedProBlindSection>

        {/* E — ROI (PRO) */}
        <IntegratedProBlindSection
          isPro={isPro}
          isKo={isKo}
          title={isKo ? "ROI 예측" : "ROI forecast"}
          className="border border-gray-200 bg-gray-50/80 dark:border-white/10 dark:bg-white/5"
        >
          <section className="p-5">
            <SectionTitle>
              {isKo ? "E. ROI 예측" : "E. ROI forecast"}
            </SectionTitle>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white p-3 dark:bg-white/5">
                <dt className="text-xs text-gray-500">
                  {isKo ? "브랜드 리프트" : "Brand lift"}
                </dt>
                <dd className="mt-1 text-2xl font-black text-pink-600">
                  +{proInsights.brandLiftPct}%
                </dd>
              </div>
              <div className="rounded-xl bg-white p-3 dark:bg-white/5">
                <dt className="text-xs text-gray-500">
                  {isKo ? "전환 기여" : "Conversion"}
                </dt>
                <dd className="mt-1 text-2xl font-black text-cyan-600">
                  {proInsights.conversionContributionPct}%
                </dd>
              </div>
              <div className="rounded-xl bg-white p-3 dark:bg-white/5">
                <dt className="text-xs text-gray-500">
                  {isKo ? "효율 등급" : "Grade"}
                </dt>
                <dd className="mt-1 text-3xl font-black text-violet-700">
                  {proInsights.efficiencyGrade}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {isKo
                ? `통합 ROAS ${metrics.integratedRoasConservative}~${metrics.integratedRoasOptimistic}배 (보수~낙관)`
                : `Integrated ROAS ${metrics.integratedRoasConservative}–${metrics.integratedRoasOptimistic}×`}
            </p>
          </section>
        </IntegratedProBlindSection>

        {/* F — AI 제안 (PRO) */}
        <IntegratedProBlindSection
          isPro={isPro}
          isKo={isKo}
          title={isKo ? "AI 최적화 제안" : "AI optimization"}
          className="border border-gray-200 bg-gray-50/80 dark:border-white/10 dark:bg-white/5"
        >
          <section className="p-5">
            <SectionTitle>
              {isKo ? "F. AI 최적화 제안" : "F. AI optimization"}
            </SectionTitle>
            <div className="mt-3 space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {isKo ? "예산 재배분" : "Budget reallocation"}
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {(isKo
                    ? proInsights.budgetReallocationKo
                    : proInsights.budgetReallocationEn
                  ).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {isKo ? "시즌·시간대 전략" : "Season & daypart"}
                </p>
                <p className="mt-1">
                  {isKo ? proInsights.seasonStrategyKo : proInsights.seasonStrategyEn}
                </p>
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {isKo ? "다음 캠페인" : "Next flight"}
                </p>
                <p className="mt-1">
                  {isKo ? proInsights.nextCampaignKo : proInsights.nextCampaignEn}
                </p>
              </div>
            </div>
          </section>
        </IntegratedProBlindSection>

        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          {isKo
            ? "본 제안서는 THINKAD 내부 추정 모델 기반이며, 실제 집행 시 매체·플랫폼 재고에 따라 달라질 수 있습니다."
            : "This proposal uses THINKAD internal estimates; actual delivery may vary by inventory."}
        </p>
      </div>
    );
  },
);

export default IntegratedReportPreview;
