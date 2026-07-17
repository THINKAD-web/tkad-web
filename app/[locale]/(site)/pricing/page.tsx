import type { Metadata } from "next";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { CreditCard } from "lucide-react";
import { routing } from "@/i18n/routing";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { getCurrentUser } from "@/lib/user-session";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MediaKeywordLandingHero } from "@/components/media-keyword-landing-hero";
import { PageContainer } from "@/components/layout/page-container";
import { PricingPageClient } from "@/components/pricing/pricing-page-client";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ trial?: string; success?: string }>;
};

export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "요금제 | THINKAD 싱커드" : "Pricing | THINKAD";
  const description = isKo
    ? "FREE·PRO·ENTERPRISE 플랜. OOH 데이터 보고서, 플래너 PDF, 유동인구 분석을 PRO에서 이용하세요."
    : "FREE, PRO, and Enterprise plans for OOH data reports and planner PDFs.";

  return {
    title,
    description,
    alternates: pageAlternates(locale, "/pricing"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/pricing",
    }),
  };
}

export default async function PricingPage({ params, searchParams }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const sp = await searchParams;
  const user = await getCurrentUser();

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <MediaKeywordLandingHero
          tone="qp"
          eyebrow={`// ${isKo ? "PRICING" : "PRICING"}`}
          title={isKo ? "OOH 데이터, PRO에서" : "OOH data on PRO"}
          description={
            isKo
              ? "매체 분석·플래너 시뮬레이션·PDF 보고서를 데이터로 차별화하세요."
              : "Media analytics, planner simulation, and PDF reports — powered by data."
          }
          icon={<CreditCard className="size-7 dark:text-white text-gray-800" aria-hidden />}
          primaryCta={{
            href: user ? "/planner" : "/register",
            label: isKo ? (user ? "플래너 시작" : "무료 가입") : user ? "Start planner" : "Sign up",
          }}
          secondaryCta={{
            href: "/contact",
            label: isKo ? "엔터프라이즈 문의" : "Enterprise",
          }}
          showBeta={false}
        />

        <section className="relative overflow-hidden border-t border-gray-100 bg-white pb-20 pt-8 text-gray-900 dark:border-white/5 dark:bg-[#0a0a0a] dark:text-white">
          <PageContainer className="relative">
            {sp.success === "1" ? (
              <p className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                {isKo ? "PRO 구독이 활성화되었습니다!" : "PRO subscription activated!"}
              </p>
            ) : null}
            <Suspense fallback={null}>
              <PricingPageClient
                isKo={isKo}
                loggedIn={Boolean(user)}
                userName={user?.name}
                userEmail={user?.email}
                showTrial={sp.trial === "1" || !user}
              />
            </Suspense>
          </PageContainer>
        </section>
      </div>
    </HomeLandingDayNight>
  );
}
