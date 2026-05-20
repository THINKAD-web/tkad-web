import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { createCampaignProofPhoto } from "@/lib/campaign-proof-service";

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

  try {
    const photo = await createCampaignProofPhoto({
      campaignId,
      imageUrl,
      caption: String(body.caption ?? "").trim() || null,
      uploadSource: "admin",
    });
    return json({ photo }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "CAMPAIGN_NOT_FOUND") return json({ error: "Not found" }, 404);
    throw e;
  }
}
