import type { MediaItem } from "@/lib/media-data";
import type { PlannerIndustryKey } from "@/lib/planner/types";

/** 플래너 업종 칩 → matching-engine industry 문자열 */
export const PLANNER_INDUSTRY_TO_MATCHING: Record<PlannerIndustryKey, string> = {
  indFb: "fnb",
  indRetail: "retail",
  indTech: "tech",
  indFinance: "finance",
  indEnt: "entertainment",
  indOther: "other",
};

/**
 * 매체 텍스트·집행 이력 키워드 — `scoreIndustry` 보조 신호.
 * (INDUSTRY_DEFS 정규식과 병행, 플래너 6종 업종 전용)
 */
export const PLANNER_INDUSTRY_HINTS: Record<
  Exclude<PlannerIndustryKey, "indOther">,
  string[]
> = {
  indFb: [
    "f&b",
    "fb",
    "food",
    "beverage",
    "cafe",
    "coffee",
    "restaurant",
    "dining",
    "식음료",
    "카페",
    "음식",
    "레스토랑",
    "주류",
    "베이커리",
    "상권",
  ],
  indRetail: [
    "retail",
    "mall",
    "department",
    "mart",
    "shop",
    "store",
    "boutique",
    "리테일",
    "백화점",
    "마트",
    "쇼핑",
    "매장",
    "아울렛",
  ],
  indTech: [
    "tech",
    "it",
    "software",
    "saas",
    "ai",
    "digital",
    "electronics",
    "smartphone",
    "테크",
    "소프트웨어",
    "전자",
    "ict",
    "판교",
    "여의도",
  ],
  indFinance: [
    "finance",
    "bank",
    "insurance",
    "fintech",
    "investment",
    "card",
    "금융",
    "은행",
    "보험",
    "증권",
    "카드",
  ],
  indEnt: [
    "entertainment",
    "concert",
    "game",
    "esports",
    "cinema",
    "culture",
    "k-pop",
    "엔터",
    "콘서트",
    "게임",
    "영화",
    "문화",
  ],
};

export function plannerIndustryHaystack(m: MediaItem): string {
  return [
    m.name,
    m.features,
    m.featuresEn,
    m.description,
    m.descriptionEn,
    m.catalogDescription,
    m.catalogDescriptionEn,
    m.nearbyFacilities,
    m.nearbyFacilitiesEn,
    m.advertiserHistory,
    m.advertiserHistoryEn,
    m.location,
    m.subCategory,
    ...(m.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** 0–1 보조 점수 — matching-engine industry 점수에 가산 */
export function plannerIndustryHintScore(
  m: MediaItem,
  industryRaw: string,
): number {
  const key = Object.entries(PLANNER_INDUSTRY_TO_MATCHING).find(
    ([, v]) => v === industryRaw.trim().toLowerCase(),
  )?.[0] as PlannerIndustryKey | undefined;
  if (!key || key === "indOther") return 0;
  const hints = PLANNER_INDUSTRY_HINTS[key];
  const hay = plannerIndustryHaystack(m);
  if (!hay.trim()) return 0;
  const hits = hints.filter((h) => hay.includes(h.toLowerCase())).length;
  if (hits <= 0) return 0;
  return Math.min(1, 0.35 + hits * 0.12);
}

/** 보고서 전략 문구 — 업종별 1문장 (규칙 기반) */
export function industryStrategyLine(
  isKo: boolean,
  industryKey: PlannerIndustryKey | null | undefined,
  industryText: string,
): string | null {
  const key = industryKey ?? "indOther";
  if (isKo) {
    const map: Record<PlannerIndustryKey, string> = {
      indFb: `${industryText} 업종 특성상 식음·상권 동선과 인접한 매체를 우선 반영했습니다.`,
      indRetail: `${industryText} 업종에 맞춰 쇼핑·유통 동선 매체 비중을 높였습니다.`,
      indTech: `${industryText} 업종에 맞춰 업무·테크 클러스터·디지털 매체를 우선 고려했습니다.`,
      indFinance: `${industryText} 업종에 맞춰 금융·비즈니스 중심가 노출 매체를 반영했습니다.`,
      indEnt: `${industryText} 업종에 맞춰 문화·이벤트·젊은 층 동선 매체를 우선 배치했습니다.`,
      indOther: "",
    };
    const line = map[key];
    return line?.trim() ? line : null;
  }
  const mapEn: Record<PlannerIndustryKey, string> = {
    indFb: `For ${industryText}, we prioritized F&B and retail-corridor placements.`,
    indRetail: `For ${industryText}, shopping-district and retail-traffic media are weighted higher.`,
    indTech: `For ${industryText}, tech clusters and digital inventory are prioritized.`,
    indFinance: `For ${industryText}, finance-district and business-corridor media are emphasized.`,
    indEnt: `For ${industryText}, culture, events, and youth-corridor media are prioritized.`,
    indOther: "",
  };
  const line = mapEn[key];
  return line?.trim() ? line : null;
}
