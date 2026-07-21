import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { LegalPolicyPage } from "@/components/legal/legal-policy-page";
import { termsOfServiceSections } from "@/lib/legal/launch-policy-templates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "이용약관 | THINKAD 싱커드" : "Terms of Service | THINKAD";
  const description = isKo
    ? "THINKAD 싱커드 서비스 이용약관. 회원·콘텐츠·책임 범위 등 이용 조건을 확인하세요."
    : "Terms of service for THINKAD — accounts, content, and liability.";

  return {
    title,
    description,
    alternates: pageAlternates(locale, "/terms"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/terms",
      image: { kind: "default" },
    }),
  };
}

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
