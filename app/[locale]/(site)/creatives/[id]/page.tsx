import { setRequestLocale } from "next-intl/server";
import { CreativesShell } from "@/components/creatives/creatives-shell";
import { CreativeDetailClient } from "@/components/creatives/creative-detail-client";

export const dynamic = "force-dynamic";

export default async function CreativeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return (
    <CreativesShell
      eyebrow={`[ ${isKo ? "소재 상세" : "Creative Detail"} ]`}
      title={isKo ? "소재 정보" : "Creative info"}
      description={
        isKo
          ? "이름·태그를 편집하고, 어떤 캠페인/플레이리스트에서 사용 중인지 확인할 수 있습니다."
          : "Rename, tag, and see where this creative is used."
      }
      showBackToLibrary
      isKo={isKo}
    >
      <CreativeDetailClient id={id} />
    </CreativesShell>
  );
}
