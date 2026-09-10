import { z } from "zod";

export const CAMPAIGN_BUILDER_PAYLOAD_VERSION = 1 as const;

export const campaignBuilderDocumentTypeSchema = z.enum(["proposal", "report"]);

export type CampaignBuilderDocumentType = z.infer<
  typeof campaignBuilderDocumentTypeSchema
>;

export const digitalCampaignLineSchema = z.object({
  slug: z.string().min(1),
  mediaId: z.string().optional(),
  budgetWon: z.number().int().min(0),
  note: z.string().optional(),
});

export const oohCampaignLineSchema = z.object({
  mediaId: z.string().min(1),
  slug: z.string().optional(),
  name: z.string(),
  location: z.string().optional(),
  region: z.string().optional(),
  type: z.string().optional(),
  priceWon: z.number().int().min(0).optional(),
  note: z.string().optional(),
});

export const customExecutionLineSchema = z.object({
  id: z.string(),
  mediaName: z.string().min(1),
  targeting: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budgetWon: z.number().int().min(0),
  actualReach: z.number().int().nullable().optional(),
  actualClicks: z.number().int().nullable().optional(),
  notes: z.string().optional(),
});

export const pacingPhaseSchema = z.object({
  label: z.string().min(1).max(80),
  sharePct: z.number().int().min(0).max(100),
  description: z.string().max(500),
});

export const campaignBuilderSectionTitlesOverrideSchema = z.object({
  digital: z.string().max(120).optional(),
  ooh: z.string().max(120).optional(),
  custom: z.string().max(120).optional(),
  kpi: z.string().max(80).optional(),
  donut: z.string().max(120).optional(),
  insights: z.string().max(120).optional(),
});

export const campaignBuilderInsightSubtitlesOverrideSchema = z.object({
  pacing: z.string().max(80).optional(),
  creative: z.string().max(80).optional(),
  operational: z.string().max(80).optional(),
});

export const campaignBuilderSectionNoticesOverrideSchema = z.object({
  digitalEstimateNotice: z.string().max(2000).optional(),
  oohSectionNotice: z.string().max(2000).optional(),
  executionNotice: z.string().max(2000).optional(),
  insightsHint: z.string().max(2000).optional(),
});

export const campaignBuilderKpiCardOverrideSchema = z.object({
  id: z.enum([
    "activeChannels",
    "totalBudget",
    "expectedReach",
    "avgBudget",
    "executionLines",
    "executionBudget",
    "actualReach",
    "actualClicks",
  ]),
  labelOverride: z.string().max(80).optional(),
  hidden: z.boolean().optional(),
});

/** User-edited insight cards and section copy — overrides auto-generated content per field. */
export const campaignInsightsOverrideSchema = z.object({
  pacingPlan: z.array(pacingPhaseSchema).optional(),
  creativeDirections: z.array(z.string().max(500)).optional(),
  operationalNotes: z.array(z.string().max(500)).optional(),
  disclaimer: z.string().max(2000).optional(),
  sectionTitles: campaignBuilderSectionTitlesOverrideSchema.optional(),
  sectionNotices: campaignBuilderSectionNoticesOverrideSchema.optional(),
  insightSubtitles: campaignBuilderInsightSubtitlesOverrideSchema.optional(),
  kpiCards: z.array(campaignBuilderKpiCardOverrideSchema).optional(),
});

export const campaignBuilderPayloadSchema = z.object({
  version: z.literal(CAMPAIGN_BUILDER_PAYLOAD_VERSION),
  mode: z.enum(["digital", "ooh"]),
  documentType: campaignBuilderDocumentTypeSchema,
  title: z.string().min(1),
  clientCompany: z.string().optional(),
  clientName: z.string().optional(),
  notes: z.string().optional(),
  digitalLines: z.array(digitalCampaignLineSchema).default([]),
  oohLines: z.array(oohCampaignLineSchema).default([]),
  customLines: z.array(customExecutionLineSchema).default([]),
  insightsOverride: campaignInsightsOverrideSchema.optional(),
});

export type DigitalCampaignLine = z.infer<typeof digitalCampaignLineSchema>;
export type OohCampaignLine = z.infer<typeof oohCampaignLineSchema>;
export type CustomExecutionLine = z.infer<typeof customExecutionLineSchema>;
export type CampaignInsightsOverride = z.infer<
  typeof campaignInsightsOverrideSchema
>;
export type CampaignBuilderPayload = z.infer<typeof campaignBuilderPayloadSchema>;

export type CampaignBuilderReportListItem = {
  id: string;
  title: string;
  mode: "digital" | "ooh";
  documentType: CampaignBuilderDocumentType;
  updatedAt: string;
  createdByAdmin: string;
};
