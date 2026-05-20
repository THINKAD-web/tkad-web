import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { buildMarketDashboardData } from "@/lib/insights/market-dashboard-data";
import { siteUrl } from "@/lib/seo";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export type MarketWeeklyEmail = {
  userId: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  weekKey: string;
};

function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function pickRecommendedMedia(
  hotNames: string[],
): Promise<string[]> {
  const picks = [...hotNames];
  if (picks.length >= 3) return picks.slice(0, 3);
  const catalog = await fetchPublicMediaCatalog();
  for (const m of catalog.sort(
    (a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0),
  )) {
    if (picks.length >= 3) break;
    if (!picks.includes(m.name)) picks.push(m.name);
  }
  return picks.slice(0, 3);
}

export async function buildMarketInsightsWeeklyEmails(): Promise<
  MarketWeeklyEmail[]
> {
  if (!isDatabaseConfigured()) return [];
  const db = getPrisma();
  const weekKey = isoWeekKey();
  const data = await buildMarketDashboardData({ isKo: true });
  const picks = await pickRecommendedMedia(data.hotMedia.map((h) => h.name));

  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { proTrialEndsAt: { gt: new Date() } },
        {
          subscriptions: {
            some: {
              plan: { in: ["PRO", "ENTERPRISE"] },
              status: { in: ["ACTIVE", "TRIALING"] },
            },
          },
        },
      ],
    },
    select: { id: true, email: true, name: true },
    take: 500,
  });

  const already = await db.marketInsightsWeeklyDigest.findMany({
    where: { weekKey },
    select: { userId: true },
  });
  const sentSet = new Set(already.map((r) => r.userId));

  const hotLines = data.hotMedia
    .map((h, i) => `${i + 1}. ${h.name} (${h.region})`)
    .join("\n");
  const trendLine = data.industryShare
    .slice(0, 3)
    .map((r) => `${r.industry} ${r.pct}%`)
    .join(", ");
  const priceLine =
    data.kpis.avgCpmMoMPercent >= 0
      ? `평균 CPM ${data.kpis.avgCpmKrw.toLocaleString()}원 (전월 대비 +${data.kpis.avgCpmMoMPercent}%)`
      : `평균 CPM ${data.kpis.avgCpmKrw.toLocaleString()}원 (전월 대비 ${data.kpis.avgCpmMoMPercent}%)`;

  const emails: MarketWeeklyEmail[] = [];
  for (const u of users) {
    if (sentSet.has(u.id)) continue;
    const subject = `[THINKAD] 이번 주 OOH 시장 인사이트`;
    const text = [
      `${u.name}님, 안녕하세요.`,
      "",
      "이번 주 OOH 시장 인사이트 요약입니다.",
      "",
      "▶ 지난 주 핫 매체",
      hotLines || "—",
      "",
      "▶ 가격 변동",
      priceLine,
      "",
      "▶ 업종 트렌드",
      trendLine,
      "",
      "▶ 추천 매체 3",
      picks.map((n, i) => `${i + 1}. ${n}`).join("\n"),
      "",
      `자세히: ${siteUrl}/ko/insights/market`,
      "",
      "— THINKAD PRO",
    ].join("\n");

    const html = `
      <div style="font-family:sans-serif;max-width:560px;line-height:1.6">
        <h2>이번 주 OOH 시장 인사이트</h2>
        <p>${u.name}님, PRO 구독자 전용 주간 브리핑입니다.</p>
        <h3>핫 매체</h3><pre>${hotLines}</pre>
        <h3>가격</h3><p>${priceLine}</p>
        <h3>업종</h3><p>${trendLine}</p>
        <h3>추천 매체</h3><ol>${picks.map((n) => `<li>${n}</li>`).join("")}</ol>
        <p><a href="${siteUrl}/ko/insights/market">대시보드 보기 →</a></p>
      </div>`;

    emails.push({ userId: u.id, to: u.email, subject, text, html, weekKey });
  }

  return emails;
}
