import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signUploadParams } from "@/lib/cloudinary-sign";
import { proofUploadFolder } from "@/lib/campaign-proof-cloudinary";
import { assertAdminDb } from "@/lib/admin-guard";
import { resolveCampaignByProofToken } from "@/lib/campaign-proof-service";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  campaignId: z.string().optional(),
  token: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let campaignId = parsed.data.campaignId;

  if (parsed.data.token) {
    const resolved = await resolveCampaignByProofToken(parsed.data.token);
    if (!resolved) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
    }
    campaignId = resolved.campaignId;
  } else if (!campaignId) {
    return NextResponse.json({ error: "campaignId or token required" }, { status: 400 });
  } else {
    const adminDeny = assertAdminDb(request);
    if (adminDeny) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const c = await getPrisma().campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });
    if (!c) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
  }

  const signed = signUploadParams(proofUploadFolder(campaignId!));
  if (!signed) {
    return NextResponse.json(
      { error: "Cloudinary not configured" },
      { status: 503 },
    );
  }
  return NextResponse.json({ ...signed, campaignId });
}
