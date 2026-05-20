import { ProofUploadMobileClient } from "@/components/campaign-proof/proof-upload-mobile-client";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getCampaignMediaNames } from "@/lib/campaign-proof-service";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function AdminCampaignProofUploadPage({ params }: Props) {
  const { locale, id } = await params;
  await resolveLocaleParam(Promise.resolve({ locale }));

  let campaignName = "";
  let mediaNames: string[] = [];
  if (isDatabaseConfigured()) {
    const c = await getPrisma().campaign.findUnique({
      where: { id },
      select: { name: true },
    });
    campaignName = c?.name ?? "";
    mediaNames = await getCampaignMediaNames(id);
  }

  return (
    <HomeLandingDayNight>
      <ProofUploadMobileClient
        campaignId={id}
        campaignName={campaignName}
        mediaNames={mediaNames}
        title={locale === "ko" ? "현장 인증 업로드" : "Field proof upload"}
      />
    </HomeLandingDayNight>
  );
}
