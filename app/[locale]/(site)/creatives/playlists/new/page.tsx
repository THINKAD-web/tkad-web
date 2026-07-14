import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { CreativesShell } from "@/components/creatives/creatives-shell";
import { PlaylistEditor } from "@/components/creatives/playlist-editor";

export const dynamic = "force-dynamic";

export default async function NewPlaylistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  return (
    <CreativesShell
      eyebrow={`[ ${isKo ? "새 플레이리스트" : "New Playlist"} ]`}
      title={isKo ? "새 플레이리스트" : "New playlist"}
      description={
        isKo
          ? "라이브러리에서 소재를 선택해 노출 시간과 스케줄을 설정하세요."
          : "Pick creatives from your library, set durations and schedule rules."
      }
      showBackToLibrary
      isKo={isKo}
    >
      <PlaylistEditor />
    </CreativesShell>
  );
}
