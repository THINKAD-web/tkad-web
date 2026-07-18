import { NextRequest, NextResponse } from "next/server";
import { requirePlannerPdfAccess } from "@/lib/require-planner-pdf-access";
import { matchRfpProposalBrief } from "@/lib/rfp-proposal/match-rfp-brief";
import { rfpMatchRequestSchema } from "@/lib/rfp-proposal/match-request";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const access = await requirePlannerPdfAccess();
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.status === 401 ? "Login required" : "PRO required" },
      { status: access.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = rfpMatchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const {
    brief,
    locale,
    limitPerGroup,
    excludeNetwork,
    excludedMediaIds,
    excludedByGroup,
    includedByGroup,
    strictRegionalPool,
    seed,
  } = parsed.data;

  try {
    const result = await matchRfpProposalBrief(brief, {
      limitPerGroup,
      excludeNetwork,
      excludedMediaIds,
      excludedByGroup,
      includedByGroup,
      strictRegionalPool,
      seed,
      isKo: locale === "ko",
    });
    return NextResponse.json({
      groups: result.groups,
      catalogCount: result.catalogCount,
    });
  } catch (e) {
    console.error("[studio/rfp/match] failed", e);
    return NextResponse.json({ error: "Match failed" }, { status: 500 });
  }
}
