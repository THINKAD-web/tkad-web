import { z } from "zod";

/** RFP 권역 그룹 — 광고주 원문 라벨을 유지한 채 구조화 */
export const rfpGroupSchema = z.object({
  id: z.string().min(1).max(64),
  /** 사용자 원문 그룹명 (예: "공항 권역") */
  label: z.string().min(1).max(120),
  regionKeywords: z.array(z.string().min(1).max(80)).max(40),
  mediaTypeKeywords: z.array(z.string().min(1).max(80)).max(40),
  budget: z.string().max(200).nullable().optional(),
  period: z.string().max(200).nullable().optional(),
  constraints: z.array(z.string().min(1).max(400)).max(30).optional(),
  packageHints: z.array(z.string().min(1).max(400)).max(30).optional(),
});

export type RfpGroup = z.infer<typeof rfpGroupSchema>;

/** 그룹 공통 캠페인 메타 (타겟·시기 등) */
export const rfpCampaignMetaSchema = z.object({
  brandName: z.string().max(160).nullable().optional(),
  target: z.string().max(400).nullable().optional(),
  period: z.string().max(200).nullable().optional(),
  industry: z.string().max(160).nullable().optional(),
  notes: z.array(z.string().min(1).max(400)).max(20).optional(),
});

export type RfpCampaignMeta = z.infer<typeof rfpCampaignMetaSchema>;

export const rfpProposalBriefSchema = z.object({
  groups: z.array(rfpGroupSchema).min(1).max(20),
  campaign: rfpCampaignMetaSchema.optional(),
});

export type RfpProposalBrief = z.infer<typeof rfpProposalBriefSchema>;

export const rfpParseRequestSchema = z.object({
  text: z.string().min(40).max(50_000),
  locale: z.enum(["ko", "en"]).optional().default("ko"),
});

export type RfpParseRequest = z.infer<typeof rfpParseRequestSchema>;
