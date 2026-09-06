import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/user-session";
import { createCampaignPlan } from "@/lib/campaign-plan-store";
import {
  buildCampaignPlanSnapshot,
  buildOnlineCampaignPlanSnapshot,
} from "@/lib/planner/brief/build-plan-snapshot";
import { normalizeBriefCustomLines } from "@/lib/planner/brief/custom-lines";
import { normalizeBriefInput } from "@/lib/planner/brief/types";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";
import { parsePlannerReportCopyState } from "@/lib/planner-report-export/report-copy-state";
import { recommendOnlineCatalogFromBrief } from "@/lib/planner/brief/online-catalog-adapter";

export const dynamic = "force-dynamic";

const SaveBodySchema = z.object({
  brief: z.record(z.string(), z.unknown()),
  /** digital_only 저장 요청 — 있으면 mixUnits 대신 브리프에서 온라인 채널을 재계산해 저장 */
  channelMode: z.enum(["ooh_only", "ooh_digital", "digital_only"]).optional(),
  mixUnits: z.record(z.string(), z.number()).optional(),
  customLines: z.array(z.record(z.string(), z.unknown())).optional(),
  reportCopy: z.record(z.string(), z.unknown()).optional(),
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
  const reportCopy = parsed.data.reportCopy
    ? parsePlannerReportCopyState(parsed.data.reportCopy)
    : null;

  let snapshot;
  if (parsed.data.channelMode === "digital_only") {
    const { catalog } = await fetchPlannerMediaCatalog();
    // 클라이언트가 계산한 결과를 신뢰하지 않고 브리프+카탈로그로 서버에서
    // 재계산한다 — OOH 저장이 mixUnits+카탈로그로 metrics를 재계산하는 것과
    // 동일한 원칙(저장값은 항상 서버 재계산 기준).
    const result = recommendOnlineCatalogFromBrief(brief, catalog, true);
    if (result.platforms.length === 0) {
      return NextResponse.json({ error: "No online channels to save" }, { status: 400 });
    }
    snapshot = buildOnlineCampaignPlanSnapshot({ brief, result, isKo: true });
  } else {
    const mixUnits: Record<string, number> = {};
    for (const [id, v] of Object.entries(parsed.data.mixUnits ?? {})) {
      const n = Math.floor(v);
      if (Number.isFinite(n) && n > 0) mixUnits[id] = n;
    }
    const customLines = normalizeBriefCustomLines(parsed.data.customLines);
    if (Object.keys(mixUnits).length === 0 && customLines.length === 0) {
      return NextResponse.json({ error: "Empty media mix" }, { status: 400 });
    }

    const { catalog } = await fetchPlannerMediaCatalog();
    snapshot = buildCampaignPlanSnapshot({
      brief,
      catalog,
      mixUnits,
      customLines,
    });
  }

  try {
    const sessionUser = await getCurrentUser();
    const saved = await createCampaignPlan({
      snapshot: {
        ...snapshot,
        reportCopy,
      },
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
