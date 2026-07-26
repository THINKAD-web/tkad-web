import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { LegalPolicyPage } from "@/components/legal/legal-policy-page";
import { refundPolicySections } from "@/lib/legal/launch-policy-templates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "환불 정책 | THINKAD 싱커드" : "Refund Policy | THINKAD";
  const description = isKo
    ? "유료 구독·디지털 서비스 환불 정책. 신청 방법과 처리 기준을 안내합니다."
    : "Refund policy for paid subscriptions and digital services on THINKAD.";

  return {
    title,
    description,
    alternates: pageAlternates(locale, "/refund"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/refund",
      image: { kind: "default" },
    }),
  };
}

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
      ]}
    />
  );
}
