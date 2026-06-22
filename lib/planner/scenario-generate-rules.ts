import type {
  PlannerCampaignGoal,
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import type { ScenarioInput } from "@/lib/planner/scenario-types";

/** 목표별 기본 기간·예산·유형 (만원) */
export const GOAL_SCENARIO_BASE: Record<
  PlannerCampaignGoal,
  { months: number; budgetMan: number; categories: PlannerCategory[] }
> = {
  brand: { months: 3, budgetMan: 8_000, categories: ["digital", "static"] },
  launch: {
    months: 2,
    budgetMan: 12_000,
    categories: ["digital", "static", "mobile"],
  },
  event: { months: 1, budgetMan: 6_000, categories: ["mobile", "static"] },
  sales: { months: 2, budgetMan: 5_000, categories: ["digital", "mobile"] },
  local: { months: 3, budgetMan: 3_000, categories: ["static", "mobile"] },
};

/** 업종 → 선호 상권 (matching-engine REGION_DEFS 키) */
export const INDUSTRY_DISTRICT_HINTS: Record<PlannerIndustryKey, string[]> = {
  indFb: ["hongdae", "myeongdong", "gangnam"],
  indRetail: ["gangnam", "myeongdong", "seongsu"],
  indTech: ["gangnam", "yeouido"],
  indFinance: ["yeouido", "gangnam"],
  indEnt: ["hongdae", "gangnam"],
  indOther: ["gangnam", "seoul"],
};

export const DISTRICT_LABEL_KO: Record<string, string> = {
  gangnam: "강남",
  hongdae: "홍대",
  seongsu: "성수",
  myeongdong: "명동",
  yeouido: "여의도",
  busan: "부산",
  jeju: "제주",
  seoul: "서울",
};

export const DISTRICT_LABEL_EN: Record<string, string> = {
  gangnam: "Gangnam",
  hongdae: "Hongdae",
  seongsu: "Seongsu",
  myeongdong: "Myeongdong",
  yeouido: "Yeouido",
  busan: "Busan",
  jeju: "Jeju",
  seoul: "Seoul",
};

export const GOAL_LABEL_KO: Record<PlannerCampaignGoal, string> = {
  brand: "브랜드 인지",
  launch: "런칭",
  event: "이벤트",
  sales: "매출·전환",
  local: "지역 밀착",
};

export const GOAL_LABEL_EN: Record<PlannerCampaignGoal, string> = {
  brand: "Brand awareness",
  launch: "Launch",
  event: "Event",
  sales: "Sales",
  local: "Local",
};

export const INDUSTRY_LABEL_KO: Record<PlannerIndustryKey, string> = {
  indFb: "F&B",
  indRetail: "리테일",
  indTech: "테크",
  indFinance: "금융",
  indEnt: "엔터",
  indOther: "일반",
};

export const INDUSTRY_LABEL_EN: Record<PlannerIndustryKey, string> = {
  indFb: "F&B",
  indRetail: "Retail",
  indTech: "Tech",
  indFinance: "Finance",
  indEnt: "Entertainment",
  indOther: "General",
};

/** 입력이 거의 비었을 때 쓰는 대표 시드 (빈 화면 방지) */
export const FALLBACK_SCENARIO_INPUTS: ScenarioInput[] = [
  {
    goal: "brand",
    industryKey: "indRetail",
    regions: ["seoul"],
    ageKeys: [],
  },
  {
    goal: "launch",
    industryKey: "indFb",
    regions: ["seoul", "gyeonggi"],
    ageKeys: ["age20s", "age30s"],
  },
  {
    goal: "local",
    industryKey: "indOther",
    regions: ["seoul"],
    ageKeys: [],
  },
];
