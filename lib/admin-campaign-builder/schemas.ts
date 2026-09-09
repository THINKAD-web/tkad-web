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
});

export const oohCampaignLineSchema = z.object({
  mediaId: z.string().min(1),
  slug: z.string().optional(),
  name: z.string(),
  location: z.string().optional(),
  region: z.string().optional(),
  type: z.string().optional(),
  priceWon: z.number().int().min(0).optional(),
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

export const regionWeightSchema = z.object({
  region: z.string().min(1).max(80),
  sharePct: z.number().int().min(0).max(100),
});

/** User-edited insight cards — overrides auto-generated lists per field. */
export const campaignInsightsOverrideSchema = z.object({
  pacingPlan: z.array(pacingPhaseSchema).optional(),
  creativeDirections: z.array(z.string().max(500)).optional(),
  operationalNotes: z.array(z.string().max(500)).optional(),
  regionWeighting: z.array(regionWeightSchema).nullable().optional(),
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
