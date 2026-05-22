import { resolveLocaleParam } from "@/lib/resolve-locale";
import { setRequestLocale } from "next-intl/server";
import { LegalPolicyPage } from "@/components/legal/legal-policy-page";
import { refundPolicySections } from "@/lib/legal/launch-policy-templates";

type Props = { params: Promise<{ locale: string }> };

export default async function RefundPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return (
    <LegalPolicyPage
      locale={locale}
      code="// 24 · REFUND"
      headlineBefore={isKo ? "환불 " : "Refund "}
      headlineGradient={isKo ? "정책" : "Policy"}
      subtitle={
        isKo
          ? "유료 구독·디지털 서비스 환불 기준 (토스페이먼츠 가이드 참고)"
          : "Refund rules for paid subscriptions and digital services"
      }
      sections={refundPolicySections(isKo)}
      relatedLinks={[
        { href: "/terms", label: isKo ? "이용약관" : "Terms of Service" },
        { href: "/privacy", label: isKo ? "개인정보처리방침" : "Privacy Policy" },
        { href: "/guarantee", label: isKo ? "성과 보증 정책" : "Performance Guarantee" },
      ]}
    />
  );
}
