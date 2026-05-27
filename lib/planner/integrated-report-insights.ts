import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { DigitalRecommendResult } from "@/lib/planner/recommend-digital";
import type { IntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import { OOH_DIGITAL_SYNERGY_LIFT } from "@/lib/planner/digital-channels";

export type EfficiencyGrade = "A" | "B" | "C" | "D" | "E" | "F";

export type IntegratedProInsights = {
  mediaSynergyStrategies: { mediaName: string; strategyKo: string; strategyEn: string }[];
  crossMediaReachAmplificationPct: number;
  synergyImpressionsEstimate: number;
  oohCpm: number;
  digitalCpm: number;
  integratedEfficiencyScore: number;
  competitiveAdvantageKo: string;
  competitiveAdvantageEn: string;
  brandLiftPct: number;
  conversionContributionPct: number;
  efficiencyGrade: EfficiencyGrade;
  budgetReallocationKo: string[];
  budgetReallocationEn: string[];
  seasonStrategyKo: string;
  seasonStrategyEn: string;
  nextCampaignKo: string;
  nextCampaignEn: string;
};

function gradeFromScore(score: number): EfficiencyGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  if (score >= 50) return "E";
  return "F";
}

export function computeIntegratedProInsights(opts: {
  portfolio: MediaItem[];
  metrics: IntegratedCampaignMetrics;
  digitalResult: DigitalRecommendResult;
  goal: PlannerCampaignGoal | null;
  isKo: boolean;
}): IntegratedProInsights {
  const { portfolio, metrics, digitalResult, goal } = opts;
  const topDigital = digitalResult.channels[0]?.channel;
  const topDigitalNameKo = topDigital?.nameKo ?? "디지털";
  const topDigitalNameEn = topDigital?.nameEn ?? "digital";

  const mediaSynergyStrategies = portfolio.slice(0, 6).map((m) => {
    const region = m.region ?? m.location ?? "집행 지역";
    const synergy =
      topDigital?.synergyKo ?? `${region} OOH 노출 후 디지털 리타겟`;
    return {
      mediaName: m.name,
      strategyKo: `${m.name} 노출 후 → ${topDigitalNameKo} · ${synergy}`,
      strategyEn: `After ${m.name} → ${topDigitalNameEn} retargeting (${region})`,
    };
  });

  const crossMediaReachAmplificationPct = Math.round(
    (OOH_DIGITAL_SYNERGY_LIFT - 1) * 100,
  );
  const synergyImpressionsEstimate = Math.round(
    metrics.digitalTotalImpressions * OOH_DIGITAL_SYNERGY_LIFT +
      metrics.oohImpressions * 0.15,
  );

  const oohCpm = metrics.oohCpmKrw ?? 28_000;
  const digitalCpm =
    metrics.digitalTotalImpressions > 0
      ? Math.round(
          (metrics.digitalBudgetMan * 10_000 * 1000) /
            metrics.digitalTotalImpressions,
        )
      : 7_200;

  const cpmRatio = oohCpm / Math.max(digitalCpm, 1);
  const integratedEfficiencyScore = Math.min(
    98,
    Math.round(
      62 +
        metrics.integratedRoasExpected * 8 +
        (cpmRatio < 4 ? 12 : 6) +
        digitalResult.channels.length * 3,
    ),
  );

  const competitiveAdvantageKo =
    integratedEfficiencyScore >= 80
      ? "동일 예산 대비 통합 도달·브랜드 검색 전환에서 상위 20% 효율 추정"
      : "OOH 프리미엄 구간 대비 디지털 보조 집행으로 효율 균형 가능";
  const competitiveAdvantageEn =
    integratedEfficiencyScore >= 80
      ? "Top-quartile estimated efficiency vs. same-budget OOH-only"
      : "Digital support balances premium OOH CPM";

  const brandLiftPct = Math.round((OOH_DIGITAL_SYNERGY_LIFT - 1) * 100);
  const conversionContributionPct = Math.min(
    48,
    Math.round(18 + metrics.integratedRoasExpected * 6),
  );

  const budgetReallocationKo = digitalResult.channels.slice(0, 3).map((row, i) => {
    const shift = i === 0 ? "+5" : i === 1 ? "+3" : "-2";
    return `${row.channel.nameKo} 예산 비중 ${shift}%p (시너지 점수 기반)`;
  });
  const budgetReallocationEn = digitalResult.channels.slice(0, 3).map((row, i) => {
    const shift = i === 0 ? "+5" : i === 1 ? "+3" : "-2";
    return `Shift ${row.channel.nameEn} share ${shift}%p (synergy score)`;
  });

  const seasonStrategyKo =
    goal === "event"
      ? "피크 2주 전 OOH 집중 → 당일 전후 디지털 리타겟"
      : goal === "local"
        ? "주말·퇴근 시간대 디지털, 평일 낮 OOH 집중"
        : "캠페인 1~2주차 OOH 인지 → 3~4주차 디지털 전환";
  const seasonStrategyEn =
    goal === "event"
      ? "OOH peak 2 weeks out → digital retarget around event"
      : goal === "local"
        ? "Weekend/evening digital; weekday OOH"
        : "Weeks 1–2 OOH awareness → weeks 3–4 digital conversion";

  const nextCampaignKo =
    goal === "local"
      ? "다음 분기: 당근·네이버 비중 확대 + 반경 500m OOH 추가"
      : "다음 분기: 영상 소재 A/B + 유튜브·틱톡 숏폼 확장";
  const nextCampaignEn =
    goal === "local"
      ? "Next flight: more Karrot/Naver + 500m-radius OOH"
      : "Next flight: video A/B + YouTube/TikTok short-form";

  return {
    mediaSynergyStrategies,
    crossMediaReachAmplificationPct,
    synergyImpressionsEstimate,
    oohCpm,
    digitalCpm,
    integratedEfficiencyScore,
    competitiveAdvantageKo,
    competitiveAdvantageEn,
    brandLiftPct,
    conversionContributionPct,
    efficiencyGrade: gradeFromScore(integratedEfficiencyScore),
    budgetReallocationKo,
    budgetReallocationEn,
    seasonStrategyKo,
    seasonStrategyEn,
    nextCampaignKo,
    nextCampaignEn,
  };
}
