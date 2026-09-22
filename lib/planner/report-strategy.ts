import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import { formatSeoulZonesText } from "@/lib/planner/seoul-zones";
import {
  industryStrategyLine,
  PLANNER_INDUSTRY_HINTS,
} from "@/lib/planner/industry-match";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import { buildGoalFollowUpReportLines } from "@/lib/planner/goal-follow-up";

export type ReportStrategyMediaHint = {
  name: string;
  location?: string;
  budgetPct: number;
  cpmWon: number | null;
};

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
  mediaHints?: readonly ReportStrategyMediaHint[];
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

function goalIndustryLine(
  input: ReportStrategyInput,
  mediaLocations?: readonly string[],
): string | null {
  const g = input.campaignGoal;
  const ind = input.industryKey ?? "indOther";
  const line = goalIndustryLineText(input, g, ind);
  if (!line) return null;
  /**
   * 표에 실린 문구는 업종별 고정 동선(강남·성수, 매장 인근 상권 등)을 단정한다.
   * 실제 선택 매체 위치가 해당 업종 힌트와 무관하면(예: KTX·지하철만 있는데
   * "쇼핑·유통 동선" 을 주장) 허위 클레임이 되므로 industryStrategyLine 과
   * 동일한 근거로 검증한다.
   */
  if (ind !== "indOther" && mediaLocations && mediaLocations.length > 0) {
    const hints = PLANNER_INDUSTRY_HINTS[ind as Exclude<PlannerIndustryKey, "indOther">];
    if (hints) {
      const haystack = mediaLocations.join(" ").toLowerCase();
      const matched = hints.some((h) => haystack.includes(h.toLowerCase()));
      if (!matched) return null;
    }
  }
  return line;
}

function goalIndustryLineText(
  input: ReportStrategyInput,
  g: PlannerCampaignGoal | null,
  ind: PlannerIndustryKey,
): string | null {
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

/**
 * goal×industry×region×후속답 → 전략 문구 (규칙 테이블)
 *
 * 업종 문구 우선순위 (goalIndustryLine 과 industryStrategyLine 은 항상 아래 순서로만 공존한다):
 *   1. goalIndustryLine — goal×industry 조합 전용 하드코딩 문구(6종). mediaLocations 가 있으면
 *      PLANNER_INDUSTRY_HINTS 로 검증하고, 매체 위치가 업종과 무관하면(예: 지하철·기차만 있는데
 *      "쇼핑·유통 동선" 주장) null 을 반환해 자동으로 2번으로 넘어간다. mediaLocations 가 없으면
 *      검증을 건너뛰고 기존 동작대로 하드코딩 문구를 그대로 쓴다.
 *   2. industryStrategyLine — goal 무관, 업종 전용 문구. gi 가 채워지면(= 검증 통과) 중복 방지로
 *      건너뛰고, gi 가 null 이면(= 미채택 또는 검증 실패) 이 함수 자체의 mediaLocations 검증을
 *      거쳐 특화 문구 또는 generic 폴백("X 업종에 맞춘 매체를 구성했습니다")을 낸다.
 * 두 함수를 하나로 합치지 않은 이유: goalIndustryLine 은 goal×industry 조합별로 손으로 쓴 더
 * 구체적인 문구(예: "런칭×리테일→강남·성수 트렌드 동선")를 제공하고, industryStrategyLine 은
 * goal 과 무관하게 모든 업종에 대해 폴백을 보장한다 — 서로 다른 커버리지라 병합하면 goal-aware
 * 문구가 사라진다. 검증 로직만 공유(PLANNER_INDUSTRY_HINTS)하고 두 함수는 유지한다.
 * (lib/planner/__tests__/report-strategy.test.ts 가 이 우선순위 계약을 고정한다.)
 */
export function buildReportStrategyLines(
  input: ReportStrategyInput,
): string[] {
  const lines: string[] = [];

  const mediaLocations = input.mediaHints
    ?.map((h) => h.location)
    .filter((l): l is string => !!l);

  const gi = goalIndustryLine(input, mediaLocations);
  if (gi) lines.push(gi);

  const ind = industryStrategyLine(
    input.isKo,
    input.industryKey,
    input.industryText,
    mediaLocations,
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

  const efficiencyPhrase = resolveEfficiencyPhrase(input);

  if (input.isKo) {
    if (goalKnown) {
      return `왜 이 구성인가 · ${zoneSuffix} 핵심 동선의 ${input.portfolioCount}개 매체로 ${input.goalTitle} 목표에 맞춰 ${efficiencyPhrase.ko}.`;
    }
    return `왜 이 구성인가 · ${zoneSuffix} 핵심 동선의 ${input.portfolioCount}개 매체로 ${efficiencyPhrase.ko}.`;
  }
  if (goalKnown) {
    return `Why · ${input.portfolioCount} media across ${zoneSuffix} ${efficiencyPhrase.en} for the "${input.goalTitle}" objective.`;
  }
  return `Why · ${input.portfolioCount} media across ${zoneSuffix} ${efficiencyPhrase.en}.`;
}

function resolveEfficiencyPhrase(input: ReportStrategyInput): {
  ko: string;
  en: string;
} {
  const hints = input.mediaHints;
  if (!hints || hints.length < 2) {
    return {
      ko: "노출 효율과 도달을 균형 있게 설계했습니다",
      en: "balance reach and efficiency",
    };
  }
  const withCpm = hints.filter((h) => h.cpmWon != null && h.cpmWon > 0);
  if (withCpm.length < 2) {
    return {
      ko: "도달 범위를 중심으로 구성했습니다",
      en: "prioritize reach coverage",
    };
  }
  const cpms = withCpm.map((h) => h.cpmWon!);
  const maxCpm = Math.max(...cpms);
  const minCpm = Math.min(...cpms);
  const ratio = maxCpm / minCpm;
  if (ratio > 5) {
    return {
      ko: "CPM 격차가 큰 매체를 조합해 도달과 비용 효율을 설계했습니다",
      en: "combine high- and low-CPM media to balance reach and cost",
    };
  }
  return {
    ko: "노출 효율과 도달을 균형 있게 설계했습니다",
    en: "balance reach and efficiency",
  };
}
