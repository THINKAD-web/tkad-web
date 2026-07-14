import { notFound } from "next/navigation";
import { ProofUploadMobileClient } from "@/components/campaign-proof/proof-upload-mobile-client";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { resolveCampaignByProofToken } from "@/lib/campaign-proof-service";
import { getCampaignMediaNames } from "@/lib/campaign-proof-service";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string; token: string }> };

export default async function PublicProofUploadPage({ params }: Props) {
  const { locale, token } = await params;
  await resolveLocaleParam(Promise.resolve({ locale }));

  const row = await resolveCampaignByProofToken(token);
  if (!row) notFound();

  const mediaNames = await getCampaignMediaNames(row.campaignId);

  return (
    <HomeLandingDayNight>
      <ProofUploadMobileClient
        token={token}
        campaignName={row.campaign.name}
        mediaNames={mediaNames}
        title={locale === "ko" ? "QR 인증 업로드" : "QR proof upload"}
      />
    </HomeLandingDayNight>
  );
}
