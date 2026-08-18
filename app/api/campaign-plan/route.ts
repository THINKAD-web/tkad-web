import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/user-session";
import { createCampaignPlan } from "@/lib/campaign-plan-store";
import { buildCampaignPlanSnapshot } from "@/lib/planner/brief/build-plan-snapshot";
import { normalizeBriefInput } from "@/lib/planner/brief/types";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";

export const dynamic = "force-dynamic";

const SaveBodySchema = z.object({
  brief: z.record(z.string(), z.unknown()),
  mixUnits: z.record(z.string(), z.number()),
});

/**
 * PR-6c — CampaignPlan 저장.
 * engineVersion · dataQuality · createdAt 을 스냅샷한다.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SaveBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const brief = normalizeBriefInput(parsed.data.brief);
  const mixUnits: Record<string, number> = {};
  for (const [id, v] of Object.entries(parsed.data.mixUnits)) {
    const n = Math.floor(v);
    if (Number.isFinite(n) && n > 0) mixUnits[id] = n;
  }
  if (Object.keys(mixUnits).length === 0) {
    return NextResponse.json({ error: "Empty media mix" }, { status: 400 });
  }

  const { catalog } = await fetchPlannerMediaCatalog();
  const snapshot = buildCampaignPlanSnapshot({ brief, catalog, mixUnits });

  try {
    const sessionUser = await getCurrentUser();
    const saved = await createCampaignPlan({
      snapshot,
      ownerId: sessionUser?.id ?? null,
    });
    return NextResponse.json(saved);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to save campaign plan", detail: msg },
      { status: 500 },
    );
  }
}
