import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import { formatSeoulZonesText } from "@/lib/planner/seoul-zones";
import { industryStrategyLine } from "@/lib/planner/industry-match";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import { formatConversionKpiForReport } from "@/lib/planner/goal-follow-up";

export type ReportStrategyInput = {
  isKo: boolean;
  campaignGoal: PlannerCampaignGoal | null;
  goalTitle: string;
  industryKey: PlannerIndustryKey | null;
  industryText: string;
  regionsText: string;
  seoulZones: readonly PlannerSeoulZoneKey[];
  followUp: PlannerGoalFollowUp;
  portfolioCount: number;
};

function zoneLine(input: ReportStrategyInput): string | null {
  const hasSeoul = input.regionsText.includes("서울") ||
    input.regionsText.toLowerCase().includes("seoul");
  if (!hasSeoul && input.seoulZones.length === 0) return null;
  const zoneText = formatSeoulZonesText(input.seoulZones, input.isKo);
  if (input.isKo) {
    return `상권 · ${zoneText} 동선을 중심으로 매체를 배치했습니다.`;
  }
  return `Districts · Prioritized placements along ${zoneText}.`;
}

function goalIndustryLine(input: ReportStrategyInput): string | null {
  const g = input.campaignGoal;
  const ind = input.industryKey ?? "indOther";
  if (input.isKo) {
    const table: Partial<Record<`${PlannerCampaignGoal}:${PlannerIndustryKey}`, string>> = {
      "launch:indRetail": `${input.goalTitle} × ${input.industryText} — 강남·성수 트렌드 동선에 집중 노출해 인지도를 빠르게 끌어올립니다.`,
      "launch:indFb": `${input.goalTitle} × ${input.industryText} — 상권·식음 동선 매체로 첫 인지를 확보합니다.`,
      "local:indFb": `${input.goalTitle} × ${input.industryText} — 매장 인근 생활권·상권 보드를 우선해 방문 동기를 높입니다.`,
      "event:indEnt": `${input.goalTitle} × ${input.industryText} — 행사 기간 동안 문화·이벤트 동선 매체를 집중 배치했습니다.`,
      "sales:indRetail": `${input.goalTitle} × ${input.industryText} — 쇼핑·유통 동선과 전환 채널에 맞춘 혼합 구성입니다.`,
      "brand:indTech": `${input.goalTitle} × ${input.industryText} — 업무·테크 클러스터 노출로 브랜드 신뢰를 쌓습니다.`,
    };
    const key = `${g}:${ind}` as `${PlannerCampaignGoal}:${PlannerIndustryKey}`;
    return table[key] ?? null;
  }
  const tableEn: Partial<Record<`${PlannerCampaignGoal}:${PlannerIndustryKey}`, string>> = {
    "launch:indRetail": `${input.goalTitle} × ${input.industryText} — trend corridors (Gangnam/Seongsu) for fast awareness.`,
    "launch:indFb": `${input.goalTitle} × ${input.industryText} — F&B corridor media for launch recall.`,
    "local:indFb": `${input.goalTitle} × ${input.industryText} — neighborhood boards near store trade areas.`,
    "event:indEnt": `${input.goalTitle} × ${input.industryText} — culture/event routes for the campaign window.`,
    "sales:indRetail": `${input.goalTitle} × ${input.industryText} — retail traffic mix aligned to conversion.`,
    "brand:indTech": `${input.goalTitle} × ${input.industryText} — tech-cluster visibility for brand trust.`,
  };
  const key = `${g}:${ind}` as `${PlannerCampaignGoal}:${PlannerIndustryKey}`;
  return tableEn[key] ?? null;
}

function followUpLine(input: ReportStrategyInput): string | null {
  const f = input.followUp;
  const g = input.campaignGoal;
  if (g === "launch" && f.launchFocusWeeks != null) {
    return input.isKo
      ? `집중 기간 · 런칭 후 ${f.launchFocusWeeks}주 구간에 노출 밀도를 높였습니다.`
      : `Focus window · Higher density for ${f.launchFocusWeeks} weeks post-launch.`;
  }
  if (g === "local" && input.seoulZones.length > 0) {
    const zoneText = formatSeoulZonesText(input.seoulZones, input.isKo);
    return input.isKo
      ? `집중 상권 · ${zoneText} 동선을 우선했습니다.`
      : `Focus districts · Prioritized along ${zoneText}.`;
  }
  if (g === "event" && f.eventDurationDays != null) {
    return input.isKo
      ? `행사 기간 · ${f.eventDurationDays}일 캠페인에 맞춰 기간 집중형 매체를 배치했습니다.`
      : `Event span · ${f.eventDurationDays}-day burst-friendly lineup.`;
  }
  if (g === "sales" && f.conversionChannel) {
    const ch =
      f.conversionChannel === "store"
        ? input.isKo
          ? "매장 방문"
          : "in-store"
        : f.conversionChannel === "online"
          ? input.isKo
            ? "온라인 전환"
            : "online"
          : input.isKo
            ? "매장+온라인"
            : "store + online";
    const kpi = formatConversionKpiForReport(f.conversionKpi, input.isKo);
    return input.isKo
      ? `유도 방향 · ${ch} 중심 OOH 배치${kpi ? ` (참고 KPI: ${kpi})` : ""}.`
      : `OOH focus · ${ch}${kpi ? ` (reference KPI: ${kpi})` : ""}.`;
  }
  return null;
}

/** goal×industry×region×후속답 → 전략 문구 (규칙 테이블) */
export function buildReportStrategyLines(
  input: ReportStrategyInput,
): string[] {
  const lines: string[] = [];

  const gi = goalIndustryLine(input);
  if (gi) lines.push(gi);

  const ind = industryStrategyLine(
    input.isKo,
    input.industryKey,
    input.industryText,
  );
  if (ind && !gi?.includes(input.industryText)) lines.push(ind);

  const zone = zoneLine(input);
  if (zone) lines.push(zone);

  const follow = followUpLine(input);
  if (follow) lines.push(follow);

  return lines;
}

export function buildReportWhyLine(input: ReportStrategyInput): string {
  const zoneSuffix =
    input.seoulZones.length > 0
      ? formatSeoulZonesText(input.seoulZones, input.isKo)
      : input.regionsText;

  if (input.isKo) {
    return `왜 이 구성인가 · ${zoneSuffix} 핵심 동선의 ${input.portfolioCount}개 매체로 ${input.goalTitle} 목표에 맞춰 노출 효율과 도달을 균형 있게 설계했습니다.`;
  }
  return `Why · ${input.portfolioCount} media across ${zoneSuffix} balance reach and efficiency for the "${input.goalTitle}" objective.`;
}
