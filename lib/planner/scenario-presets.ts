import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type {
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";

export const PLANNER_SCENARIO_PRESET_KEYS = [
  "launchBeauty",
  "localFb",
  "eventEnt",
  "salesRetail",
  "brandTech",
] as const;

export type PlannerScenarioPresetId =
  (typeof PLANNER_SCENARIO_PRESET_KEYS)[number];

export function isPlannerScenarioPresetId(
  v: unknown,
): v is PlannerScenarioPresetId {
  return (
    typeof v === "string" &&
    (PLANNER_SCENARIO_PRESET_KEYS as readonly string[]).includes(v)
  );
}

export type PlannerScenarioPresetDef = {
  id: PlannerScenarioPresetId;
  titleKey: string;
  descKey: string;
  goal: PlannerCampaignGoal;
  industryKey: PlannerIndustryKey;
  regions: string[];
  seoulZones: PlannerSeoulZoneKey[];
  categories: PlannerCategory[];
  followUp: PlannerGoalFollowUp;
};

/** goal×industry 시나리오 — 한 번에 추천 세팅 (이후 수동 조정 가능) */
export const PLANNER_SCENARIO_PRESETS: readonly PlannerScenarioPresetDef[] = [
  {
    id: "launchBeauty",
    titleKey: "scenarioLaunchBeauty",
    descKey: "scenarioLaunchBeautyDesc",
    goal: "launch",
    industryKey: "indRetail",
    regions: ["seoul"],
    seoulZones: ["gangnam", "seongsu"],
    categories: ["digital", "static"],
    followUp: { launchFocusWeeks: 4, launchTiming: "asap" },
  },
  {
    id: "localFb",
    titleKey: "scenarioLocalFb",
    descKey: "scenarioLocalFbDesc",
    goal: "local",
    industryKey: "indFb",
    regions: ["seoul"],
    seoulZones: ["hongdae", "myeongdong"],
    categories: ["static", "mobile"],
    followUp: { localRadiusKm: 3 },
  },
  {
    id: "eventEnt",
    titleKey: "scenarioEventEnt",
    descKey: "scenarioEventEntDesc",
    goal: "event",
    industryKey: "indEnt",
    regions: ["seoul"],
    seoulZones: ["hongdae", "gangnam"],
    categories: ["digital", "mobile"],
    followUp: { eventDurationDays: 7 },
  },
  {
    id: "salesRetail",
    titleKey: "scenarioSalesRetail",
    descKey: "scenarioSalesRetailDesc",
    goal: "sales",
    industryKey: "indRetail",
    regions: ["seoul"],
    seoulZones: ["gangnam", "myeongdong"],
    categories: ["digital", "static", "mobile"],
    followUp: { conversionChannel: "both" },
  },
  {
    id: "brandTech",
    titleKey: "scenarioBrandTech",
    descKey: "scenarioBrandTechDesc",
    goal: "brand",
    industryKey: "indTech",
    regions: ["seoul"],
    seoulZones: ["gangnam", "yeouido"],
    categories: ["digital", "static"],
    followUp: {},
  },
] as const;

export function getScenarioPreset(
  id: PlannerScenarioPresetId,
): PlannerScenarioPresetDef | undefined {
  return PLANNER_SCENARIO_PRESETS.find((p) => p.id === id);
}
