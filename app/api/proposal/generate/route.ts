import { NextRequest, NextResponse } from "next/server";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import { generateCampaignProposal } from "@/lib/proposal/generate-proposal";
import { proposalInputSchema } from "@/lib/proposal/types";
import { getCurrentUser } from "@/lib/user-session";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const EXPIRATION_DAYS = 30;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = proposalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (new Date(input.endDate) < new Date(input.startDate)) {
    return NextResponse.json(
      { error: "endDate must be on or after startDate" },
      { status: 400 },
    );
  }

  const catalog = await fetchPublicMediaCatalogList();
  const catalogById = new Map(catalog.map((m) => [m.id, m]));
  const selectedMedia = input.mediaIds
    .map((id) => catalogById.get(id))
    .filter((m): m is NonNullable<typeof m> => !!m);

  if (selectedMedia.length === 0) {
    return NextResponse.json(
      { error: "No valid media IDs in catalog" },
      { status: 400 },
    );
  }

  try {
    const proposal = await generateCampaignProposal(input, selectedMedia);

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        id: null,
        proposal,
        expiresAt: null,
        saved: false,
      });
    }

    const sessionUser = await getCurrentUser();
    const expiresAt = new Date(
      Date.now() + EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    );
    const db = getPrisma();
    const created = await db.savedCampaignProposal.create({
      data: {
        expiresAt,
        userEmail: sessionUser?.email ?? null,
        brandName: input.brandName.trim(),
        campaignName: input.campaignName.trim(),
        inputJson: input as never,
        proposalJson: proposal as never,
      },
      select: { id: true, expiresAt: true },
    });

    return NextResponse.json({
      id: created.id,
      proposal,
      expiresAt: created.expiresAt.toISOString(),
      saved: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        { error: "AI 미설정: ANTHROPIC_API_KEY" },
        { status: 503 },
      );
    }
    console.error("[proposal/generate]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
