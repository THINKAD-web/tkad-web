export type ContactAdminNotifyParams = {
  company: string;
  name: string;
  phone: string;
  email: string;
  inquiryType: string;
  budget: string;
  industry?: string;
  campaignGoals?: string;
  regions?: string;
  startDate?: string;
  message: string;
};

const DEFAULT_ALERT_EMAIL = "sales@tkad.co.kr";

export function resolveContactAlertEmail(): string {
  return process.env.CONTACT_ALERT_EMAIL?.trim() || DEFAULT_ALERT_EMAIL;
}

export function getContactAdminNotifyEmail(
  p: ContactAdminNotifyParams,
): { subject: string; text: string; html: string } {
  const subject = `[THINKAD] 새 문의 · ${p.company || p.name} · ${p.inquiryType || "문의"}`;

  const rows: [string, string][] = [
    ["회사", p.company || "—"],
    ["담당자", p.name],
    ["전화", p.phone || "—"],
    ["이메일", p.email || "—"],
    ["문의 유형", p.inquiryType || "—"],
    ["업종", p.industry || "—"],
    ["캠페인 목적", p.campaignGoals || "—"],
    ["희망 지역", p.regions || "—"],
    ["예산", p.budget || "—"],
    ["희망 시작일", p.startDate || "—"],
  ];

  const text = [
    "웹사이트 문의 폼에서 새 접수가 있었습니다.",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "추가 요청사항 / 상세:",
    p.message,
  ].join("\n");

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const tableRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;font-weight:500">${esc(v)}</td></tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#0f172a">
      <p style="font-weight:700;font-size:16px;margin:0 0 12px">새 문의 접수</p>
      <table style="border-collapse:collapse;margin:0 0 16px;width:100%;max-width:560px">${tableRows}</table>
      <p style="color:#64748b;font-size:13px;margin:0 0 6px">추가 요청사항 / 상세</p>
      <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;padding:14px;border-radius:8px;font-size:13px;margin:0">${esc(p.message)}</pre>
    </div>
  `.replace(/<\/?motion\.div>/g, (m) => m.replace("motion.", ""));

  return { subject, text, html };
}
