import { Link } from "@/i18n/navigation";
import {
  getMediaMapShellStats,
  hotspotRegionLabel,
  listMediaMapShellHotspotLinks,
  mediaMapHotspotMapHref,
  mediaMapRegionLandingHref,
} from "@/lib/media-map/shell-content";

type Props = {
  locale: string;
};

/**
 * `/media/map` ISR 서버 셸 — 크롤러·noscript 대비 실제 DOM 텍스트·링크.
 * 지도 UI는 `MediaMapPageClientLoader`(ssr:false)가 담당.
 */
export function MediaMapPageShell({ locale }: Props) {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const stats = getMediaMapShellStats();
  const hotspots = listMediaMapShellHotspotLinks();

  const title = isKo ? "지도에서 찾기" : "Map search";
  const intro = isKo
    ? "위치 기반으로 주변 OOH 매체를 지도에서 탐색하세요. 아래 지역 링크로 강남·성수·홍대·광화문 등 핫스팟을 바로 열거나, 지역별 매체 목록 페이지로 이동할 수 있습니다."
    : "Explore OOH media on an interactive map. Use the region links below to jump to Gangnam, Seongsu, Hongdae, downtown Seoul, and other hotspots, or open region catalog pages.";

  return (
    <section
      className="sr-only"
      aria-label={isKo ? "지도 페이지 소개" : "Map page introduction"}
    >
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{intro}</p>

      <p className="mt-3 text-sm text-foreground">
        {isKo ? (
          <>
            대표 핫스팟 {stats.hotspotRegionCount}개 지역 · 집계 매체{" "}
            {stats.hotspotMediaTotal.toLocaleString("ko-KR")}건
            <span className="text-muted-foreground"> (빌드 시점 스냅샷)</span>
          </>
        ) : (
          <>
            {stats.hotspotRegionCount} hotspot regions ·{" "}
            {stats.hotspotMediaTotal.toLocaleString("en-US")} placements in
            snapshot
          </>
        )}
      </p>

      {hotspots.length > 0 ? (
        <nav className="mt-3" aria-label={isKo ? "지역별 바로가기" : "Browse by region"}>
          <ul className="flex flex-col gap-2 text-sm">
            {hotspots.map((h) => {
              const label = hotspotRegionLabel(h, isKo);
              const mapHref = mediaMapHotspotMapHref(h);
              const regionHref = mediaMapRegionLandingHref(h);
              return (
                <li key={h.regionSub} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <Link href={mapHref} className="font-medium underline underline-offset-2">
                    {label}
                    {isKo ? ` (${h.mediaCount}건)` : ` (${h.mediaCount})`}
                  </Link>
                  <span className="text-muted-foreground" aria-hidden>
                    ·
                  </span>
                  <Link
                    href={regionHref}
                    className="text-muted-foreground underline underline-offset-2"
                  >
                    {isKo ? `${label} 매체 목록` : `${label} catalog`}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </section>
  );
}
