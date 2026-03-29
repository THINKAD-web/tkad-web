import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (body.campaignId === undefined) {
    return json({ error: "campaignId required (or null to unlink)" }, 400);
  }

  const campaignId =
    body.campaignId === null || body.campaignId === ""
      ? null
      : String(body.campaignId).trim();

  const db = getPrisma();
  if (campaignId) {
    const c = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!c) return json({ error: "Campaign not found" }, 400);
  }

  try {
    const quote = await db.quoteRequest.update({
      where: { id },
      data: { campaignId },
    });
    return json({ quote });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
