import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getCurrentUser } from "@/lib/user-session";
import { checkReportAccess } from "@/lib/report-access";
import { PageHero } from "@/components/layout/page-hero";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { StudioProposalWizard } from "@/components/studio/studio-proposal-wizard";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  return {
    title: isKo ? "AI 제안서 스튜디오 | THINKAD" : "AI Proposal Studio | THINKAD",
    description: isKo
      ? "유형별 맞춤 마케팅 제안서를 AI로 3분 만에. OOH 캠페인·통합·업종·매체 영업."
      : "AI-generated marketing proposals by type in minutes.",
    robots: { index: false, follow: false },
  };
}

export default async function StudioProposalPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  const user = await getCurrentUser();
  const access = await checkReportAccess(user?.id ?? null, "planner_pdf");

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon bg-gray-50 dark:bg-[#0A0A0A]">
        <PageHero
          eyebrow="// AI STUDIO"
          title={isKo ? "AI " : "AI "}
          highlight={isKo ? "제안서 스튜디오" : "Proposal Studio"}
          description={
            isKo
              ? "유형을 고르면 AI가 시장분석·전략·매체·예산까지 맞춤 제안서를 구성합니다"
              : "Pick a type and AI builds a tailored proposal — analysis, strategy, media, budget"
          }
        />
        <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
          {access.allowed ? (
            <StudioProposalWizard locale={locale} />
          ) : (
            <div className="mx-auto max-w-lg rounded-2xl border border-violet-300/40 bg-white/60 p-8 text-center dark:border-violet-400/20 dark:bg-white/5">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {isKo ? "PRO 전용 기능입니다" : "PRO members only"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {access.reason === "login"
                  ? isKo
                    ? "로그인 후 PRO 플랜에서 이용하실 수 있습니다."
                    : "Sign in with a PRO plan to use the studio."
                  : isKo
                    ? "AI 제안서 스튜디오는 PRO 플랜에서 제공됩니다."
                    : "The AI Proposal Studio is available on the PRO plan."}
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Link
                  href={access.reason === "login" ? "/login?redirect=/studio/proposal" : "/pricing"}
                  className="inline-flex h-10 items-center rounded-xl bg-violet-600 px-5 text-sm font-bold text-white"
                >
                  {access.reason === "login"
                    ? isKo ? "로그인" : "Sign in"
                    : isKo ? "PRO 보기" : "See PRO"}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
