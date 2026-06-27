import MediaMapPageClient from "@/components/media-map/media-map-page-client";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * `/media/map` — 지도 중심 고정 앱 셸.
 * 마케팅 히어로(// 02 · DISCOVERY) + discovery 서브네비 + 전역 푸터는 이 라우트에서 제거한다.
 * 푸터/오버플로/높이는 `.tkad-media-app-shell` 마커(globals.css `:has()`)로 처리 — root layout 미변경.
 */
export default async function MediaMapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await resolveLocaleParam(params);

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <MediaMapPageClient />
      </div>
    </HomeLandingDayNight>
  );
}
