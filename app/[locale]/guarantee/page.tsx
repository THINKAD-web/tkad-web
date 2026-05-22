import { resolveLocaleParam } from "@/lib/resolve-locale";
import { setRequestLocale } from "next-intl/server";
import { LegalPolicyPage } from "@/components/legal/legal-policy-page";
import { guaranteePolicySections } from "@/lib/legal/launch-policy-templates";

type Props = { params: Promise<{ locale: string }> };

export default async function GuaranteePage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return (
    <LegalPolicyPage
      locale={locale}
      code="// 25 · GUARANTEE"
      headlineBefore={isKo ? "성과 " : "Performance "}
      headlineGradient={isKo ? "보증 정책" : "Guarantee"}
      subtitle={
        isKo
          ? "데이터로 증명하는 OOH — 예측 정확도, 실측 비교, 미달 시 환불 기준"
          : "OOH backed by data — prediction accuracy, measured results, and refund terms"
      }
      sections={guaranteePolicySections(isKo)}
      relatedLinks={[
        { href: "/refund", label: isKo ? "환불 정책" : "Refund Policy" },
        { href: "/terms", label: isKo ? "이용약관" : "Terms of Service" },
        { href: "/planner", label: isKo ? "AI 플래너" : "AI Planner" },
      ]}
    />
  );
}
