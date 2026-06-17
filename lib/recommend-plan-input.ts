import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import {
  type ProposalGoal,
  type ProposalInput,
} from "@/lib/proposal/types";

/**
 * AI 플래너 2단계 — 파싱된 추천 조건(AiRecommendInput)에서 제안서 입력(ProposalInput)을
 * **추가 LLM 호출 없이 규칙 기반**으로 구성한다.
 *
 * - goal/예산/지역/업종/타깃은 브리프에서 매핑.
 * - 브랜드명·캠페인명·집행기간은 브리프에 없으므로 규칙 기반 기본값을 만들고,
 *   UI 에서 인라인으로 수정(자동채움 + 수정). LLM 으로 브랜드명을 추출하지 않는다.
 */

/** AiRecommendInput.goal(awareness|consideration|launch) → ProposalGoal(awareness|conversion|event) */
export function mapRecommendGoalToProposal(
  goal: AiRecommendInput["goal"],
): ProposalGoal {
  switch (goal) {
    case "consideration":
      return "conversion";
    case "launch":
      return "event";
    case "awareness":
    default:
      return "awareness";
  }
}

export function goalLabel(goal: AiRecommendInput["goal"], isKo: boolean): string {
  if (isKo) {
    return goal === "consideration"
      ? "관심·고려"
      : goal === "launch"
        ? "신규 런칭"
        : "브랜드 인지";
  }
  return goal === "consideration"
    ? "Consideration"
    : goal === "launch"
      ? "Launch"
      : "Awareness";
}

export function targetAgeLabel(
  target: AiRecommendInput["target"],
  isKo: boolean,
): string {
  const ko: Record<AiRecommendInput["target"], string> = {
    genz: "10~24세",
    millennial: "25~39세",
    family: "가족·40세 이상",
    biz: "직장인·B2B",
    mass: "전 연령",
  };
  const en: Record<AiRecommendInput["target"], string> = {
    genz: "10-24",
    millennial: "25-39",
    family: "Family / 40+",
    biz: "Business",
    mass: "All ages",
  };
  return (isKo ? ko : en)[target];
}

export function industryLabel(
  industry: AiRecommendInput["industry"],
  isKo: boolean,
): string {
  const ko: Record<string, string> = {
    retail: "리테일·유통",
    fintech: "금융·핀테크",
    fmcg: "생활소비재",
    auto: "자동차",
    entertainment: "엔터·콘텐츠",
    beauty: "뷰티",
    other: "기타",
  };
  const en: Record<string, string> = {
    retail: "Retail",
    fintech: "Fintech",
    fmcg: "FMCG",
    auto: "Auto",
    entertainment: "Entertainment",
    beauty: "Beauty",
    other: "Other",
  };
  return (isKo ? ko : en)[industry] ?? industry;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 기본 집행 기간 — 오늘 +7일 시작, 기간(주) 후 종료. 브리프 preferredPeriodWeeks 우선. */
export function defaultPlanDates(weeks: number): { startDate: string; endDate: string } {
  const w = Number.isFinite(weeks) && weeks > 0 ? Math.min(52, Math.round(weeks)) : 4;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 7);
  const end = new Date(start);
  end.setDate(start.getDate() + w * 7 - 1);
  return { startDate: ymd(start), endDate: ymd(end) };
}

/** 사용자가 인라인 수정할 보강 필드의 규칙 기반 기본값. */
export type PlanEditableFields = {
  brandName: string;
  campaignName: string;
  startDate: string;
  endDate: string;
};

export function planDefaults(
  brief: AiRecommendInput,
  isKo: boolean,
): PlanEditableFields {
  const { startDate, endDate } = defaultPlanDates(brief.preferredPeriodWeeks ?? 4);
  const region = brief.region?.trim() || (isKo ? "전국" : "Nationwide");
  return {
    // 브랜드명은 LLM 추출하지 않음 — 편집 가능한 기본값(placeholder 성격)
    brandName: isKo ? "우리 브랜드" : "Our brand",
    campaignName: isKo
      ? `${region} ${goalLabel(brief.goal, true)} 캠페인`
      : `${region} ${goalLabel(brief.goal, false)} campaign`,
    startDate,
    endDate,
  };
}

/** 브리프 + (인라인 수정된) 보강 필드 + 매체 id → ProposalInput. */
export function buildPlanProposalInput(
  brief: AiRecommendInput,
  mediaIds: string[],
  fields: PlanEditableFields,
  locale: "ko" | "en",
): ProposalInput {
  const isKo = locale !== "en";
  const region = brief.region?.trim();
  const budgetMan =
    brief.budgetMaxMan && brief.budgetMaxMan >= 100
      ? Math.min(100_000, Math.round(brief.budgetMaxMan))
      : 1000;
  return {
    brandName: fields.brandName.trim() || (isKo ? "우리 브랜드" : "Our brand"),
    industry: industryLabel(brief.industry, isKo),
    campaignName:
      fields.campaignName.trim() || (isKo ? "AI 추천 캠페인" : "AI campaign"),
    targetAge: targetAgeLabel(brief.target, isKo),
    targetGender: "",
    targetInterests: "",
    startDate: fields.startDate,
    endDate: fields.endDate,
    budgetManwon: budgetMan,
    goal: mapRecommendGoalToProposal(brief.goal),
    regions: region ? [region] : [isKo ? "전국" : "Nationwide"],
    mediaIds: mediaIds.slice(0, 20),
    locale: isKo ? "ko" : "en",
  };
}
