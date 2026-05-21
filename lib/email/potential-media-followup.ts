import type { PotentialMedia } from "@prisma/client";
import { buildThinkadCtaEmail } from "@/lib/email/email-layout";
import { outreachRegisterUrl, outreachTrackPixelUrl } from "@/lib/email/media-owner-outreach";

export function buildOutreachFollowUpEmail(
  step: 1 | 2,
  lead: PotentialMedia,
  token: string,
): { subject: string; html: string; text: string } {
  const registerUrl = outreachRegisterUrl(token);
  const trackPixelUrl = outreachTrackPixelUrl(token);
  const name = lead.name.split(/[\s,(]/)[0]?.slice(0, 24) || "파트너";

  const copy =
    step === 1
      ? {
          subject: `[THINKAD] ${lead.name} — 등록 사례 공유`,
          title: "다른 매체사는 이미 문의를 받고 있습니다",
          paragraphs: [
            `안녕하세요. 지난주 보내드린 THINKAD 매체 등록 안내에 이어, 최근 등록 매체사들이 월 평균 10건 이상의 광고주 문의를 받고 있다는 사례를 공유드립니다.`,
            `${lead.name} 매체도 무료로 등록하시면 검증된 광고주에게 노출됩니다.`,
          ],
        }
      : {
          subject: `[THINKAD] ${lead.name} — 파트너 인센티브 안내`,
          title: "조기 등록 매체사 혜택",
          paragraphs: [
            `THINKAD 파트너 매체사에게는 조기 등록 시 PRO 기능·노출 우선 검토 등 인센티브가 제공됩니다.`,
            `아래 링크에서 5분 내 등록을 완료해 주시면 담당자가 온보딩을 도와드립니다.`,
          ],
        };

  const { html: bodyHtml, text } = buildThinkadCtaEmail({
    eyebrow: "매체사 파트너",
    title: copy.title,
    greeting: `${name}님,`,
    paragraphs: copy.paragraphs,
    ctaLabel: "무료 등록 계속하기",
    ctaUrl: registerUrl,
  });
  const pixel = `<img src="${trackPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  return {
    subject: copy.subject,
    html: bodyHtml.replace("</body>", `${pixel}</body>`),
    text,
  };
}
