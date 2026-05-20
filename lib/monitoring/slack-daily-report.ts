import type { InsightAlertPayload } from "@/lib/insights/notifiers/slack";
import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";
import { loadDailyOpsMetrics } from "@/lib/monitoring/dashboard-data";
import { parseSeoulToday, formatYmd, addCalendarDays } from "@/lib/seoul-calendar";

export async function sendDailyOpsSlackReport(now = new Date()) {
  const metrics = await loadDailyOpsMetrics(now);
  const today = parseSeoulToday(now);
  const yesterday = addCalendarDays(today, -1);
  const label = formatYmd(yesterday);

  const payload: InsightAlertPayload = {
    severity: "info",
    title: `THINKAD 일일 운영 리포트 (${label})`,
    summary: metrics.configured
      ? `어제 핵심 지표 — 방문(세션) ${metrics.visitors} · 신규 문의 ${metrics.newInquiries} · 신규 가입 ${metrics.newUsers} · 활성 캠페인 ${metrics.activeCampaigns}`
      : "DB 미연결 — 지표를 집계할 수 없습니다.",
    fields: metrics.configured
      ? [
          { label: "방문자(세션)", value: String(metrics.visitors) },
          { label: "신규 문의", value: String(metrics.newInquiries) },
          { label: "신규 가입", value: String(metrics.newUsers) },
          { label: "활성 캠페인", value: String(metrics.activeCampaigns) },
        ]
      : [{ label: "상태", value: "DB not configured" }],
    adminUrl: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/ko/admin/monitoring`
      : undefined,
  };

  return sendSlackInsightAlert(payload);
}
