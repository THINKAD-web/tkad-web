import { buildThinkadCtaEmail } from "@/lib/email/email-layout";

type Params = {
  name: string;
  verifyUrl: string;
  locale?: string;
};

export function getVerifyEmailContent({ name, verifyUrl, locale = "ko" }: Params) {
  const isKo = locale === "ko";
  const subject = isKo
    ? "THINKAD 이메일 인증을 완료해 주세요"
    : "Verify your THINKAD email";

  const { html, text } = buildThinkadCtaEmail({
    eyebrow: isKo ? "Email Verification" : "Email Verification",
    title: isKo ? "이메일 주소를 인증해 주세요" : "Verify your email address",
    greeting: isKo ? `${name}님, 안녕하세요.` : `Hi ${name},`,
    paragraphs: isKo
      ? [
          "THINKAD 회원가입을 환영합니다.",
          "아래 버튼을 눌러 이메일 인증을 완료해 주세요. 링크는 24시간 동안 유효합니다.",
          "본인이 가입하지 않았다면 이 메일을 무시하셔도 됩니다.",
        ]
      : [
          "Welcome to THINKAD.",
          "Click the button below to verify your email. This link expires in 24 hours.",
          "If you did not sign up, you can ignore this message.",
        ],
    ctaLabel: isKo ? "이메일 인증하기" : "Verify email",
    ctaUrl: verifyUrl,
    footerNote: isKo
      ? "본 메일은 발신 전용입니다."
      : "This is an automated message; please do not reply.",
  });

  return { subject, html, text };
}
