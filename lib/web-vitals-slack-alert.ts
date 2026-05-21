import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";
import { loadWebVitalsSummary } from "@/lib/web-vitals-summary";
import { siteUrl } from "@/lib/seo";

const THRESHOLDS = {
  LCP: 2500,
  INP: 200,
  FID: 200,
  CLS: 0.1,
} as const;

function metricSummary(
  metrics: Awaited<ReturnType<typeof loadWebVitalsSummary>>["metrics"],
  name: string,
) {
  return metrics.find((m) => m.name === name);
}

export async function notifyWebVitalsThresholdSlack(
  periodDays = 7,
): Promise<{ sent: boolean; breaches: string[]; skipped?: boolean }> {
  const summary = await loadWebVitalsSummary(periodDays);
  if (!summary.configured) {
    return { sent: false, breaches: [], skipped: true };
  }

  const breaches: string[] = [];
  const lcp = metricSummary(summary.metrics, "LCP");
  const inp = metricSummary(summary.metrics, "INP");
  const cls = metricSummary(summary.metrics, "CLS");

  if (lcp && lcp.count > 0 && lcp.p75 > THRESHOLDS.LCP) {
    breaches.push(`LCP p75 ${lcp.p75}ms (목표 ≤${THRESHOLDS.LCP}ms)`);
  }
  const fidInp = inp;
  if (fidInp && fidInp.count > 0 && fidInp.p75 > THRESHOLDS.INP) {
    breaches.push(`FID/INP p75 ${fidInp.p75}ms (목표 ≤${THRESHOLDS.INP}ms)`);
  }
  if (cls && cls.count > 0 && cls.p75 > THRESHOLDS.CLS) {
    breaches.push(`CLS p75 ${cls.p75} (목표 ≤${THRESHOLDS.CLS})`);
  }

  if (breaches.length === 0) {
    return { sent: false, breaches: [], skipped: true };
  }

  const origin = siteUrl.replace(/\/$/, "");
  const res = await sendSlackInsightAlert({
    severity: "warning",
    title: "Core Web Vitals 임계값 초과",
    summary: breaches.map((b) => `• ${b}`).join("\n"),
    fields: summary.metrics
      .filter((m) => m.count > 0)
      .slice(0, 5)
      .map((m) => ({
        label: m.name,
        value: `p75 ${m.name === "CLS" ? m.p75 : `${m.p75}${m.name === "CLS" ? "" : "ms"}`} · Green ${m.goodPct}%`,
      })),
    adminUrl: `${origin}/ko/admin`,
  });

  return { sent: !res.skipped, breaches, skipped: res.skipped };
}
