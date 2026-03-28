/**
 * Rule-based CRM signals (not a trained ML model).
 * Scores derive from budget tier, campaign history, and performance vs. benchmark.
 */

export type CustomerSegment = "high_value" | "potential" | "standard";

export type CrmScoringInput = {
  /** 1 = lowest budget band, 4 = highest */
  budgetTier: 1 | 2 | 3 | 4;
  totalCampaigns: number;
  completedCampaigns: number;
  /** CTR as ratio of benchmark (1.0 = on target) */
  ctrVsBenchmark: number;
  daysSinceLastCampaignEnd: number;
};

export function segmentCustomer(input: CrmScoringInput): CustomerSegment {
  let score = 0;
  score += input.budgetTier * 18;
  score += Math.min(input.totalCampaigns, 6) * 6;
  score += Math.min(input.completedCampaigns, 5) * 10;
  if (input.ctrVsBenchmark >= 1.08) score += 22;
  else if (input.ctrVsBenchmark >= 1.0) score += 12;
  else if (input.ctrVsBenchmark < 0.88) score -= 12;

  if (input.daysSinceLastCampaignEnd <= 90 && input.completedCampaigns > 0) {
    score += 8;
  }

  if (score >= 72) return "high_value";
  if (score >= 42) return "potential";
  return "standard";
}

export type RepurchaseResult = {
  score: number;
  labelKey: "repurchaseHigh" | "repurchaseMid" | "repurchaseLow";
};

/** 0–100 heuristic for “likelihood to run another campaign”. */
export function repurchaseLikelihood(input: CrmScoringInput): RepurchaseResult {
  const seg = segmentCustomer(input);
  let score = 35;
  if (seg === "high_value") score += 28;
  if (seg === "potential") score += 14;
  score += Math.min(input.completedCampaigns, 4) * 8;
  if (input.ctrVsBenchmark >= 1.05) score += 12;
  if (input.daysSinceLastCampaignEnd > 365) score -= 15;
  if (input.daysSinceLastCampaignEnd <= 60) score += 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let labelKey: RepurchaseResult["labelKey"] = "repurchaseMid";
  if (score >= 70) labelKey = "repurchaseHigh";
  else if (score < 45) labelKey = "repurchaseLow";

  return { score, labelKey };
}

/** Short bullet keys for admin UI (map with `useTranslations("adminCrm")`). */
export type SegmentRationaleKey =
  | "aiRuleBudgetBand4"
  | "aiRuleBudgetBand3"
  | "aiRuleBudgetBand2"
  | "aiRuleBudgetBand1"
  | "aiRuleMultiCampaign"
  | "aiRuleSingleCampaign"
  | "aiRuleNoHistory"
  | "aiRuleCtrOutperform"
  | "aiRuleCtrOnTrack"
  | "aiRuleCtrUnder"
  | "aiRuleRecencyFresh"
  | "aiRuleRecencyStale";

export function segmentRationaleKeys(input: CrmScoringInput): SegmentRationaleKey[] {
  const keys: SegmentRationaleKey[] = [];

  if (input.budgetTier >= 4) keys.push("aiRuleBudgetBand4");
  else if (input.budgetTier === 3) keys.push("aiRuleBudgetBand3");
  else if (input.budgetTier === 2) keys.push("aiRuleBudgetBand2");
  else keys.push("aiRuleBudgetBand1");

  if (input.completedCampaigns >= 2) keys.push("aiRuleMultiCampaign");
  else if (input.completedCampaigns === 1) keys.push("aiRuleSingleCampaign");
  else keys.push("aiRuleNoHistory");

  if (input.ctrVsBenchmark >= 1.08) keys.push("aiRuleCtrOutperform");
  else if (input.ctrVsBenchmark >= 1.0) keys.push("aiRuleCtrOnTrack");
  else if (input.ctrVsBenchmark < 0.92) keys.push("aiRuleCtrUnder");

  if (input.daysSinceLastCampaignEnd <= 90 && input.completedCampaigns > 0) {
    keys.push("aiRuleRecencyFresh");
  } else if (input.daysSinceLastCampaignEnd > 300) {
    keys.push("aiRuleRecencyStale");
  }

  return keys.slice(0, 5);
}
