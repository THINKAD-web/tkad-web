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
      eyebrow=""
      title=""
      categoryHero={{
        code: "// 06 · CREATIVES",
        showBeta: true,
        headlineBefore: isKo ? "소재를 올리고 " : "Upload creatives and ",
        headlineGradient: isKo ? "바로 집행" : "go live",
        subtitle: isKo
          ? "광고 집행에 사용할 이미지·영상 소재를 업로드하고, 즉시예약과 플레이리스트에서 재사용할 수 있습니다."
          : "Upload images and videos once, then reuse them across instant bookings and playlists.",
      }}
      isKo={isKo}
    >
      <CreativeLibraryClient />
    </CreativesShell>
  );
}
