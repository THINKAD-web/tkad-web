import { siteUrl } from "@/lib/seo";

type CtaEmailParams = {
  eyebrow: string;
  title: string;
  greeting?: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
};

/** THINKAD 네온 스타일 트랜잭션 메일 레이아웃 */
export function buildThinkadCtaEmail({
  eyebrow,
  title,
  greeting,
  paragraphs,
  ctaLabel,
  ctaUrl,
  footerNote,
}: CtaEmailParams): { html: string; text: string } {
  const origin = siteUrl.replace(/\/$/, "");
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px 0;font-size:14px;line-height:1.65;color:#e2e8f0;">${p}</p>`,
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#05050a;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#05050a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);background:linear-gradient(165deg,#0f0f18 0%,#12121f 45%,#0a0a12 100%);overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.55);">
        <tr><td style="padding:28px 28px 20px 28px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="font-size:22px;font-weight:900;letter-spacing:-0.02em;color:#fff;">
            THINK<span style="color:#22d3ee;">AD</span>
          </div>
          <p style="margin:10px 0 0 0;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#a78bfa;">${eyebrow}</p>
          <h1 style="margin:12px 0 0 0;font-size:20px;line-height:1.4;color:#fff;font-weight:800;">${title}</h1>
        </td></tr>
        <tr><td style="padding:24px 28px 8px 28px;">
          ${greeting ? `<p style="margin:0 0 14px 0;font-size:14px;color:#f8fafc;font-weight:600;">${greeting}</p>` : ""}
          ${body}
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0 8px 0;">
            <tr><td style="border-radius:14px;background:linear-gradient(135deg,#8b5cf6,#22d3ee,#ec4899);">
              <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:800;color:#fff;text-decoration:none;letter-spacing:0.04em;">${ctaLabel}</a>
            </td></tr>
          </table>
          <p style="margin:12px 0 0 0;font-size:11px;line-height:1.5;color:#94a3b8;word-break:break-all;">${ctaUrl}</p>
        </td></tr>
        <tr><td style="padding:16px 28px 24px 28px;border-top:1px solid rgba(255,255,255,0.08);">
          <p style="margin:0;font-size:11px;line-height:1.55;color:#64748b;">
            ${footerNote ?? "본 메일은 발신 전용입니다. 문의는 웹사이트를 이용해 주세요."}
          </p>
          <p style="margin:10px 0 0 0;font-size:11px;color:#475569;">© THINKAD · ${origin}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    title,
    "",
    ...(greeting ? [greeting, ""] : []),
    ...paragraphs,
    "",
    `${ctaLabel}: ${ctaUrl}`,
    "",
    footerNote ?? "",
  ].join("\n");

  return { html, text };
}
