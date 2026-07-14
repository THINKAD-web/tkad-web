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
      pageHero={{
        eyebrow: "// 01 · STUDIO",
        title: "소재를 올리고 ",
        highlight: "바로 집행",
        description: isKo
          ? "OOH 광고 소재를 업로드하고 DOOH 화면에서 미리보기"
          : "Upload OOH creatives and preview them on DOOH screens.",
      }}
      subTabPath="/creatives"
      isKo={isKo}
    >
      <CreativeLibraryClient />
    </CreativesShell>
  );
}
