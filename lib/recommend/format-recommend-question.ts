import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import type { RegionCheckboxCode } from "@/components/media-ai-recommend-form";
import { plannerRegionLabel } from "@/lib/planner/planner-regions";
import { PLANNER_INDUSTRY_LABELS } from "@/lib/planner/types";
import { recommendIndustryToPlannerIndustryKey } from "@/lib/recommend/recommend-report-adapter";

const GOAL_LABEL: Record<string, { ko: string; en: string }> = {
  awareness: { ko: "브랜드 인지", en: "Brand awareness" },
  consideration: { ko: "고려·관심", en: "Consideration" },
  conversion: { ko: "전환·성과", en: "Conversion" },
  launch: { ko: "신제품 런칭", en: "Product launch" },
};

const TARGET_LABEL: Record<string, { ko: string; en: string }> = {
  genz: { ko: "Gen Z", en: "Gen Z" },
  millennial: { ko: "밀레니얼", en: "Millennial" },
  family: { ko: "패밀리", en: "Family" },
  biz: { ko: "비즈니스", en: "Business" },
  mass: { ko: "대중", en: "Mass" },
};

/**
 * 탐험 완료 헤더용 — AI 원문 우선, 없으면 구조화 요약.
 */
export function formatRecommendQuestionLine(args: {
  input: AiRecommendInput;
  regionCodes?: readonly RegionCheckboxCode[] | readonly string[];
  isKo: boolean;
}): string | null {
  const raw = args.input.freetextSource?.trim();
  if (raw) return raw;

  const isKo = args.isKo;
  const parts: string[] = [];

  const goal = GOAL_LABEL[args.input.goal];
  if (goal) parts.push(isKo ? goal.ko : goal.en);

  const codes = args.regionCodes?.length
    ? args.regionCodes
    : args.input.regionCodes?.length
      ? args.input.regionCodes
      : args.input.region && args.input.region !== "all"
        ? [args.input.region]
        : [];
  if (codes.length > 0) {
    const regionText = codes
      .map((c) => plannerRegionLabel(String(c), isKo ? "ko" : "en"))
      .filter(Boolean)
      .join(isKo ? "·" : ", ");
    if (regionText) parts.push(regionText);
  }

  if (args.input.budgetMaxMan > 0) {
    parts.push(
      isKo
        ? `월 ${args.input.budgetMaxMan.toLocaleString("ko-KR")}만원`
        : `₩${(args.input.budgetMaxMan * 10_000).toLocaleString("en-US")}/mo`,
    );
  }

  const target = TARGET_LABEL[args.input.target];
  if (target) parts.push(isKo ? target.ko : target.en);

  const industryKey = recommendIndustryToPlannerIndustryKey(args.input.industry);
  if (industryKey !== "indOther") {
    const ind = PLANNER_INDUSTRY_LABELS[industryKey];
    if (ind) parts.push(isKo ? ind.ko : ind.en);
  }

  if (parts.length === 0) return null;
  return parts.join(isKo ? " · " : " · ");
}
