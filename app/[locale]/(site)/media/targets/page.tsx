import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabsBar } from "@/components/layout/sub-tabs-bar";
import { MediaCampaignTargetsGrid } from "@/components/media/media-campaign-targets-grid";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { Link } from "@/i18n/navigation";
import { Package } from "lucide-react";
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
              ? `전국 ${verifiedCountLabel} 검증 매체 — 목표를 고르면 /media 필터로 바로 이어집니다. 미리 짜 둔 조합이 필요하면 패키지를 보세요.`
              : `${verifiedCountLabel} verified placements — pick a goal to open /media filters. Need a curated bundle? See packages.`
          }
        />
        <SubTabsBar group="discovery" currentPath="/media/targets" />

        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 border-2 border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0 space-y-1">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
                [ {isKo ? "역할 구분" : "How this differs"} ]
              </p>
              <p className="text-sm text-muted-foreground">
                {isKo
                  ? "목적 허브 = 탐색 필터 진입. 견적까지 묶인 조합은 패키지 제안에서."
                  : "Goal hub = discovery filters. Bundled quote-ready packs live under Packages."}
              </p>
            </div>
            <Link
              href="/media/packages"
              className="inline-flex shrink-0 items-center gap-2 border-2 border-border bg-muted px-3 py-2 text-xs font-bold text-foreground transition-colors hover:border-accent"
            >
              <Package className="h-3.5 w-3.5 text-accent" aria-hidden />
              {isKo ? "목적별 OOH 패키지 →" : "Curated OOH packages →"}
            </Link>
          </div>
        </div>

        <MediaCampaignTargetsGrid previews={previews} isKo={isKo} />
      </div>
    </HomeLandingDayNight>
  );
}
