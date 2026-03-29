import { NextRequest } from "next/server";
import {
  FinancialDocKind,
  FinancialDocStatus,
} from "@prisma/client";
import { assertAdmin, json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
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

  return json({
    configured: true,
    monthlyRevenueKrw,
    inquiryConversionPct,
    topMedia,
    inquiries30d,
    quotes30d,
  });
}
