import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { CompetitorOohInsight } from "@/lib/data-source-types";

const QUARTER_DAYS = 90;

/**
 * 업종별·지역별 OOH 집행 트래킹 (자체 DB)
 * - SuccessCase (published)
 * - MediaAdvertiserExecution
 * - MediaBooking (confirmed, 최근 90일)
 */
export async function getCompetitorOohInsights(
  region: string,
): Promise<CompetitorOohInsight[]> {
  if (!isDatabaseConfigured()) return [];

  const db = getPrisma();
  const since = new Date(Date.now() - QUARTER_DAYS * 86400_000);

  const [cases, executions, bookings, regionMedia] = await Promise.all([
    db.successCase.findMany({
      where: { status: "published" },
      select: { industry: true, mediaIds: true, mediaUsed: true, clientName: true },
      take: 500,
    }),
    db.mediaAdvertiserExecution.findMany({
      where: { createdAt: { gte: since } },
      select: {
        advertiserName: true,
        media: { select: { name: true, region: true } },
      },
      take: 500,
    }),
    db.mediaBooking.findMany({
      where: {
        status: "confirmed",
        createdAt: { gte: since },
      },
      select: {
        media: { select: { name: true, region: true } },
        requesterName: true,
      },
      take: 300,
    }),
    db.media.findMany({
      where: { region: { contains: region.slice(0, 2) }, isActive: true },
      select: { id: true, name: true, region: true },
      take: 200,
    }),
  ]);

  const regionMediaIds = new Set(regionMedia.map((m) => m.id));
  const regionNames = new Set(regionMedia.map((m) => m.name));

  type Acc = { mediaNames: Set<string>; count: number };
  const byIndustry = new Map<string, Acc>();

  const bump = (industry: string, mediaName: string) => {
    if (!industry.trim() || !mediaName.trim()) return;
    let acc = byIndustry.get(industry);
    if (!acc) {
      acc = { mediaNames: new Set(), count: 0 };
      byIndustry.set(industry, acc);
    }
    acc.mediaNames.add(mediaName);
    acc.count++;
  };

  for (const c of cases) {
    const inRegion =
      c.mediaIds.some((id) => regionMediaIds.has(id)) ||
      c.mediaUsed.some((m) =>
        regionMedia.some((rm) => m.includes(rm.name.slice(0, 4))),
      );
    if (!inRegion) continue;
    for (const mid of c.mediaIds) {
      const m = regionMedia.find((rm) => rm.id === mid);
      if (m) bump(c.industry, m.name);
    }
    for (const label of c.mediaUsed.slice(0, 2)) {
      if (regionNames.has(label) || label.includes(region.slice(0, 2))) {
        bump(c.industry, label);
      }
    }
  }

  for (const e of executions) {
    if (!e.media.region.includes(region.slice(0, 2))) continue;
    bump("기타", e.media.name);
  }

  for (const b of bookings) {
    if (!b.media.region.includes(region.slice(0, 2))) continue;
    bump("신규 집행", b.media.name);
  }

  const insights: CompetitorOohInsight[] = [...byIndustry.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([industry, acc]) => ({
      industry,
      topMediaNames: [...acc.mediaNames].slice(0, 5),
      campaignCount: acc.count,
      periodLabelKo: "최근 3개월",
    }));

  return insights;
}

export async function getIndustryTopMedia(
  industry: string,
  region?: string,
): Promise<{ mediaName: string; count: number }[]> {
  const insights = await getCompetitorOohInsights(region ?? "서울");
  const match = insights.find((i) => i.industry.includes(industry));
  if (!match) return [];
  return match.topMediaNames.map((name) => ({
    mediaName: name,
    count: match.campaignCount,
  }));
}
