import MediaMapPageClient from "@/components/media-map/media-map-page-client";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabsBar } from "@/components/layout/sub-tabs-bar";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTrustMetrics, formatTrustCount } from "@/lib/trust-metrics";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MediaMapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await resolveLocaleParam(params);
  const trust = await getTrustMetrics();
  const verifiedLabel = formatTrustCount(trust.mediaCount);

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page">
        <PageHero
          eyebrow="// 02 · DISCOVERY"
          title="지도로 찾는 "
          highlight="옥외광고"
          description={`${verifiedLabel} 검증 매체를 지도에서 유형·지역별로 탐색하세요`}
        />
        <SubTabsBar group="discovery" currentPath="/media/map" />
        <MediaMapPageClient />
      </div>
    </HomeLandingDayNight>
  );
}
