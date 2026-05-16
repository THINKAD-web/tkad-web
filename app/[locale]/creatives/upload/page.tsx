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
      eyebrow={`[ ${isKo ? "소재 업로드" : "Upload Creative"} ]`}
      title={
        isKo ? (
          <>
            <span className="tkad-home-accent-text">소재</span>를 업로드하세요
          </>
        ) : (
          <>
            Upload a <span className="tkad-home-accent-text">creative</span>
          </>
        )
      }
      description={
        isKo
          ? "매체 유형을 먼저 고르면 권장 규격에 맞춰 자동으로 안내합니다. Cloudinary 직접 업로드(서명 방식)로 빠르게 처리됩니다."
          : "Pick a media type to get spec hints. Files upload directly to Cloudinary via signed URLs."
      }
      showBackToLibrary
      isKo={isKo}
    >
      <CreativeUploader />
    </CreativesShell>
  );
}
