import type { PrismaClient } from "@prisma/client";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { recommendMedia } from "@/lib/ai-media-recommend";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { createNotification } from "@/lib/notifications";
import { siteUrl } from "@/lib/seo";

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00+09:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function runCampaignRenewalProposals(
  db: PrismaClient,
): Promise<{ generated: number; emailed: number }> {
  const today = new Date();
  const todayYmd = today.toISOString().slice(0, 10);
  const targetEndYmd = addDays(todayYmd, -5);
  const { start } = {
    start: new Date(`${targetEndYmd}T00:00:00+09:00`),
  };
  const end = new Date(`${targetEndYmd}T23:59:59.999+09:00`);

  const campaigns = await db.campaign.findMany({
    where: {
      status: "completed",
      endDate: { gte: start, lte: end },
      ownerUserId: { not: null },
      renewalProposal: null,
    },
    include: {
      proofPhotos: { take: 5 },
      mediaBookings: {
        where: { status: "confirmed" },
        include: { media: true },
      },
      mediaReviews: true,
    },
  });

  const catalog = await fetchPublicMediaCatalog();
  let generated = 0;
  let emailed = 0;

  for (const c of campaigns) {
    const mediaIds = c.mediaBookings.map((b) => b.mediaId);
    const wellRated = c.mediaReviews
      .filter((r) => r.rating >= 4)
      .map((r) => r.mediaId);
    const topMedia = wellRated.length > 0 ? wellRated : mediaIds;

    const bookingSumMan = Math.round(
      c.mediaBookings.reduce((s, b) => s + (b.budgetWon ?? 0), 0) / 10_000,
    );
    const budgetMan = c.budgetMax ?? c.budgetMin ?? (bookingSumMan || 1000);

    const scored = recommendMedia(
      {
        goal: "awareness",
        target: "mass",
        budgetMaxMan: budgetMan,
        region: "all",
        industry: "other",
      },
      catalog.filter((m) => !mediaIds.includes(m.id) || topMedia.includes(m.id)),
      catalog,
    );

    const picks = scored.slice(0, 4).map((s) => ({
      mediaId: s.item.id,
      name: s.item.name,
      score: s.score,
      reason: s.reasons?.[0]?.ko ?? "이전 캠페인 성과 기반",
    }));

    const strengths =
      topMedia.length > 0
        ? `잘된 매체: ${c.mediaBookings
            .filter((b) => topMedia.includes(b.mediaId))
            .map((b) => b.media?.name)
            .filter(Boolean)
            .join(", ")}`
        : "집행 매체 데이터 기반";

    const improvements =
      picks.length > 0
        ? `보완 제안: ${picks.map((p) => p.name).join(", ")} 추가 검토`
        : "예산·지역 조건에 맞는 신규 매체 믹스 제안";

    const summaryKo = [
      `「${c.name}」캠페인 결과를 바탕으로 한 다음 제안입니다.`,
      strengths,
      improvements,
      `인증 사진 ${c.proofPhotos.length}건 · 리뷰 ${c.mediaReviews.length}건 반영.`,
    ].join("\n");

    const proposalJson = {
      sourceCampaignId: c.id,
      sourceCampaignName: c.name,
      budgetMan,
      strengths,
      improvements,
      recommendedMedia: picks,
      generatedAt: new Date().toISOString(),
    };

    await db.campaignRenewalProposal.create({
      data: {
        campaignId: c.id,
        proposalJson,
        summaryKo,
      },
    });
    generated += 1;

    if (!c.ownerUserId) continue;

    const plannerLink = `/planner?renewFrom=${c.id}`;
    await createNotification({
      userId: c.ownerUserId,
      type: "REPORT_READY",
      title: "다음 캠페인 제안이 준비됐어요",
      body: summaryKo.slice(0, 200),
      link: plannerLink,
      dedupeKey: `renewal:${c.id}`,
    });

    if (isEmailConfigured() && c.clientEmail) {
      const base = siteUrl.replace(/\/$/, "");
      const ok = await sendEmail({
        to: c.clientEmail,
        subject: `[THINKAD] 다음 캠페인 제안 — ${c.name}`,
        html: [
          `<p>안녕하세요 <strong>${c.clientName}</strong>님,</p>`,
          `<p>${summaryKo.replace(/\n/g, "<br/>")}</p>`,
          `<p><a href="${base}/ko${plannerLink}"><strong>AI 플래너에서 제안 보기 →</strong></a></p>`,
          `<p><a href="${base}/ko/recommend">매체 추천 받기</a></p>`,
        ].join(""),
        text: `${summaryKo}\n\n${base}/ko${plannerLink}`,
      }).catch(() => false);
      if (ok !== false) {
        await db.campaignRenewalProposal.update({
          where: { campaignId: c.id },
          data: { emailedAt: new Date() },
        });
        emailed += 1;
      }
    }
  }

  return { generated, emailed };
}
