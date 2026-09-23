import MediaMapPageClientLoader from "@/components/media-map/media-map-page-client-loader";
import { MediaMapPageShell } from "@/components/media-map/media-map-page-shell";
import { MediaMapTileResourceHints } from "@/components/media-map/media-map-tile-resource-hints";
import { MediaMapViewportPlaceholder } from "@/components/media-map/media-map-viewport-placeholder";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

/** 핫스팟 JSON·셸 카피 — 실시간 카탈로그 불필요 */
export const revalidate = 300;

/**
 * `/media/map` — ISR 서버 셸 + 클라이언트 지도 앱.
 * 마케팅 히어로(// 02 · DISCOVERY) + discovery 서브네비 + 전역 푸터는 이 라우트에서 제거한다.
 * 푸터는 `(site-media-map)` 레이아웃에서 DOM 제외. 오버플로/높이는 `.tkad-media-app-shell`(globals.css).
 */
export default async function MediaMapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);

  return (
    <div className="tkad-landing-neon tkad-planner-neon tkad-media-page flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <MediaMapTileResourceHints />
      <MediaMapPageShell locale={locale} />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <MediaMapViewportPlaceholder locale={locale} />
        <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
          <HomeLandingDayNight>
            <MediaMapPageClientLoader />
          </HomeLandingDayNight>
        </div>
      </div>
    </div>
  );
}
