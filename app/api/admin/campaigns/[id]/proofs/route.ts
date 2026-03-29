import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: campaignId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const imageUrl = String(body.imageUrl ?? "").trim();
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return json({ error: "imageUrl must be http(s) URL" }, 400);
  }

  const db = getPrisma();
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return json({ error: "Not found" }, 404);

  const photo = await db.campaignProofPhoto.create({
    data: {
      campaignId,
      imageUrl,
      caption: String(body.caption ?? "").trim() || null,
    },
  });
  return json({ photo }, 201);
}
