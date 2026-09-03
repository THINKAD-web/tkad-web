import type { DigitalMixPayload } from "@/lib/integrated/field-adapters";
import type { CampaignGoal, Industry, MixInput } from "@/lib/digital/mix-types";

const INDUSTRIES = new Set<Industry>([
  "ECOMMERCE",
  "BEAUTY",
  "FNB",
  "APP",
  "EDU",
  "MEDICAL",
  "REALESTATE",
  "B2B",
  "LOCAL",
  "ENTER",
]);

const GOALS = new Set<CampaignGoal>([
  "AWARENESS",
  "TRAFFIC",
  "CONVERSION",
  "APP_INSTALL",
  "VISIT",
  "LEAD",
]);

function asIndustry(raw: string): Industry {
  const v = raw.trim().toUpperCase() as Industry;
  return INDUSTRIES.has(v) ? v : "LOCAL";
}

function asGoal(raw: string): CampaignGoal {
  const v = raw.trim().toUpperCase() as CampaignGoal;
  return GOALS.has(v) ? v : "AWARENESS";
}

export function digitalMixPayloadToMixInput(payload: DigitalMixPayload): MixInput {
  return {
    industry: asIndustry(payload.industry),
    goal: asGoal(payload.goal),
    target: {
      age: payload.target.age,
      gender: payload.target.gender,
      geo: payload.target.geo,
    },
    budgetMonthly: payload.budgetMonthly,
    periodWeeks: payload.periodWeeks,
  };
}
