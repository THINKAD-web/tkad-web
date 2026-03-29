import { generateCampaignReport } from "@/lib/ai-content-generator";
import { getPrisma } from "@/lib/prisma";

/** 캠페인 완료 시 SuccessCase 초안 upsert (이미 published면 건너뜀). */
export async function upsertDraftSuccessCaseFromCampaign(
  campaignId: string,
): Promise<void> {
  const db = getPrisma();
  const prev = await db.successCase.findUnique({ where: { campaignId } });
  if (prev?.status === "published") return;

  const row = await generateCampaignReport(campaignId);

  await db.successCase.upsert({
    where: { campaignId },
    create: {
      campaignId,
      status: "draft",
      clientName: row.clientName,
      industry: row.industry,
      titleKo: row.titleKo,
      titleEn: row.titleEn,
      summaryKo: row.summaryKo,
      challengeKo: row.challengeKo,
      solutionKo: row.solutionKo,
      resultsKo: row.resultsKo,
      metricsJson: row.metricsJson ?? undefined,
      mediaUsed: row.mediaUsed,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      thumbnailUrl: row.thumbnailUrl,
      galleryUrls: row.galleryUrls ?? [],
      testimonialKo: row.testimonialKo,
      publishedAt: null,
    },
    update: {
      clientName: row.clientName,
      industry: row.industry,
      titleKo: row.titleKo,
      titleEn: row.titleEn,
      summaryKo: row.summaryKo,
      challengeKo: row.challengeKo,
      solutionKo: row.solutionKo,
      resultsKo: row.resultsKo,
      metricsJson: row.metricsJson ?? undefined,
      mediaUsed: row.mediaUsed,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      thumbnailUrl: row.thumbnailUrl,
      galleryUrls: row.galleryUrls ?? [],
      testimonialKo: row.testimonialKo,
    },
  });
}
