import {
  OOH_EXPERT_PERSONA,
  OOH_EXPERT_STRUCTURED_OUTPUT_RULES,
  withOohExpertContext,
} from "@/lib/ai-ooh-expert";
import {
  INTEGRATED_MEDIA_PERSONA,
  ONLINE_EXPERT_PERSONA,
  withIntegratedMediaContext,
  withOnlineExpertContext,
} from "@/lib/ai-online-expert";
import type { ReportCartComposition } from "@/lib/plan-cart-report/split-portfolio-by-channel";

export type ProposalComposition = ReportCartComposition;

const OOH_TASK =
  "You draft client-ready OOH campaign proposals for THINKAD (싱커드). Use only the provided media IDs in mediaMix.";

const ONLINE_NARRATIVE_TASK = `You draft narrative sections ONLY for THINKAD online media proposals.
Pre-calculated overview, strategy, budget, and KPI metrics are injected server-side — do NOT invent numbers.
Output mediaMix (role + rationale; budgetSharePct must match the fact block), timeline, and expectedOutcomes.
Use channel·targeting·creative language — never OOH vocabulary (동선, 상권, 유동인구, foot traffic).`;

const MIXED_NARRATIVE_TASK = `You draft narrative sections for THINKAD integrated OOH + online proposals.
Pre-calculated facts per channel are provided — do NOT invent KPI numbers.
Separate OOH roles (exposure, district, format) from online roles (platform, targeting, conversion).
Output mediaMix for ALL listed media IDs, timeline, and expectedOutcomes.`;

const STUDIO_ONLINE_TASK = `You draft narrative sections for THINKAD Studio proposals with online media.
Do NOT output roiScenarios, metrics, budgetAllocation, overview, or strategy when instructed — server fills them.
Fill ONLY the sections requested in the user message.`;

const STUDIO_MIXED_TASK = `You draft narrative sections for THINKAD Studio integrated proposals.
Do NOT invent KPI numbers. Separate OOH and online rationale in mediaMix.
Do NOT output roiScenarios or metrics when a fact block says they are pre-filled.`;

export function resolveProposalSystemPrompt(
  composition: ProposalComposition,
  studio = false,
): string {
  switch (composition) {
    case "onlyOoh":
      return withOohExpertContext(`${OOH_EXPERT_PERSONA}\n\n${OOH_EXPERT_STRUCTURED_OUTPUT_RULES}\n\n${OOH_TASK}`);
    case "onlyOnline":
      return withOnlineExpertContext(studio ? STUDIO_ONLINE_TASK : ONLINE_NARRATIVE_TASK);
    case "mixed":
      return withIntegratedMediaContext(studio ? STUDIO_MIXED_TASK : MIXED_NARRATIVE_TASK);
  }
}

export function integratedPersonaSnippet(): string {
  return INTEGRATED_MEDIA_PERSONA;
}

export function onlinePersonaSnippet(): string {
  return ONLINE_EXPERT_PERSONA;
}
