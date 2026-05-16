import { z } from "zod";

export const CampaignReportMetricsSchema = z
  .object({
    totalImpressions: z.number().optional(),
    totalBudgetKrw: z.number().optional(),
    avgCpm: z.number().optional(),
    mediaCount: z.number().optional(),
    /** 일별 노출 추이 (캠페인 일수 또는 고정 길이) */
    dailyImpressions: z.array(z.number()).max(90).optional(),
    /** 주별 노출 추이 */
    weeklyImpressions: z.array(z.number()).max(52).optional(),
  })
  .optional();

export const GenerateCampaignReportBodySchema = z.object({
  campaignId: z.string().min(1),
  brandName: z.string().max(200).optional(),
  period: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  mediaIds: z.array(z.string()).max(50).optional(),
  metrics: CampaignReportMetricsSchema,
  accountManager: z.string().max(120).optional(),
  nextCampaignProposal: z.string().max(4000).optional(),
  /** true 시 광고주 이메일로 PDF 발송 */
  sendEmail: z.boolean().optional().default(false),
  /** Bunny 업로드 생략하고 PDF만 base64 반환 (테스트용) */
  skipUpload: z.boolean().optional().default(false),
});

export type GenerateCampaignReportBody = z.infer<
  typeof GenerateCampaignReportBodySchema
>;

export type GenerateCampaignReportResult = {
  campaignId: string;
  pdfUrl: string | null;
  filename: string;
  generatedAt: string;
  emailSent: boolean;
  emailError?: string;
};
