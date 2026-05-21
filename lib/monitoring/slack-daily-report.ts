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
    severity: metrics.configured && metrics.errorsYesterday > 10 ? "warning" : "info",
    title: `THINKAD 일일 운영 리포트 (${label})`,
    summary: metrics.configured
      ? `어제 — 방문 ${metrics.visitors} · 가입 ${metrics.newUsers} · 문의 ${metrics.newInquiries} · 매체등록 ${metrics.newMediaApplications} · 에러 ${metrics.errorsYesterday}`
      : "DB 미연결 — 지표를 집계할 수 없습니다.",
    fields: metrics.configured
      ? [
          { label: "방문자(세션)", value: String(metrics.visitors) },
          { label: "신규 문의", value: String(metrics.newInquiries) },
          { label: "신규 가입", value: String(metrics.newUsers) },
          { label: "매체 등록 신청", value: String(metrics.newMediaApplications) },
          { label: "에러", value: String(metrics.errorsYesterday) },
          { label: "주간 누적 문의", value: String(metrics.weekInquiries) },
          { label: "주간 누적 가입", value: String(metrics.weekSignups) },
          { label: "활성 캠페인", value: String(metrics.activeCampaigns) },
        ]
      : [{ label: "상태", value: "DB not configured" }],
    adminUrl: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/ko/admin/monitoring`
      : undefined,
  };

  return sendSlackInsightAlert(payload);
}
