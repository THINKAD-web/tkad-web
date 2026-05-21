import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";
import { loadLaunchMonitorSnapshot } from "@/lib/monitoring/launch-metrics";

/** 매시간 오픈 모니터링 Slack 리포트 */
export async function sendHourlyLaunchSlackReport(now = new Date()) {
  const m = await loadLaunchMonitorSnapshot(1, now);
  const visits = m.visitors.lastHourSessions;
  const signups = m.signups.lastHour;
  const inquiries = m.inquiries.lastHour;

  return sendSlackInsightAlert({
    severity: m.errors.criticalLastHour > 0 ? "error" : "info",
    title: "THINKAD 오픈 모니터 (지난 1시간)",
    summary: `지난 1시간 — 방문 ${visits}명, 가입 ${signups}명, 문의 ${inquiries}건, 에러 ${m.errors.lastHour}건`,
    fields: [
      { label: "활성(5분)", value: String(m.visitors.activeNow) },
      { label: "5xx 에러", value: String(m.errors.criticalLastHour) },
      { label: "DB", value: m.database.ok ? "OK" : (m.database.detail ?? "FAIL") },
      {
        label: "LCP p75 (1h)",
        value:
          m.response.webVitalsP75Ms != null
            ? `${(m.response.webVitalsP75Ms / 1000).toFixed(1)}s`
            : "—",
      },
    ],
    adminUrl: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/ko/admin/launch-monitor`
      : undefined,
  });
}
