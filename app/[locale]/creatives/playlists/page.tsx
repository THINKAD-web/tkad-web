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
      pageHero={{
        eyebrow: "// 02 · STUDIO",
        title: "DOOH ",
        highlight: "플레이리스트",
        description: isKo
          ? "요일·시간대별로 다른 소재를 노출하는 DOOH 플레이리스트를 만들고, 즉시예약에 연결하세요"
          : "Build DOOH playlists with day/time rules and attach them to instant bookings.",
      }}
      subTabPath="/creatives/playlists"
      isKo={isKo}
    >
      <PlaylistListClient />
    </CreativesShell>
  );
}
