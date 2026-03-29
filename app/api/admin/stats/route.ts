import { NextRequest } from "next/server";
import {
  CampaignStatus,
  FinancialDocKind,
  FinancialDocStatus,
} from "@prisma/client";
import { assertAdmin, json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function parseMediaIds(raw: string): string[] {
  const t = raw.trim();
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t) as unknown;
      if (Array.isArray(arr)) {
        return arr.map((x) => String(x)).filter(Boolean);
      }
    } catch {
      /* fall through */
    }
  }
  return t.split(/[,\s]+/).filter(Boolean);
}

export async function GET(request: NextRequest) {
  const deny = assertAdmin(request);
  if (deny) return deny;

  if (!isDatabaseConfigured()) {
    return json({
      configured: false,
      monthlyRevenueKrw: 0,
      inquiryConversionPct: 0,
      topMedia: [] as { id: string; name: string; picks: number }[],
      inquiries30d: 0,
      quotes30d: 0,
      monthlySeries: [] as {
        key: string;
        label: string;
        inquiries: number;
        quotes: number;
        revenueKrw: number;
      }[],
      funnel: {
        inquiries: 0,
        quotes: 0,
        pastProposal: 0,
        contracted: 0,
      },
      regionQuotes: [] as { region: string; count: number }[],
      typeRevenueKrw: [] as { type: string; totalKrw: number }[],
    });
  }

  const db = getPrisma();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const since = new Date(now.getTime() - 30 * 86400000);

  const paidDocs = await db.campaignFinancialDoc.findMany({
    where: {
      status: FinancialDocStatus.paid,
      paidAt: { gte: monthStart },
      kind: { in: [FinancialDocKind.invoice, FinancialDocKind.contract] },
    },
    select: { amountKrw: true },
  });
  const monthlyRevenueKrw = paidDocs.reduce(
    (s, d) => s + (d.amountKrw ?? 0),
    0,
  );

  const [inquiries30d, quotes30d] = await Promise.all([
    db.contactInquiry.count({ where: { createdAt: { gte: since } } }),
    db.quoteRequest.count({ where: { createdAt: { gte: since } } }),
  ]);
  const inquiryConversionPct =
    inquiries30d === 0
      ? 0
      : Math.round((quotes30d / inquiries30d) * 1000) / 10;

  const quotes = await db.quoteRequest.findMany({
    select: { mediaIds: true },
    take: 2000,
  });

  const counts = new Map<string, number>();
  for (const q of quotes) {
    for (const id of parseMediaIds(q.mediaIds)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const ids = sorted.map(([id]) => id);
  let topMedia: { id: string; name: string; picks: number }[] = [];
  if (ids.length > 0) {
    const medias = await db.media.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const nameById = new Map(medias.map((m) => [m.id, m.name]));
    topMedia = sorted.map(([id, picks]) => ({
      id,
      name: nameById.get(id) ?? id,
      picks,
    }));
  }

  const monthBuckets: { key: string; label: string; start: Date; end: Date }[] =
    [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const isCurrent =
      start.getMonth() === now.getMonth() &&
      start.getFullYear() === now.getFullYear();
    const end = isCurrent
      ? now
      : new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    monthBuckets.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: `${start.getMonth() + 1}월`,
      start,
      end,
    });
  }

  const monthlySeries = await Promise.all(
    monthBuckets.map(async (b) => {
      const [inquiries, quotes, revenueAgg] = await Promise.all([
        db.contactInquiry.count({
          where: { createdAt: { gte: b.start, lte: b.end } },
        }),
        db.quoteRequest.count({
          where: { createdAt: { gte: b.start, lte: b.end } },
        }),
        db.campaignFinancialDoc.aggregate({
          where: {
            status: FinancialDocStatus.paid,
            paidAt: { gte: b.start, lte: b.end },
            kind: {
              in: [FinancialDocKind.invoice, FinancialDocKind.contract],
            },
          },
          _sum: { amountKrw: true },
        }),
      ]);
      return {
        key: b.key,
        label: b.label,
        inquiries,
        quotes,
        revenueKrw: revenueAgg._sum.amountKrw ?? 0,
      };
    }),
  );

  const [
    inquiriesTotal,
    quotesTotal,
    pastProposal,
    contracted,
    regionRows,
  ] = await Promise.all([
    db.contactInquiry.count(),
    db.quoteRequest.count(),
    db.campaign.count({
      where: { status: { not: CampaignStatus.proposal } },
    }),
    db.campaign.count({
      where: {
        status: {
          in: [
            CampaignStatus.contract,
            CampaignStatus.production,
            CampaignStatus.airing,
            CampaignStatus.completed,
          ],
        },
      },
    }),
    db.quoteRequest.groupBy({
      by: ["region"],
      where: {
        region: { not: null },
      },
      _count: { _all: true },
    }),
  ]);

  const regionQuotes = regionRows
    .filter((r) => (r.region ?? "").trim().length > 0)
    .map((r) => ({
      region: r.region!.trim(),
      count: r._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const bookings = await db.mediaBooking.findMany({
    where: { campaignId: { not: null } },
    select: {
      campaignId: true,
      media: { select: { type: true } },
    },
    take: 3000,
    orderBy: { startsAt: "desc" },
  });
  const campaignType = new Map<string, string>();
  for (const b of bookings) {
    if (b.campaignId && !campaignType.has(b.campaignId)) {
      campaignType.set(b.campaignId, b.media.type);
    }
  }
  const paidInvoices = await db.campaignFinancialDoc.findMany({
    where: {
      status: FinancialDocStatus.paid,
      kind: FinancialDocKind.invoice,
    },
    select: { campaignId: true, amountKrw: true },
    take: 2000,
  });
  const typeTotals = new Map<string, number>();
  for (const p of paidInvoices) {
    const t = campaignType.get(p.campaignId) ?? "기타";
    typeTotals.set(t, (typeTotals.get(t) ?? 0) + (p.amountKrw ?? 0));
  }
  const typeRevenueKrw = [...typeTotals.entries()]
    .map(([type, totalKrw]) => ({ type, totalKrw }))
    .sort((a, b) => b.totalKrw - a.totalKrw);

  return json({
    configured: true,
    monthlyRevenueKrw,
    inquiryConversionPct,
    topMedia,
    inquiries30d,
    quotes30d,
    monthlySeries,
    funnel: {
      inquiries: inquiriesTotal,
      quotes: quotesTotal,
      pastProposal,
      contracted,
    },
    regionQuotes,
    typeRevenueKrw,
  });
}
