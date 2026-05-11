export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import MediaBrowseClient from "@/components/media-browse-client";
import { MediaLandingLinksFooter } from "@/components/media-landing-links-footer";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

type Props = { params: Promise<{ locale: string }> };

export default async function MediaPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  const catalog = await fetchPublicMediaCatalog();

  // 카탈로그의 unique region/type/area — 키워드 랜딩 footer 에 사용
  const regionSet = new Set<string>();
  const typeSet = new Set<string>();
  const areaSet = new Set<string>();
  for (const m of catalog) {
    if (m.region) regionSet.add(m.region);
    if (m.type) typeSet.add(m.type);
    const area = m.district || m.city;
    if (area) areaSet.add(area);
  }

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page">
        <Suspense fallback={null}>
          <MediaBrowseClient catalog={catalog} />
        </Suspense>
        <MediaLandingLinksFooter
          locale={locale}
          availableRegions={Array.from(regionSet)}
          availableTypes={Array.from(typeSet)}
          availableAreas={Array.from(areaSet)}
        />
      </div>
    </HomeLandingDayNight>
  );
}