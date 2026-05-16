import type { Prisma } from "@prisma/client";

/** 광고주가 조회 가능한 캠페인 where 절 */
export function campaignAccessWhere(
  userId: string,
  email: string,
): Prisma.CampaignWhereInput {
  return {
    OR: [
      { ownerUserId: userId },
      { clientEmail: { equals: email, mode: "insensitive" } },
    ],
  };
}

export async function assertCampaignAccess(
  db: {
    campaign: {
      findFirst: (args: {
        where: Prisma.CampaignWhereInput;
        select?: { id: true };
      }) => Promise<{ id: string } | null>;
    };
  },
  campaignId: string,
  userId: string,
  email: string,
): Promise<boolean> {
  const row = await db.campaign.findFirst({
    where: { id: campaignId, ...campaignAccessWhere(userId, email) },
    select: { id: true },
  });
  return Boolean(row);
}
