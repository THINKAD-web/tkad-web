import { NextRequest, NextResponse } from "next/server";
import { isSavedCampaignProposalId } from "@/lib/proposal/types";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!isSavedCampaignProposalId(id)) {
    return NextResponse.json({ error: "Invalid proposal id" }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const db = getPrisma();
  const row = await db.savedCampaignProposal.findUnique({
    where: { id },
  });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  await db.savedCampaignProposal.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  return NextResponse.json(
    {
      id: row.id,
      brandName: row.brandName,
      campaignName: row.campaignName,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      inputJson: row.inputJson,
      proposalJson: row.proposalJson,
    },
    {
      headers: {
        "cache-control": "private, max-age=60",
      },
    },
  );
}
