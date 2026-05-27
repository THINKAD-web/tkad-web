import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabsBar } from "@/components/layout/sub-tabs-bar";
import { MediaCampaignTargetsGrid } from "@/components/media/media-campaign-targets-grid";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { setRequestLocale } from "next-intl/server";
import { pageAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale.startsWith("ko");
  const title = isKo
    ? "캠페인 목적별 매체 | THINKAD"
    : "OOH media by campaign goal | THINKAD";
  const description = isKo
    ? "브랜드, 팬덤, 팝업, 지자체, 동네, 대학, 지역 프로모션 등 광고 목표에 맞는 OOH 매체를 찾아보세요."
    : "Find OOH media for brand, fandom, pop-up, public sector, local business, campus, and regional campaigns.";

  return {
    title,
    description,
    alternates: pageAlternates(locale, "/media/targets"),
    openGraph: { title, description, type: "website" },
  };
}

export default async function MediaTargetsPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page">
        <PageHero
          eyebrow="// 04 · DISCOVERY"
          title="캠페인 "
          highlight="목적별 매체"
          description="광고 목표에 맞는 최적 매체를 찾아보세요"
        />
        <SubTabsBar group="discovery" currentPath="/media/targets" />
        <MediaCampaignTargetsGrid />
      </div>
    </HomeLandingDayNight>
  );
}
