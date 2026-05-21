import { sendSlackInsightAlert } from "@/lib/insights/notifiers/slack";

export async function notifyInquiryRoutedSlack(opts: {
  inquiryId: string;
  company: string;
  name: string;
  categoryCode: string;
  assigneeName: string;
  assigneeEmail: string;
  budget?: string;
  inquiryType?: string;
}) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  return sendSlackInsightAlert({
    severity: "info",
    title: "신규 문의 · 자동 배정",
    summary: `${opts.company} / ${opts.name} → *${opts.assigneeName}* (${opts.categoryCode})`,
    fields: [
      { label: "담당", value: opts.assigneeEmail },
      { label: "유형", value: opts.inquiryType ?? "—" },
      { label: "예산", value: opts.budget ?? "—" },
      { label: "문의 ID", value: opts.inquiryId.slice(0, 12) },
    ],
    adminUrl: base ? `${base}/ko/admin/inquiries` : undefined,
  });
}

export async function notifyInquirySlaEscalation(opts: {
  count: number;
  samples: Array<{ id: string; company: string; assigneeEmail: string | null }>;
}) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  return sendSlackInsightAlert({
    severity: "warning",
    title: "문의 SLA 에스컬레이션 (24시간 미응답)",
    summary: `${opts.count}건 — 24시간 내 첫 응답이 없습니다.`,
    fields: opts.samples.slice(0, 5).map((s) => ({
      label: s.company.slice(0, 24),
      value: `${s.assigneeEmail ?? "미배정"} · ${s.id.slice(0, 8)}`,
    })),
    adminUrl: base ? `${base}/ko/admin/inquiries` : undefined,
  });
}
