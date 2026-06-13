import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  costUsdFromIO,
  usdToKrw,
  USD_KRW,
  featureLabel,
  modelFamilyLabel,
} from "@/lib/ai-usage-pricing";

export const dynamic = "force-dynamic";

function periodFrom(period: string): Date | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "today") return kstStartOfToday();
  const days = period === "30d" ? 30 : 7;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

/** KST(UTC+9) 기준 오늘 0시의 UTC 인스턴트 */
function kstStartOfToday(): Date {
  const k = new Date(Date.now() + 9 * 3_600_000);
  k.setUTCHours(0, 0, 0, 0);
  return new Date(k.getTime() - 9 * 3_600_000);
}
/** KST 기준 이번 달 1일 0시의 UTC 인스턴트 */
function kstStartOfMonth(): Date {
  const k = new Date(Date.now() + 9 * 3_600_000);
  k.setUTCDate(1);
  k.setUTCHours(0, 0, 0, 0);
  return new Date(k.getTime() - 9 * 3_600_000);
}
const kstDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

const round = (n: number) => Math.round(n * 10000) / 10000;

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  if (!isDatabaseConfigured()) {
    return json({
      configured: false,
      totals: null,
      byFeature: [],
      byModel: [],
      daily: [],
      today: null,
      month: null,
      usdKrw: USD_KRW,
    });
  }

  const db = getPrisma();
  const period = request.nextUrl.searchParams.get("period") ?? "30d";
  const from = periodFrom(period);
  const where = from ? { createdAt: { gte: from } } : undefined;

  // ── 기능 × 모델 집계 (입력/출력 분리 → 정확 비용) ──
  const byFeatureMap = new Map<
    string,
    { feature: string; featureLabel: string; models: Set<string>; calls: number; tokens: number; estCostUsd: number }
  >();
  const byModelMap = new Map<
    string,
    { model: string; modelLabel: string; calls: number; tokens: number; estCostUsd: number }
  >();
  let totalTokens = 0;
  let totalCalls = 0;
  let totalCostUsd = 0;

  try {
    const groups = await db.aiUsageLog.groupBy({
      by: ["feature", "model"],
      where,
      _sum: { inputTokens: true, outputTokens: true },
      _count: { _all: true },
    });
    for (const g of groups) {
      const inTok = g._sum.inputTokens ?? 0;
      const outTok = g._sum.outputTokens ?? 0;
      const tokens = inTok + outTok;
      const calls = g._count._all;
      const costUsd = costUsdFromIO(g.model, inTok, outTok);
      totalTokens += tokens;
      totalCalls += calls;
      totalCostUsd += costUsd;

      const f = byFeatureMap.get(g.feature) ?? {
        feature: g.feature,
        featureLabel: featureLabel(g.feature),
        models: new Set<string>(),
        calls: 0,
        tokens: 0,
        estCostUsd: 0,
      };
      f.calls += calls;
      f.tokens += tokens;
      f.estCostUsd += costUsd;
      f.models.add(modelFamilyLabel(g.model));
      byFeatureMap.set(g.feature, f);

      const m = byModelMap.get(g.model) ?? {
        model: g.model,
        modelLabel: modelFamilyLabel(g.model),
        calls: 0,
        tokens: 0,
        estCostUsd: 0,
      };
      m.calls += calls;
      m.tokens += tokens;
      m.estCostUsd += costUsd;
      byModelMap.set(g.model, m);
    }
  } catch (e) {
    console.error("[ai-usage] groupBy", e instanceof Error ? e.message : e);
  }

  const byFeature = [...byFeatureMap.values()]
    .map((f) => ({
      feature: f.feature,
      featureLabel: f.featureLabel,
      models: [...f.models],
      calls: f.calls,
      tokens: f.tokens,
      estCostUsd: round(f.estCostUsd),
      estCostKrw: usdToKrw(f.estCostUsd),
    }))
    .sort((a, b) => b.estCostUsd - a.estCostUsd);
  const byModel = [...byModelMap.values()]
    .map((m) => ({
      ...m,
      estCostUsd: round(m.estCostUsd),
      estCostKrw: usdToKrw(m.estCostUsd),
    }))
    .sort((a, b) => b.estCostUsd - a.estCostUsd);

  const totals = {
    tokens: totalTokens,
    calls: totalCalls,
    estCostUsd: round(totalCostUsd),
    estCostKrw: usdToKrw(totalCostUsd),
  };

  // ── 오늘 / 이번달 KPI + 일별 추이 (최근 60일 윈도우에서 계산) ──
  const chartFrom = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 59);
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const startToday = kstStartOfToday();
  const startMonth = kstStartOfMonth();
  const windowFrom = startMonth < chartFrom ? startMonth : chartFrom;

  const today = { tokens: 0, costUsd: 0 };
  const month = { tokens: 0, costUsd: 0 };
  const dailyMap = new Map<string, { tokens: number; costUsd: number }>();

  try {
    const rows = await db.aiUsageLog.findMany({
      where: { createdAt: { gte: windowFrom } },
      select: { createdAt: true, model: true, inputTokens: true, outputTokens: true },
    });
    for (const r of rows) {
      const tokens = r.inputTokens + r.outputTokens;
      const cost = costUsdFromIO(r.model, r.inputTokens, r.outputTokens);
      if (r.createdAt >= startToday) {
        today.tokens += tokens;
        today.costUsd += cost;
      }
      if (r.createdAt >= startMonth) {
        month.tokens += tokens;
        month.costUsd += cost;
      }
      if (r.createdAt >= chartFrom) {
        const day = kstDay(r.createdAt);
        const cur = dailyMap.get(day) ?? { tokens: 0, costUsd: 0 };
        cur.tokens += tokens;
        cur.costUsd += cost;
        dailyMap.set(day, cur);
      }
    }
  } catch (e) {
    console.error("[ai-usage] window", e instanceof Error ? e.message : e);
  }

  const daily: Array<{ date: string; tokens: number; costUsd: number }> = [];
  for (let d = new Date(chartFrom); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const day = kstDay(d);
    const v = dailyMap.get(day) ?? { tokens: 0, costUsd: 0 };
    daily.push({ date: day, tokens: v.tokens, costUsd: round(v.costUsd) });
  }

  return json({
    configured: true,
    period,
    usdKrw: USD_KRW,
    totals,
    today: {
      tokens: today.tokens,
      estCostUsd: round(today.costUsd),
      estCostKrw: usdToKrw(today.costUsd),
    },
    month: {
      tokens: month.tokens,
      estCostUsd: round(month.costUsd),
      estCostKrw: usdToKrw(month.costUsd),
    },
    byFeature,
    byModel,
    daily,
  });
}
