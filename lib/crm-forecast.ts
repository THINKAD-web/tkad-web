import type { SalesPipelineStage } from "@prisma/client";
import { STAGE_WIN_PROBABILITY, weightedForecast } from "@/lib/crm-pipeline";
import { getPrisma } from "@/lib/prisma";

export async function computePipelineForecast() {
  const db = getPrisma();
  const accounts = await db.pipelineCard.findMany({
    where: { stage: { not: "completed" } },
    select: {
      id: true,
      stage: true,
      expectedAmount: true,
      company: true,
    },
  });

  const byStage: Record<
    SalesPipelineStage,
    { count: number; rawTotal: number; weighted: number }
  > = {
    new_inquiry: { count: 0, rawTotal: 0, weighted: 0 },
    consulting: { count: 0, rawTotal: 0, weighted: 0 },
    quote_sent: { count: 0, rawTotal: 0, weighted: 0 },
    contract_negotiation: { count: 0, rawTotal: 0, weighted: 0 },
    contract_closed: { count: 0, rawTotal: 0, weighted: 0 },
    in_flight: { count: 0, rawTotal: 0, weighted: 0 },
    completed: { count: 0, rawTotal: 0, weighted: 0 },
  };

  let monthWeighted = 0;
  for (const a of accounts) {
    const amt = a.expectedAmount ?? 0;
    const w = weightedForecast(amt, a.stage);
    monthWeighted += w;
    const bucket = byStage[a.stage];
    bucket.count += 1;
    bucket.rawTotal += amt;
    bucket.weighted += w;
  }

  return { monthWeighted, byStage, accountCount: accounts.length };
}

export async function quarterlyRevenueSeries() {
  const db = getPrisma();
  const since = new Date();
  since.setMonth(since.getMonth() - 15);

  const docs = await db.campaignFinancialDoc.findMany({
    where: {
      status: "paid",
      paidAt: { gte: since },
      amountKrw: { not: null },
    },
    select: { amountKrw: true, paidAt: true },
  });

  const buckets = new Map<string, number>();
  for (const d of docs) {
    if (!d.paidAt || !d.amountKrw) continue;
    const y = d.paidAt.getFullYear();
    const q = Math.floor(d.paidAt.getMonth() / 3) + 1;
    const key = `${y}-Q${q}`;
    buckets.set(key, (buckets.get(key) ?? 0) + d.amountKrw);
  }

  const keys = [...buckets.keys()].sort();
  return keys.slice(-8).map((k) => ({
    quarter: k,
    amountKrw: buckets.get(k) ?? 0,
  }));
}

export function stageProbabilitiesForUi() {
  return STAGE_WIN_PROBABILITY;
}
