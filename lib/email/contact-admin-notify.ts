export type ContactAdminNotifyParams = {
  company: string;
  name: string;
  phone: string;
  email: string;
  inquiryType: string;
  budget: string;
  message: string;
};

export function getContactAdminNotifyEmail(
  p: ContactAdminNotifyParams,
): { subject: string; text: string; html: string } {
  const subject = `[THINKAD] 새 문의 접수 · ${p.name}${p.company ? ` (${p.company})` : ""}`;

  const text = [
    "웹사이트 문의 폼에서 새 접수가 있었습니다.",
    "",
    `회사: ${p.company || "—"}`,
    `이름: ${p.name}`,
    `전화: ${p.phone}`,
    `이메일: ${p.email || "—"}`,
    `문의 유형: ${p.inquiryType || "—"}`,
    `예산: ${p.budget || "—"}`,
    "",
    "문의 내용:",
    p.message,
  ].join("\n");

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;color:#0f172a">
      <p style="font-weight:600">새 문의 접수</p>
      <table style="border-collapse:collapse;margin:12px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">회사</td><td>${esc(p.company || "—")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">이름</td><td>${esc(p.name)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">전화</td><td>${esc(p.phone)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">이메일</td><td>${esc(p.email || "—")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">문의 유형</td><td>${esc(p.inquiryType || "—")}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#64748b">예산</td><td>${esc(p.budget || "—")}</td></tr>
      </table>
      <p style="color:#64748b;font-size:13px">문의 내용</p>
      <pre style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:8px;font-size:13px">${esc(p.message)}</pre>
    </div>
  `;

  return { subject, text, html };
}
