import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  estimateCostUsd,
  featureLabel,
  modelFamilyLabel,
} from "@/lib/ai-usage-pricing";

export const dynamic = "force-dynamic";

type Row = {
  feature: string;
  featureLabel: string;
  model: string;
  modelLabel: string;
  calls: number;
  tokens: number;
  estCostUsd: number;
};

function periodFrom(period: string): Date | null {
  if (period === "all") return null;
  const now = new Date();
  const days = period === "30d" ? 30 : period === "today" ? 0 : 7;
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;
  if (!isDatabaseConfigured()) {
    return json({ configured: false, rows: [], byFeature: [], byModel: [], totals: null });
  }

  const period = request.nextUrl.searchParams.get("period") ?? "30d";
  const from = periodFrom(period);
  const createdAt = from ? { gte: from } : undefined;

  const db = getPrisma();
  const rows: Row[] = [];

  // ── 콘텐츠 생성 + 추천/상담/검토 (generation_logs) ──
  try {
    const groups = await db.generationLog.groupBy({
      by: ["type", "model"],
      where: createdAt ? { createdAt } : undefined,
      _sum: { tokensUsed: true },
      _count: { _all: true },
    });
    for (const g of groups) {
      const tokens = g._sum.tokensUsed ?? 0;
      rows.push({
        feature: g.type,
        featureLabel: featureLabel(g.type),
        model: g.model,
        modelLabel: modelFamilyLabel(g.model),
        calls: g._count._all,
        tokens,
        estCostUsd: estimateCostUsd(g.model, tokens),
      });
    }
  } catch (e) {
    console.error("[ai-usage] generationLog", e instanceof Error ? e.message : e);
  }

  // ── 공개 챗봇 (chatbot_logs, assistant 턴) ──
  try {
    const groups = await db.chatbotLog.groupBy({
      by: ["model"],
      where: { role: "assistant", ...(createdAt ? { createdAt } : {}) },
      _sum: { tokensUsed: true },
      _count: { _all: true },
    });
    for (const g of groups) {
      const tokens = g._sum.tokensUsed ?? 0;
      const model = g.model ?? "unknown";
      rows.push({
        feature: "chatbot",
        featureLabel: featureLabel("chatbot"),
        model,
        modelLabel: modelFamilyLabel(model),
        calls: g._count._all,
        tokens,
        estCostUsd: estimateCostUsd(model, tokens),
      });
    }
  } catch (e) {
    console.error("[ai-usage] chatbotLog", e instanceof Error ? e.message : e);
  }

  // ── 집계 ──
  const byFeatureMap = new Map<string, Row & { models: Set<string> }>();
  const byModelMap = new Map<string, { model: string; modelLabel: string; calls: number; tokens: number; estCostUsd: number }>();
  for (const r of rows) {
    const f = byFeatureMap.get(r.feature) ?? {
      ...r,
      calls: 0,
      tokens: 0,
      estCostUsd: 0,
      models: new Set<string>(),
    };
    f.calls += r.calls;
    f.tokens += r.tokens;
    f.estCostUsd += r.estCostUsd;
    f.models.add(r.modelLabel);
    byFeatureMap.set(r.feature, f);

    const m = byModelMap.get(r.model) ?? {
      model: r.model,
      modelLabel: r.modelLabel,
      calls: 0,
      tokens: 0,
      estCostUsd: 0,
    };
    m.calls += r.calls;
    m.tokens += r.tokens;
    m.estCostUsd += r.estCostUsd;
    byModelMap.set(r.model, m);
  }

  const round = (n: number) => Math.round(n * 10000) / 10000;
  const byFeature = [...byFeatureMap.values()]
    .map((f) => ({
      feature: f.feature,
      featureLabel: f.featureLabel,
      models: [...f.models],
      calls: f.calls,
      tokens: f.tokens,
      estCostUsd: round(f.estCostUsd),
    }))
    .sort((a, b) => b.estCostUsd - a.estCostUsd);
  const byModel = [...byModelMap.values()]
    .map((m) => ({ ...m, estCostUsd: round(m.estCostUsd) }))
    .sort((a, b) => b.estCostUsd - a.estCostUsd);

  const totals = {
    tokens: rows.reduce((s, r) => s + r.tokens, 0),
    calls: rows.reduce((s, r) => s + r.calls, 0),
    estCostUsd: round(rows.reduce((s, r) => s + r.estCostUsd, 0)),
  };

  // ── 일자별 추이 (KST, 차트 윈도우는 최대 60일) ──
  const chartFrom = (() => {
    const sixtyAgo = new Date();
    sixtyAgo.setDate(sixtyAgo.getDate() - 59);
    sixtyAgo.setHours(0, 0, 0, 0);
    return from && from > sixtyAgo ? from : sixtyAgo;
  })();
  const kstDay = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d); // YYYY-MM-DD

  const dailyMap = new Map<string, { tokens: number; costUsd: number }>();
  const addDaily = (createdAt: Date, model: string | null, tokens: number) => {
    const day = kstDay(createdAt);
    const cur = dailyMap.get(day) ?? { tokens: 0, costUsd: 0 };
    cur.tokens += tokens;
    cur.costUsd += estimateCostUsd(model, tokens);
    dailyMap.set(day, cur);
  };
  try {
    const gRows = await db.generationLog.findMany({
      where: { createdAt: { gte: chartFrom } },
      select: { createdAt: true, model: true, tokensUsed: true },
    });
    for (const r of gRows) addDaily(r.createdAt, r.model, r.tokensUsed ?? 0);
  } catch {
    /* table missing */
  }
  try {
    const cRows = await db.chatbotLog.findMany({
      where: { role: "assistant", createdAt: { gte: chartFrom } },
      select: { createdAt: true, model: true, tokensUsed: true },
    });
    for (const r of cRows) addDaily(r.createdAt, r.model, r.tokensUsed ?? 0);
  } catch {
    /* table missing */
  }

  // 빈 날짜 0 으로 채워 연속 추이
  const daily: Array<{ date: string; tokens: number; costUsd: number }> = [];
  for (
    let d = new Date(chartFrom);
    d <= new Date();
    d.setDate(d.getDate() + 1)
  ) {
    const day = kstDay(d);
    const v = dailyMap.get(day) ?? { tokens: 0, costUsd: 0 };
    daily.push({ date: day, tokens: v.tokens, costUsd: round(v.costUsd) });
  }

  return json({ configured: true, period, totals, byFeature, byModel, daily });
}
