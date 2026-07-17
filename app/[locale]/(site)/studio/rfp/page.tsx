import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getCurrentUser } from "@/lib/user-session";
import { checkReportAccess } from "@/lib/report-access";
import { PageHero } from "@/components/layout/page-hero";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { StudioRfpParser } from "@/components/studio/studio-rfp-parser";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  return {
    title: isKo ? "RFP 그룹 파서 | THINKAD" : "RFP Group Parser | THINKAD",
    description: isKo
      ? "장문 RFP를 권역 그룹으로 구조화하고 확인·수정합니다."
      : "Structure long RFPs into region groups for review.",
    robots: { index: false, follow: false },
  };
}

export default async function StudioRfpPage({ params }: Props) {
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
          title={isKo ? "RFP " : "RFP "}
          highlight={isKo ? "그룹 파서" : "Group Parser"}
          description={
            isKo
              ? "장문 RFP에서 권역·매체 그룹을 추출하고, 사람이 확인·수정합니다 (MVP)"
              : "Extract region/media groups from long RFPs, then review and edit (MVP)"
          }
        />
        <div className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
          {access.allowed ? (
            <StudioRfpParser locale={locale} />
          ) : (
            <div className="mx-auto max-w-lg rounded-2xl border border-violet-300/40 bg-white/60 p-8 text-center dark:border-violet-400/20 dark:bg-white/5">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {isKo ? "PRO 전용 기능입니다" : "PRO members only"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {access.reason === "login"
                  ? isKo
                    ? "로그인 후 PRO 플랜에서 이용하실 수 있습니다."
                    : "Sign in with a PRO plan to use this tool."
                  : isKo
                    ? "RFP 그룹 파서는 PRO 플랜에서 제공됩니다."
                    : "The RFP group parser is available on the PRO plan."}
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Link
                  href={access.reason === "login" ? "/login?redirect=/studio/rfp" : "/pricing"}
                  className="inline-flex h-10 items-center rounded-xl bg-violet-600 px-5 text-sm font-bold text-white"
                >
                  {access.reason === "login"
                    ? isKo
                      ? "로그인"
                      : "Sign in"
                    : isKo
                      ? "PRO 보기"
                      : "See PRO"}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
