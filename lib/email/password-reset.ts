import { buildThinkadCtaEmail } from "@/lib/email/email-layout";

type Params = {
  name: string;
  resetUrl: string;
  locale?: string;
};

export function getPasswordResetEmailContent({
  name,
  resetUrl,
  locale = "ko",
}: Params) {
  const isKo = locale === "ko";
  const subject = isKo
    ? "THINKAD 비밀번호 재설정"
    : "Reset your THINKAD password";

  const { html, text } = buildThinkadCtaEmail({
    eyebrow: isKo ? "Password Reset" : "Password Reset",
    title: isKo ? "비밀번호를 재설정하세요" : "Reset your password",
    greeting: isKo ? `${name}님, 안녕하세요.` : `Hi ${name},`,
    paragraphs: isKo
      ? [
          "비밀번호 재설정 요청을 받았습니다.",
          "아래 버튼을 눌러 새 비밀번호를 설정해 주세요. 링크는 1시간 동안만 유효합니다.",
          "요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.",
        ]
      : [
          "We received a request to reset your password.",
          "Click below to set a new password. This link expires in 1 hour.",
          "If you did not request this, you can ignore this email.",
        ],
    ctaLabel: isKo ? "비밀번호 재설정" : "Reset password",
    ctaUrl: resetUrl,
    footerNote: isKo
      ? "본 메일은 발신 전용입니다."
      : "This is an automated message; please do not reply.",
  });

  return { subject, html, text };
}
