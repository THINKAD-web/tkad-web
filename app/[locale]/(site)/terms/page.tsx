import { resolveLocaleParam } from "@/lib/resolve-locale";
import { setRequestLocale } from "next-intl/server";
import { LegalPolicyPage } from "@/components/legal/legal-policy-page";
import { termsOfServiceSections } from "@/lib/legal/launch-policy-templates";

type Props = { params: Promise<{ locale: string }> };

export default async function TermsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return (
    <LegalPolicyPage
      locale={locale}
      code="// 23 · TERMS"
      headlineBefore={isKo ? "이용 " : "Terms of "}
      headlineGradient={isKo ? "약관" : "Service"}
      subtitle={
        isKo
          ? "THINKAD 싱커드 서비스 이용에 관한 기본 약관"
          : "Terms governing use of THINKAD services"
      }
      sections={termsOfServiceSections(isKo)}
      relatedLinks={[
        { href: "/privacy", label: isKo ? "개인정보처리방침" : "Privacy Policy" },
        { href: "/refund", label: isKo ? "환불 정책" : "Refund Policy" },
        { href: "/guarantee", label: isKo ? "성과 보증 정책" : "Performance Guarantee" },
      ]}
    />
  );
}
