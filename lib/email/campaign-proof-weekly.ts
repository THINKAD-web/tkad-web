import { getPrisma } from "@/lib/prisma";
import {
  buildDailyImpressionSeries,
  estimateDailyImpressions,
} from "@/lib/advertiser-campaign-metrics";
import { advertiserProofTabUrl } from "@/lib/campaign-proof-service";

function lastWeekRange(): { start: Date; end: Date; periodKey: string } {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - 7 * 86400000);
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(start.getDate()).padStart(2, "0");
  return { start, end, periodKey: `${y}-${m}-${d}` };
}

export async function buildWeeklyProofDigestEmails(): Promise<
  { to: string; subject: string; html: string; text: string; campaignId: string; periodKey: string }[]
> {
  const db = getPrisma();
  const { start, end, periodKey } = lastWeekRange();

  const campaigns = await db.campaign.findMany({
    where: {
      status: { in: ["airing", "production", "contract"] },
      ownerUserId: { not: null },
    },
    include: {
      proofPhotos: {
        where: { createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: "desc" },
      },
      mediaBookings: {
        include: {
          media: {
            select: {
              impressions: true,
              dailyFootfall: true,
            },
          },
        },
      },
      ownerUser: { select: { id: true, email: true, name: true } },
    },
  });

  const out: {
    to: string;
    subject: string;
    html: string;
    text: string;
    campaignId: string;
    periodKey: string;
  }[] = [];

  for (const c of campaigns) {
    if (c.proofPhotos.length === 0) continue;
    const to = c.ownerUser?.email?.trim() || c.clientEmail?.trim();
    if (!to) continue;

    const already = await db.campaignProofWeeklyDigest.findUnique({
      where: {
        campaignId_periodKey: { campaignId: c.id, periodKey },
      },
    });
    if (already) continue;

    const dailyPerMedia = c.mediaBookings.reduce(
      (s, b) => s + estimateDailyImpressions(b.media ?? {}),
      0,
    );
    const series = buildDailyImpressionSeries({
      startDate: c.startDate,
      endDate: c.endDate,
      dailyTotal: dailyPerMedia,
    });
    const weekImpressions = series
      .filter((p) => {
        const d = new Date(p.date);
        return d >= start && d < end;
      })
      .reduce((s, p) => s + p.impressions, 0);

    const link = advertiserProofTabUrl("ko", c.id);
    const photoHtml = c.proofPhotos
      .slice(0, 6)
      .map((p) => {
        const src = p.imageUrlWatermarked ?? p.imageUrl;
        return `<div style="margin-bottom:12px"><img src="${src}" alt="" width="280" style="border-radius:8px;max-width:100%"/><p style="font-size:12px;color:#666">${p.caption ?? ""}</p></div>`;
      })
      .join("");

    const managerNote =
      process.env.ADVERTISER_REPORT_MANAGER_NOTE?.trim() ||
      "궁금한 점은 이 메일에 회신하시거나 카카오 채널로 문의해 주세요.";
    const progressPct =
      c.startDate && c.endDate
        ? Math.min(
            100,
            Math.round(
              ((Date.now() - c.startDate.getTime()) /
                Math.max(1, c.endDate.getTime() - c.startDate.getTime())) *
                100,
            ),
          )
        : null;
    const nextWeek =
      c.endDate && c.endDate > end
        ? `${c.endDate.toLocaleDateString("ko-KR")}까지 집행 예정`
        : "다음 주 일정은 담당자가 별도 안내드립니다.";

    const subject = `[THINKAD] ${c.name} · 주간 인증 리포트`;
    const text = [
      `${c.ownerUser?.name ?? "고객"}님, 안녕하세요.`,
      "",
      "캠페인이 순조롭게 진행 중입니다.",
      `지난 주 인증 사진 ${c.proofPhotos.length}건 · 추정 노출 ${weekImpressions.toLocaleString("ko-KR")}`,
      progressPct != null ? `진행률 약 ${progressPct}%` : "",
      `다음 주: ${nextWeek}`,
      "",
      `담당자 메모: ${managerNote}`,
      "",
      `인증 사진 보기: ${link}`,
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family:sans-serif;max-width:560px">
        <h2 style="color:#111">${c.name}</h2>
        <p>캠페인이 <strong>순조롭게 진행 중</strong>입니다.</p>
        <p>지난 주 인증 사진 <strong>${c.proofPhotos.length}건</strong> · 추정 노출 <strong>${weekImpressions.toLocaleString("ko-KR")}</strong></p>
        ${progressPct != null ? `<p>집행 진행률(추정) <strong>${progressPct}%</strong></p>` : ""}
        <p><strong>다음 주:</strong> ${nextWeek}</p>
        ${photoHtml}
        <p style="margin-top:16px;padding:12px;background:#f4f4f5;border-radius:8px;font-size:13px"><strong>담당자 메모</strong><br/>${managerNote}</p>
        <p><a href="${link}">대시보드에서 인증 사진 보기</a></p>
      </div>`;

    out.push({ to, subject, html, text, campaignId: c.id, periodKey });
  }

  return out;
}
