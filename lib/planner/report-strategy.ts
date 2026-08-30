import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import { formatSeoulZonesText } from "@/lib/planner/seoul-zones";
import { industryStrategyLine } from "@/lib/planner/industry-match";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import { buildGoalFollowUpReportLines } from "@/lib/planner/goal-follow-up";

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

function followUpLines(input: ReportStrategyInput): string[] {
  return buildGoalFollowUpReportLines(
    input.campaignGoal,
    input.followUp,
    input.isKo,
  );
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

  for (const follow of followUpLines(input)) {
    lines.push(follow);
  }

  return lines;
}

/** 표지 「미지정」은 유지하되, 파일명·전략 문장에는 끼워 넣지 않는다 */
export function isUnspecifiedReportLabel(label: string): boolean {
  const t = label.trim();
  return t === "미지정" || t === "Not specified";
}

export function buildReportWhyLine(input: ReportStrategyInput): string {
  const zoneSuffix =
    input.seoulZones.length > 0
      ? formatSeoulZonesText(input.seoulZones, input.isKo)
      : input.regionsText;

  const goalKnown = !isUnspecifiedReportLabel(input.goalTitle);

  if (input.isKo) {
    if (goalKnown) {
      return `왜 이 구성인가 · ${zoneSuffix} 핵심 동선의 ${input.portfolioCount}개 매체로 ${input.goalTitle} 목표에 맞춰 노출 효율과 도달을 균형 있게 설계했습니다.`;
    }
    return `왜 이 구성인가 · ${zoneSuffix} 핵심 동선의 ${input.portfolioCount}개 매체로 노출 효율과 도달을 균형 있게 설계했습니다.`;
  }
  if (goalKnown) {
    return `Why · ${input.portfolioCount} media across ${zoneSuffix} balance reach and efficiency for the "${input.goalTitle}" objective.`;
  }
  return `Why · ${input.portfolioCount} media across ${zoneSuffix} balance reach and efficiency.`;
}
