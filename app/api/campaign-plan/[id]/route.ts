import { NextRequest, NextResponse } from "next/server";
import { getCampaignPlanById } from "@/lib/campaign-plan-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** PR-6c — 저장된 CampaignPlan 조회 (재접속 시 숫자 동일) */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const plan = await getCampaignPlanById(id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    return NextResponse.json(plan);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load campaign plan", detail: msg },
      { status: 500 },
    );
  }
}
