import type { PlannerCampaignGoal } from "@/lib/planner-logic";

/** 퍼널 정본 축 — 인지 / 고려 / 전환 */
export type CampaignFunnel = "awareness" | "consideration" | "conversion";

/** 보조 태그 — 이벤트·로컬·런칭 등 퍼널과 독립 속성 */
export type CampaignGoalTag = "launch" | "event" | "local";

export type NormalizedCampaignGoal = {
  funnel: CampaignFunnel;
  tags: CampaignGoalTag[];
  /** UI·메트릭 세분용 플래너 레거시 키 (저장 키와 동일 유지) */
  displayKey: PlannerCampaignGoal;
  /** 원본 입력 문자열 */
  legacyKey: string;
};

const PLANNER_KEYS = new Set<string>([
  "brand",
  "launch",
  "event",
  "sales",
  "local",
]);

const RECOMMEND_KEYS = new Set<string>([
  "awareness",
  "consideration",
  "launch",
  "conversion",
]);

const PROPOSAL_KEYS = new Set<string>(["awareness", "conversion", "event"]);

function isPlannerKey(v: string): v is PlannerCampaignGoal {
  return PLANNER_KEYS.has(v);
}

type RawGoalMapping = {
  funnel: CampaignFunnel;
  tags: CampaignGoalTag[];
  displayKey: PlannerCampaignGoal;
};

const RAW_GOAL_MAP: Record<string, RawGoalMapping> = {
  brand: { funnel: "awareness", tags: [], displayKey: "brand" },
  awareness: { funnel: "awareness", tags: [], displayKey: "brand" },
  launch: { funnel: "awareness", tags: ["launch"], displayKey: "launch" },
  event: { funnel: "consideration", tags: ["event"], displayKey: "event" },
  consideration: {
    funnel: "consideration",
    tags: [],
    displayKey: "event",
  },
  sales: { funnel: "conversion", tags: [], displayKey: "sales" },
  conversion: { funnel: "conversion", tags: [], displayKey: "sales" },
  local: { funnel: "conversion", tags: ["local"], displayKey: "local" },
};

const DEFAULT_MAPPING: RawGoalMapping = {
  funnel: "awareness",
  tags: [],
  displayKey: "brand",
};

/**
 * 레거시·추천·제안서 목표 문자열을 퍼널 축 + 보조 태그로 정규화.
 * 저장 키(플래너 5종)는 변경하지 않으며 read-time 변환만 수행.
 */
export function normalizeCampaignGoal(
  raw: string | null | undefined,
): NormalizedCampaignGoal {
  const legacyKey =
    typeof raw === "string" && raw.trim().length > 0 ?
      raw.trim().toLowerCase()
    : "";
  if (!legacyKey) {
    return {
      funnel: DEFAULT_MAPPING.funnel,
      tags: [],
      displayKey: DEFAULT_MAPPING.displayKey,
      legacyKey: "",
    };
  }

  const mapped = RAW_GOAL_MAP[legacyKey] ?? DEFAULT_MAPPING;

  return {
    funnel: mapped.funnel,
    tags: [...mapped.tags],
    displayKey: mapped.displayKey,
    legacyKey,
  };
}

/** 플래너 store/API에 쓰이는 레거시 키인지 */
export function isPlannerCampaignGoalKey(
  v: string,
): v is PlannerCampaignGoal {
  return isPlannerKey(v);
}

/** 추천 structured/freetext goal 키 */
export function isRecommendCampaignGoalKey(v: string): boolean {
  return RECOMMEND_KEYS.has(v);
}

/** 제안서 goal 키 */
export function isProposalCampaignGoalKey(v: string): boolean {
  return PROPOSAL_KEYS.has(v);
}

/** 매칭 엔진·어댑터용 퍼널 문자열 */
export function matchingGoalFromRaw(
  raw: string | null | undefined,
): CampaignFunnel {
  return normalizeCampaignGoal(raw).funnel;
}

/** 매칭 엔진 scoreCategory 보조 태그 */
export function matchingGoalTagsFromRaw(
  raw: string | null | undefined,
): CampaignGoalTag[] {
  return normalizeCampaignGoal(raw).tags;
}
