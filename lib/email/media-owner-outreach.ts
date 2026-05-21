import type { PotentialMedia } from "@prisma/client";
import { buildThinkadCtaEmail } from "@/lib/email/email-layout";
import { siteUrl } from "@/lib/seo";

function avgInquiriesLabel(): string {
  const n = Number(process.env.MEDIA_OWNER_AVG_INQUIRIES_PER_MONTH ?? "12");
  return Number.isFinite(n) && n > 0 ? String(Math.round(n)) : "12";
}

export function buildPotentialMediaOutreachEmail(opts: {
  lead: PotentialMedia;
  companyOrName: string;
  registerUrl: string;
  trackPixelUrl: string;
}): { subject: string; html: string; text: string } {
  const n = avgInquiriesLabel();
  const greeting = `${opts.companyOrName}님, 안녕하세요.`;
  const paragraphs = [
    `THINKAD(싱커드)에서 <strong>${opts.lead.name}</strong> 매체를 발견했습니다.`,
    `저희 플랫폼에 등록하시면 검증된 광고주에게 직접 노출되고, 문의·견적 요청을 받을 수 있습니다.`,
    `등록은 <strong>무료</strong>이며, 유사 매체사는 월 평균 <strong>${n}건</strong> 이상의 문의가 접수되고 있습니다.`,
    `아래 버튼으로 5분 안에 매체 등록을 시작해 보세요.`,
  ];

  const { html: bodyHtml, text } = buildThinkadCtaEmail({
    eyebrow: "매체사 파트너",
    title: "광고주 문의를 받을 수 있는 무료 등록",
    greeting,
    paragraphs,
    ctaLabel: "무료로 매체 등록하기",
    ctaUrl: opts.registerUrl,
    footerNote:
      "이 메일에 회신하시거나 웹에서 등록해 주시면 담당자가 도와드립니다.",
  });

  const pixel = `<img src="${opts.trackPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  const html = bodyHtml.replace("</body>", `${pixel}</body>`);

  return {
    subject: `[THINKAD] ${opts.lead.name} — 무료 매체 등록 안내`,
    html,
    text: `${greeting}\n\n${opts.lead.name} 매체를 THINKAD에서 발견했습니다.\n등록 무료 · 월 평균 ${n}건 문의\n\n등록: ${opts.registerUrl}\n`,
  };
}

export function outreachRegisterUrl(token: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/ko/register/media?ref=outreach&ot=${encodeURIComponent(token)}`;
}

export function outreachTrackPixelUrl(token: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/api/outreach/track/${encodeURIComponent(token)}.gif`;
}
