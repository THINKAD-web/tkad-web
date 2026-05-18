import { getCurrentUser } from "@/lib/user-session";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    if (!isDatabaseConfigured()) {
      return apiOk({ items: [] });
    }

    const db = getPrisma();
    const now = new Date();
    const rows = await db.savedCampaignProposal.findMany({
      where: {
        userEmail: user.email,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        brandName: true,
        campaignName: true,
        createdAt: true,
        expiresAt: true,
        inputJson: true,
      },
    });

    const items = rows.map((r) => {
      const input = r.inputJson as { budgetManwon?: number };
      return {
        id: r.id,
        brandName: r.brandName,
        campaignName: r.campaignName,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        budgetManwon: Number(input?.budgetManwon) || 0,
      };
    });

    return apiOk({ items });
  } catch (e) {
    return apiServerError(e, "my/proposals");
  }
}
