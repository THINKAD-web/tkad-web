import { getPrisma } from "@/lib/prisma";

/** clientEmail 과 일치하는 가입 User 가 있으면 ownerUserId 로 연결 */
export async function linkCampaignOwnerByEmail(
  campaignId: string,
  clientEmail: string,
): Promise<void> {
  const email = clientEmail.trim();
  if (!email) return;
  const db = getPrisma();
  const user = await db.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!user) return;
  await db.campaign.update({
    where: { id: campaignId },
    data: { ownerUserId: user.id },
  });
}
