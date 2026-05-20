import { prisma, isDatabaseConfigured } from "@/lib/prisma";

export type WebVitalMetricSummary = {
  name: string;
  count: number;
  p75: number;
  goodPct: number;
};

export type WebVitalsDashboardSummary = {
  configured: boolean;
  periodDays: number;
  metrics: WebVitalMetricSummary[];
  lastSampleAt: string | null;
};

const METRIC_NAMES = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx] ?? 0;
}

function ratingFor(name: string, value: number): "good" | "needs-improvement" | "poor" {
  switch (name) {
    case "LCP":
      if (value <= 2500) return "good";
      if (value <= 4000) return "needs-improvement";
      return "poor";
    case "INP":
    case "FID":
      if (value <= 200) return "good";
      if (value <= 500) return "needs-improvement";
      return "poor";
    case "CLS":
      if (value <= 0.1) return "good";
      if (value <= 0.25) return "needs-improvement";
      return "poor";
    case "FCP":
      if (value <= 1800) return "good";
      if (value <= 3000) return "needs-improvement";
      return "poor";
    case "TTFB":
      if (value <= 800) return "good";
      if (value <= 1800) return "needs-improvement";
      return "poor";
    default:
      return "good";
  }
}

export async function loadWebVitalsSummary(
  periodDays = 7,
): Promise<WebVitalsDashboardSummary> {
  if (!isDatabaseConfigured()) {
    return { configured: false, periodDays, metrics: [], lastSampleAt: null };
  }

  const since = new Date();
  since.setDate(since.getDate() - periodDays);

  const rows = await prisma.webVital.findMany({
    where: {
      createdAt: { gte: since },
      name: { in: [...METRIC_NAMES, "FID"] },
    },
    select: { name: true, value: true, rating: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 8000,
  });

  const lastSampleAt = rows[0]?.createdAt.toISOString() ?? null;

  const metrics: WebVitalMetricSummary[] = METRIC_NAMES.map((name) => {
    const subset = rows.filter((r) => r.name === name || (name === "INP" && r.name === "FID"));
    const values = subset.map((r) => r.value).sort((a, b) => a - b);
    const p75 = percentile(values, 75);
    const goodCount = subset.filter((r) => {
      const rating = r.rating ?? ratingFor(name, r.value);
      return rating === "good";
    }).length;
    const goodPct = subset.length > 0 ? Math.round((goodCount / subset.length) * 100) : 0;
    return {
      name,
      count: subset.length,
      p75: Math.round(p75 * (name === "CLS" ? 1000 : 1)) / (name === "CLS" ? 1000 : 1),
      goodPct,
    };
  });

  return { configured: true, periodDays, metrics, lastSampleAt };
}
