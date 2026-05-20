import { apiOk } from "@/lib/api-response";
import { requireMediaOwner } from "@/lib/media-owner-guard";
import { getPrisma } from "@/lib/prisma";
import { formatResponseTime, getMediaOwnerPublicProfile } from "@/lib/media-owner-ratings";
import { tierLabel } from "@/lib/media-owner-tier";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  const profile = await getMediaOwnerPublicProfile(auth.user.id);
  const db = getPrisma();
  const stats = await db.mediaOwnerStats.findUnique({
    where: { ownerUserId: auth.user.id },
  });

  return apiOk({
    tier: stats?.tier ?? "BRONZE",
    tierLabel: tierLabel(stats?.tier ?? "BRONZE"),
    avgRating: profile?.avgRating ?? null,
    reviewCount: profile?.reviewCount ?? 0,
    avgResponseLabel: formatResponseTime(stats?.avgResponseMinutes ?? null),
    registrationFeeWaived: stats?.registrationFeeWaived ?? false,
    cumulativeContractWon: stats?.cumulativeContractWon ?? 0,
    successfulBidCount: stats?.successfulBidCount ?? 0,
  });
}
