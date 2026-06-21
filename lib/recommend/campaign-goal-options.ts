import type { CampaignGoal } from "@/lib/ai-media-recommend";

/** /recommend 구조화 폼 — 퍼널 3옵션 (인지/고려/전환) */
export const RECOMMEND_FUNNEL_GOAL_OPTS: {
  value: CampaignGoal;
  titleKey: "form.goalAwareness" | "form.goalConsideration" | "form.goalConversion";
}[] = [
  { value: "awareness", titleKey: "form.goalAwareness" },
  { value: "consideration", titleKey: "form.goalConsideration" },
  { value: "conversion", titleKey: "form.goalConversion" },
];

/** /recommend 자유입력 확인 화면 — 파서 enum과 동일 (launch 포함) */
export const RECOMMEND_FREETEXT_GOAL_OPTS: {
  value: "awareness" | "consideration" | "launch";
  titleKey:
    | "form.goalAwareness"
    | "form.goalConsideration"
    | "form.goalLaunch";
}[] = [
  { value: "awareness", titleKey: "form.goalAwareness" },
  { value: "consideration", titleKey: "form.goalConsideration" },
  { value: "launch", titleKey: "form.goalLaunch" },
];
