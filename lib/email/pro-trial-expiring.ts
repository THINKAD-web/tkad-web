import { buildThinkadCtaEmail } from "@/lib/email/email-layout";

export function buildProTrialExpiringEmail(opts: {
  name: string;
  locale: "ko" | "en";
  pricingHref: string;
}): { subject: string; html: string; text: string } {
  const isKo = opts.locale === "ko";
  const name = opts.name.trim() || (isKo ? "고객" : "there");

  if (isKo) {
    const body =
      name +
      "님, PRO 체험이 3일 후 종료됩니다.\n" +
      "계속 이용하시려면 구독해주세요.";
    const mail = buildThinkadCtaEmail({
      eyebrow: "THINKAD PRO",
      title: "PRO 체험 만료 예정",
      paragraphs: [body],
      ctaLabel: "지금 구독하기",
      ctaUrl: opts.pricingHref,
    });
    return {
      subject: "PRO 체험이 3일 후 종료됩니다",
      html: mail.html,
      text: mail.text,
    };
  }

  const bodyEn =
    "Hi " +
    name +
    ", your PRO trial ends in 3 days.\n" +
    "Subscribe to keep PDF reports and advanced tools.";
  const mail = buildThinkadCtaEmail({
    eyebrow: "THINKAD PRO",
    title: "PRO trial ending soon",
    paragraphs: [bodyEn],
    ctaLabel: "View plans",
    ctaUrl: opts.pricingHref,
  });
  return {
    subject: "Your PRO trial ends in 3 days",
    html: mail.html,
    text: mail.text,
  };
}
