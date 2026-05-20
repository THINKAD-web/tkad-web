import { NextResponse } from "next/server";
import { resolveCampaignByProofToken } from "@/lib/campaign-proof-service";
import { getCampaignMediaNames } from "@/lib/campaign-proof-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const row = await resolveCampaignByProofToken(token);
  if (!row) {
    return NextResponse.json({ error: "Invalid or expired" }, { status: 404 });
  }
  const mediaNames = await getCampaignMediaNames(row.campaignId);
  return NextResponse.json({
    campaignId: row.campaignId,
    campaignName: row.campaign.name,
    mediaNames,
  });
}
