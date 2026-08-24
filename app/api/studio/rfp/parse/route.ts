import { NextRequest, NextResponse } from "next/server";
import { requirePlannerPdfAccess, plannerPdfAccessDeniedMessage } from "@/lib/require-planner-pdf-access";
import { parseRfpProposalBrief } from "@/lib/rfp-proposal/parse-rfp-brief";
import { rfpParseRequestSchema } from "@/lib/rfp-proposal/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const access = await requirePlannerPdfAccess();
  if (!access.allowed) {
    return NextResponse.json(
      { error: plannerPdfAccessDeniedMessage(access.status) },
      { status: access.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = rfpParseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await parseRfpProposalBrief(parsed.data.text, {
      locale: parsed.data.locale,
    });
    return NextResponse.json({
      brief: result.brief,
      source: result.source,
    });
  } catch (e) {
    console.error("[studio/rfp/parse] failed", e);
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
