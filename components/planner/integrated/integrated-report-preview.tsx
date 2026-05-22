"use client";

import { forwardRef } from "react";
import type { MediaItem } from "@/lib/media-data";
import type { IntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import type { DigitalRecommendResult } from "@/lib/planner/recommend-digital";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  goalTitle: string;
  budgetNum: number;
  periodDisplay: string;
  regionsText: string;
  portfolio: MediaItem[];
  digitalResult: DigitalRecommendResult;
  metrics: IntegratedCampaignMetrics;
  generatedAt: string;
};

const IntegratedReportPreview = forwardRef<HTMLDivElement, Props>(
  function IntegratedReportPreview(
    {
      isKo,
      goalTitle,
      budgetNum,
      periodDisplay,
      regionsText,
      portfolio,
      digitalResult,
      metrics,
      generatedAt,
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        id="integrated-planner-report-content"
        className={cn(
          "box-border w-full max-w-[240mm] space-y-8 rounded-2xl border p-6 antialiased",
          "border-gray-200 bg-white text-gray-900",
        )}
      >
        <div className="rounded-xl bg-gradient-to-br from-violet-950 via-[#0a0a12] to-cyan-950 p-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
            THINKAD Integrated Campaign
          </p>
          <h1 className="mt-3 text-2xl font-black">
            {isKo ? "OOH + 디지털 통합 제안서" : "OOH + Digital Integrated Proposal"}
          </h1>
          <p className="mt-2 text-sm text-white/70">{generatedAt}</p>
        </div>

        <section>
          <h2 className="text-lg font-black">
            {isKo ? "1. 캠페인 개요" : "1. Campaign overview"}
          </h2>
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
              <dt className="text-gray-500">{isKo ? "총 예산" : "Total budget"}</dt>
              <dd className="font-semibold">
                {budgetNum.toLocaleString()}
                {isKo ? "만원" : "M KRW"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">{isKo ? "기간" : "Period"}</dt>
              <dd className="font-semibold">{periodDisplay}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="text-lg font-black">
            {isKo ? "2. OOH 매체 플랜" : "2. OOH media plan"}
          </h2>
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="p-2">{isKo ? "매체" : "Media"}</th>
                <th className="p-2">{isKo ? "지역" : "Region"}</th>
                <th className="p-2">{isKo ? "유형" : "Type"}</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="p-2 font-medium">{m.name}</td>
                  <td className="p-2">{m.region ?? "—"}</td>
                  <td className="p-2">{m.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg font-black">
            {isKo ? "3. 디지털 연계 플랜" : "3. Digital linkage plan"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isKo ? digitalResult.synergyMessageKo : digitalResult.synergyMessageEn}
          </p>
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="p-2">{isKo ? "채널" : "Channel"}</th>
                <th className="p-2">{isKo ? "타겟" : "Targeting"}</th>
                <th className="p-2">{isKo ? "예산%" : "Budget %"}</th>
              </tr>
            </thead>
            <tbody>
              {digitalResult.channels.map((row) => (
                <tr key={row.channel.id} className="border-b">
                  <td className="p-2 font-medium">
                    {isKo ? row.channel.nameKo : row.channel.nameEn}
                  </td>
                  <td className="p-2">
                    {isKo ? row.channel.targetingKo : row.channel.targetingEn}
                  </td>
                  <td className="p-2">{row.budgetPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg font-black">
            {isKo ? "4. 시너지 효과" : "4. Synergy impact"}
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
            <li>
              {isKo
                ? `OOH+디지털 동시 집행 시 브랜드 리프트 ${metrics.synergyLiftMultiplier}배 (리서치 벤치마크)`
                : `Combined OOH+digital brand lift ${metrics.synergyLiftMultiplier}× (research benchmark)`}
            </li>
            <li>
              {isKo
                ? `브랜드 검색량 +${metrics.brandSearchChangePct}% (집행 기간 추정)`
                : `Brand search volume +${metrics.brandSearchChangePct}% (campaign period est.)`}
            </li>
            <li>
              {isKo
                ? `통합 ROAS ${metrics.integratedRoasConservative}~${metrics.integratedRoasOptimistic}배 (보수~낙관)`
                : `Integrated ROAS ${metrics.integratedRoasConservative}–${metrics.integratedRoasOptimistic}×`}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-black">
            {isKo ? "5. 통합 예산 배분표" : "5. Integrated budget allocation"}
          </h2>
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="p-2">{isKo ? "구분" : "Category"}</th>
                <th className="p-2">{isKo ? "비율" : "Share"}</th>
                <th className="p-2">{isKo ? "금액(만원)" : "Amount (M KRW)"}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2 font-medium">OOH</td>
                <td className="p-2">{digitalResult.oohBudgetPct}%</td>
                <td className="p-2">{metrics.oohBudgetMan.toLocaleString()}</td>
              </tr>
              {metrics.digitalChannels.map((ch) => (
                <tr key={ch.id} className="border-b">
                  <td className="p-2 font-medium">
                    {isKo ? ch.nameKo : ch.nameEn}
                  </td>
                  <td className="p-2">
                    {Math.round(
                      (ch.budgetMan / Math.max(metrics.digitalBudgetMan, 1)) *
                        digitalResult.digitalBudgetPct,
                    )}
                    %
                  </td>
                  <td className="p-2">{ch.budgetMan.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="p-2">{isKo ? "합계" : "Total"}</td>
                <td className="p-2">100%</td>
                <td className="p-2">{budgetNum.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <p className="text-[10px] text-gray-500">
          {isKo
            ? "본 제안서는 THINKAD 내부 추정 모델 기반이며, 실제 집행 시 매체·플랫폼 재고에 따라 달라질 수 있습니다."
            : "This proposal uses THINKAD internal estimates; actual delivery may vary by inventory."}
        </p>
      </div>
    );
  },
);

export default IntegratedReportPreview;
