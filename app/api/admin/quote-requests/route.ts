import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { searchParams } = new URL(request.url);
  const unlinked = searchParams.get("unlinked") === "1";
  const campaignId = searchParams.get("campaignId")?.trim();

  const db = getPrisma();
  const quotes = await db.quoteRequest.findMany({
    where: {
      ...(unlinked ? { campaignId: null } : {}),
      ...(campaignId ? { campaignId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(searchParams.get("take") ?? 120) || 120, 300),
    select: {
      id: true,
      company: true,
      name: true,
      email: true,
      estimatedCost: true,
      createdAt: true,
      campaignId: true,
    },
  });

  return json({ quotes });
}
