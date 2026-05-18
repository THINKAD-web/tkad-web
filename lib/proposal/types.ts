import { z } from "zod";

export const PROPOSAL_GOALS = ["awareness", "conversion", "event"] as const;
export type ProposalGoal = (typeof PROPOSAL_GOALS)[number];

export const proposalInputSchema = z.object({
  brandName: z.string().min(1).max(120),
  industry: z.string().min(1).max(80),
  campaignName: z.string().min(1).max(160),
  targetAge: z.string().max(80).optional().default(""),
  targetGender: z.string().max(40).optional().default(""),
  targetInterests: z.string().max(300).optional().default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  budgetManwon: z.number().int().min(100).max(100_000),
  goal: z.enum(PROPOSAL_GOALS),
  regions: z.array(z.string().min(1)).min(1).max(12),
  mediaIds: z.array(z.string().min(1)).min(1).max(20),
  loadedPlanId: z.string().optional().nullable(),
  locale: z.enum(["ko", "en"]).optional().default("ko"),
});

export type ProposalInput = z.infer<typeof proposalInputSchema>;

export const proposalMediaMixItemSchema = z.object({
  mediaId: z.string(),
  mediaName: z.string(),
  role: z.string(),
  rationale: z.string(),
  budgetSharePct: z.number().min(0).max(100),
});

export const proposalBudgetRowSchema = z.object({
  label: z.string(),
  amountWon: z.number().int().min(0),
  sharePct: z.number().min(0).max(100),
});

export const proposalTimelineItemSchema = z.object({
  phase: z.string(),
  period: z.string(),
  tasks: z.array(z.string()).min(1),
});

export const proposalOutputSchema = z.object({
  overview: z.string(),
  strategy: z.string(),
  mediaMix: z.array(proposalMediaMixItemSchema).min(1),
  budgetAllocation: z.array(proposalBudgetRowSchema).min(1),
  metrics: z.object({
    estimatedImpressions: z.number().int().min(0),
    estimatedReach: z.number().int().min(0),
    estimatedCpm: z.number().int().min(0),
  }),
  timeline: z.array(proposalTimelineItemSchema).min(1),
  expectedOutcomes: z.array(z.string()).min(1),
});

export type CampaignProposalOutput = z.infer<typeof proposalOutputSchema>;

export const PROPOSAL_ID_RE = /^c[a-z0-9]{24,}$/i;

export function isSavedCampaignProposalId(id: string): boolean {
  return PROPOSAL_ID_RE.test(id.trim());
}
