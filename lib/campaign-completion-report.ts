import {
  campaignCompletionPdfToBuffer,
  type BuildCampaignCompletionPdfParams,
  type CompletionPdfFinancial,
} from "@/lib/build-campaign-completion-pdf";
import { generateCampaignCompletionReportSections } from "@/lib/ai-content-generator";
import { getPrisma } from "@/lib/prisma";

/**
 * 캠페인 데이터 + AI 4섹션 → 완료 보고서 PDF 바이너리.
 */
export async function buildCampaignCompletionReportPdfBuffer(
  campaignId: string,
): Promise<Buffer> {
  const ai = await generateCampaignCompletionReportSections(campaignId);
  const db = getPrisma();
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      scheduleEvents: { orderBy: { startsAt: "asc" } },
      financialDocs: { orderBy: { createdAt: "desc" } },
      proofPhotos: { orderBy: { createdAt: "desc" }, take: 40 },
      mediaBookings: { include: { media: true } },
    },
  });

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  const financialDocs: CompletionPdfFinancial[] = campaign.financialDocs.map(
    (d) => ({
      kind: d.kind,
      title: d.title,
      amountKrw: d.amountKrw,
      status: d.status,
    }),
  );

  const params: BuildCampaignCompletionPdfParams = {
    campaignName: campaign.name,
    clientCompany: campaign.clientCompany,
    clientName: campaign.clientName,
    clientEmail: campaign.clientEmail,
    status: campaign.status,
    notes: campaign.notes,
    scheduleEvents: campaign.scheduleEvents.map((e) => ({
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      kind: e.kind,
    })),
    proofPhotos: campaign.proofPhotos.map((p) => ({
      imageUrl: p.imageUrl,
      caption: p.caption,
    })),
    financialDocs,
    mediaBookings: campaign.mediaBookings.map((b) => ({
      title: b.title,
      mediaName: b.media?.name ?? "—",
      location: b.media?.location ?? "—",
      type: b.media?.type ?? "—",
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      status: b.status,
    })),
    aiOverviewKo: ai.overviewKo,
    aiMediaDetailKo: ai.mediaDetailKo,
    aiPerformanceKo: ai.performanceKo,
    aiInsightsKo: ai.aiInsightsKo,
  };

  return campaignCompletionPdfToBuffer(params);
}
