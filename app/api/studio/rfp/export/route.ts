import { NextRequest, NextResponse } from "next/server";
import { requirePlannerPdfAccess } from "@/lib/require-planner-pdf-access";
import { buildRfpProposalExportPayload } from "@/lib/rfp-proposal-export/build-payload";
import { buildRfpProposalPdf } from "@/lib/rfp-proposal-export/build-pdf";
import { rfpExportRequestSchema } from "@/lib/rfp-proposal-export/export-request";
import {
  isRfpProposalExportPayload,
  rfpProposalFileBase,
  type RfpProposalExportPayload,
} from "@/lib/rfp-proposal-export/types";
import type { RfpGroupMatchResult } from "@/lib/rfp-proposal/match-rfp-brief";
import type { MatchingInput } from "@/lib/matching-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const utf8 = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

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

  const parsed = rfpExportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    let payload: RfpProposalExportPayload;

    if ("payload" in parsed.data) {
      if (!isRfpProposalExportPayload(parsed.data.payload)) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }
      payload = parsed.data.payload;
    } else {
      const matchGroups: RfpGroupMatchResult[] = parsed.data.matchGroups.map(
        (g) => ({
          groupId: g.groupId,
          groupLabel: g.groupLabel,
          input: (g.input ?? {
            monthlyBudgetWon: 0,
            regions: [],
            industry: "other",
            targets: ["mass"],
            durationMonths: 1,
            goal: "brand",
          }) as MatchingInput,
          mediaItems: g.mediaItems.map((m) => ({
            mediaId: m.mediaId,
            name: m.name,
            nameEn: m.nameEn,
            location: m.location,
            locationEn: m.locationEn,
            priceWon: m.priceWon,
            score: m.score,
            role: m.role,
            oneLine: m.oneLine,
            reasons: m.reasons,
            pinned: m.pinned,
          })),
        }),
      );
      payload = await buildRfpProposalExportPayload({
        brief: parsed.data.brief,
        matchGroups,
        excludedByGroup: parsed.data.excludedByGroup,
        locale: parsed.data.locale,
        recommendComment: parsed.data.recommendComment,
      });
    }

    const bytes = await buildRfpProposalPdf(payload);
    const filename = `${rfpProposalFileBase(payload)}.pdf`;

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(filename),
        "Cache-Control": "no-store, private",
      },
    });
  } catch (e) {
    console.error("[studio/rfp/export] failed", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
