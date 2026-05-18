import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProposalSharePageClient } from "@/components/proposal/proposal-share-page-client";
import { isSavedCampaignProposalId } from "@/lib/proposal/types";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import type { CampaignProposalOutput, ProposalInput } from "@/lib/proposal/types";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ProposalSharePage({ params }: Props) {
  const { locale, id } = await params;
  await resolveLocaleParam(Promise.resolve({ locale }));

  if (!isSavedCampaignProposalId(id) || !isDatabaseConfigured()) {
    notFound();
  }

  const db = getPrisma();
  const row = await db.savedCampaignProposal.findUnique({ where: { id } });
  if (!row || row.expiresAt.getTime() < Date.now()) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "proposal" });

  return (
    <ProposalSharePageClient
      proposalId={row.id}
      brandName={row.brandName}
      campaignName={row.campaignName}
      input={row.inputJson as ProposalInput}
      proposal={row.proposalJson as CampaignProposalOutput}
      isKo={locale === "ko"}
      pageTitle={t("sharePageTitle")}
    />
  );
}
