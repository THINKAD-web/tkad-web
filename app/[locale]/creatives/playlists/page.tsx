import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { CreativesShell } from "@/components/creatives/creatives-shell";
import { PlaylistListClient } from "@/components/creatives/playlist-list-client";

export const dynamic = "force-dynamic";

export default async function PlaylistListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return (
    <CreativesShell
      eyebrow={`[ ${isKo ? "DOOH 플레이리스트" : "DOOH Playlists"} ]`}
      title={
        isKo ? (
          <>
            여러 소재를 묶어 <span className="tkad-home-accent-text">스케줄</span>로
          </>
        ) : (
          <>
            Bundle creatives into a <span className="tkad-home-accent-text">schedule</span>
          </>
        )
      }
      description={
        isKo
          ? "요일·시간대별로 다른 소재를 노출하는 DOOH 플레이리스트를 만들고, 즉시예약에 한 번에 연결할 수 있습니다."
          : "Build DOOH playlists with day/time rules, then attach them to instant bookings in one click."
      }
      isKo={isKo}
    >
      <PlaylistListClient />
    </CreativesShell>
  );
}
