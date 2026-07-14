import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { CreativesShell } from "@/components/creatives/creatives-shell";
import { CreativeUploader } from "@/components/creatives/creative-uploader";

export const dynamic = "force-dynamic";

export default async function CreativeUploadPage({
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
        eyebrow: "// 03 · STUDIO",
        title: "크리에이티브 ",
        highlight: "스튜디오",
        description: isKo
          ? "매체 유형을 고르면 권장 규격에 맞춰 안내합니다. Cloudinary 직접 업로드로 빠르게 처리됩니다."
          : "Pick a media type for spec hints. Files upload directly to Cloudinary via signed URLs.",
      }}
      subTabPath="/creatives/upload"
      showBackToLibrary
      isKo={isKo}
    >
      <CreativeUploader />
    </CreativesShell>
  );
}
