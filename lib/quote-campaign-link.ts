import { CampaignStatus, type PrismaClient } from "@prisma/client";

const LINK_STATUSES: CampaignStatus[] = [
  CampaignStatus.proposal,
  CampaignStatus.contract,
  CampaignStatus.airing,
];

/**
 * After a public quote request is saved, attach it to the most recently updated
 * open campaign with the same client email, or to a campaign linked to the CRM
 * account with that email.
 */
export async function autoLinkQuoteRequestToCampaign(
  db: PrismaClient,
  quoteRequestId: string,
  emailRaw: string | null | undefined,
): Promise<void> {
  const email = emailRaw?.trim();
  if (!email) return;

  let campaign = await db.campaign.findFirst({
    where: {
      clientEmail: { equals: email, mode: "insensitive" },
      status: { in: LINK_STATUSES },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!campaign) {
    const acc = await db.crmAccount.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (acc) {
      campaign = await db.campaign.findFirst({
        where: {
          accountId: acc.id,
          status: { in: LINK_STATUSES },
        },
        orderBy: { updatedAt: "desc" },
      });
    }
  }

  if (campaign) {
    await db.quoteRequest.update({
      where: { id: quoteRequestId },
      data: { campaignId: campaign.id },
    });
  }
}
