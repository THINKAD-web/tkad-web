import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminDb } from "@/lib/admin-guard";
import {
  createCampaignProofPhoto,
  resolveCampaignByProofToken,
} from "@/lib/campaign-proof-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string().optional(),
  token: z.string().optional(),
  imageUrl: z.string().url(),
  mediaName: z.string().max(120).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  capturedAt: z.string().optional().nullable(),
  caption: z.string().max(500).optional().nullable(),
  uploadSource: z
    .enum(["mobile", "qr", "admin", "media_owner"])
    .optional(),
});

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let campaignId = parsed.data.campaignId;
  let uploadSource = parsed.data.uploadSource ?? "mobile";

  if (parsed.data.token) {
    const resolved = await resolveCampaignByProofToken(parsed.data.token);
    if (!resolved) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
    }
    campaignId = resolved.campaignId;
    uploadSource = "qr";
  } else if (!campaignId) {
    return NextResponse.json({ error: "campaignId or token required" }, { status: 400 });
  } else {
    const deny = assertAdminDb(request);
    if (deny) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    uploadSource = parsed.data.uploadSource ?? "admin";
  }

  const capturedAt = parsed.data.capturedAt
    ? new Date(parsed.data.capturedAt)
    : new Date();

  try {
    const photo = await createCampaignProofPhoto({
      campaignId: campaignId!,
      imageUrl: parsed.data.imageUrl,
      mediaName: parsed.data.mediaName,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      capturedAt,
      caption: parsed.data.caption,
      uploadSource,
      proofToken: parsed.data.token ?? null,
    });
    return NextResponse.json({
      ok: true,
      photo: {
        id: photo.id,
        imageUrl: photo.imageUrlWatermarked ?? photo.imageUrl,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg === "CAMPAIGN_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[campaign-proof/submit]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
