import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { CreativesShell } from "@/components/creatives/creatives-shell";
import { CreativeLibraryClient } from "@/components/creatives/library-client";

export const dynamic = "force-dynamic";

export default async function CreativesLibraryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return (
    <CreativesShell
      eyebrow="// 06 · CREATIVES ✦ BETA"
      title={
        isKo ? (
          <>
            소재를 올리고{" "}
            <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              바로 집행
            </span>
          </>
        ) : (
          <>
            Upload creatives and{" "}
            <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              go live
            </span>
          </>
        )
      }
      description={
        isKo
          ? "광고 집행에 사용할 이미지·영상 소재를 업로드하고, 즉시예약과 플레이리스트에서 재사용할 수 있습니다."
          : "Upload images and videos once, then reuse them across instant bookings and playlists."
      }
      isKo={isKo}
    >
      <CreativeLibraryClient />
    </CreativesShell>
  );
}
