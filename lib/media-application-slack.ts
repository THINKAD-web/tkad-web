import type { MediaApplication } from "@prisma/client";
import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";
import { siteUrl } from "@/lib/seo";

export async function notifySlackMediaApplication(
  app: MediaApplication,
  opts?: { overdue?: boolean },
): Promise<void> {
  const adminUrl = `${siteUrl.replace(/\/$/, "")}/ko/admin/applications?id=${app.id}`;
  const title = opts?.overdue
    ? "매체 등록 신청 — 24시간 승인 대기"
    : "새 매체 등록 신청";
  const summary = [
    `*${app.companyName}* · ${app.contactName}`,
    `매체: ${app.mediaName} (${app.mediaType})`,
    `연락: ${app.contactPhone} · ${app.contactEmail}`,
    opts?.overdue
      ? `제출: ${app.createdAt.toISOString().slice(0, 16)} (24h+)`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  await sendSlackInsightAlert({
    severity: opts?.overdue ? "warning" : "info",
    title,
    summary,
    fields: [
      { label: "신청 ID", value: app.id },
      { label: "상태", value: app.status },
      { label: "주소", value: app.address.slice(0, 80) },
    ],
    adminUrl,
  });
}
