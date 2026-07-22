import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { MediaCampaignTargetsGrid } from "@/components/media/media-campaign-targets-grid";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { setRequestLocale } from "next-intl/server";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { getPublicMediaCountLabel } from "@/lib/trust-metrics";
import { fetchTargetLandingPreviews } from "@/lib/media-landing-previews";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale.startsWith("ko");
  const verifiedMediaLabel = await getPublicMediaCountLabel("verified");
  const title = isKo
    ? "캠페인 목적별 매체 | THINKAD"
    : "OOH media by campaign goal | THINKAD";
  const description = isKo
    ? `전국 ${verifiedMediaLabel} 검증 매체에서 브랜드·팬덤·팝업·지자체·동네·대학·지역 프로모션 등 광고 목표에 맞는 OOH를 찾아보세요.`
    : `Browse ${verifiedMediaLabel} verified OOH placements by goal — brand, fandom, pop-up, public sector, local, campus, and regional.`;

  return {
    title,
    description,
    alternates: pageAlternates(locale, "/media/targets"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/media/targets",
      image: { kind: "segment", segment: "media" },
    }),
  };
}

export default async function MediaTargetsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale.startsWith("ko");
  const [verifiedCountLabel, previews] = await Promise.all([
    getPublicMediaCountLabel("verified"),
    fetchTargetLandingPreviews(),
  ]);

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page min-w-0">
        <PageHero
          eyebrow="// 04 · DISCOVERY"
          title={isKo ? "캠페인 " : "Media by "}
          highlight={isKo ? "목적별 매체" : "campaign goal"}
          description={
            isKo
              ? `전국 ${verifiedCountLabel} 검증 매체 — 목표를 고르면 매체 검색 필터로 바로 이어집니다.`
              : `${verifiedCountLabel} verified placements — pick a goal to jump into media filters.`
          }
        />

        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
            <Link
              href="/media"
              className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {isKo ? "매체 검색" : "Media search"}
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isKo ? (
                <>
                  미리 짜 둔 조합·견적이 필요하면{" "}
                  <Link
                    href="/media/packages"
                    className="font-medium text-[color:var(--qp-accent)] underline-offset-2 hover:underline"
                  >
                    패키지 제안
                  </Link>
                  으로 가세요.
                </>
              ) : (
                <>
                  Need a curated quote-ready bundle? See{" "}
                  <Link
                    href="/media/packages"
                    className="font-medium text-[color:var(--qp-accent)] underline-offset-2 hover:underline"
                  >
                    packages
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
        </div>

        <MediaCampaignTargetsGrid previews={previews} isKo={isKo} />
      </div>
    </HomeLandingDayNight>
  );
}
