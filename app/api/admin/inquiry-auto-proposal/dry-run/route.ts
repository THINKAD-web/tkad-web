import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  buildInquiryAutoProposal,
  runInquiryAutoProposalDryRun,
} from "@/lib/inquiry-auto-proposal/run-dry-run";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const text = typeof body.text === "string" ? body.text : "";
  if (text.trim().length < 4) {
    return json({ error: "text_required" }, 400);
  }

  try {
    const dry = await runInquiryAutoProposalDryRun(text);
    const parsed = {
      budgetWon: dry.parsed.budgetWon,
      budgetAssumed: dry.parsed.budgetAssumed,
      months: dry.parsed.months,
      wantsAirport: dry.parsed.wantsAirport,
      wantsRestStopLed: dry.parsed.wantsRestStopLed,
      namedNeedles: dry.parsed.namedNeedles,
    };
    const bodyMixIds = Object.keys(dry.mixUnits);
    if (bodyMixIds.length === 0) {
      return json({
        parsed,
        matched: dry.matched,
        designatedCount: dry.designated.length,
        eligibleCount: dry.eligible.length,
        excludedCount: dry.excluded.length,
        mixUnits: dry.mixUnits,
        bodyTotalWon: dry.bodyTotalWon,
        appendixMediaSpecs: dry.appendixMediaSpecs,
        brief: {
          budgetInputWon: dry.brief.budgetInputWon,
          budgetMode: dry.brief.budgetMode,
          flightStart: dry.brief.flightStart,
          flightEnd: dry.brief.flightEnd,
        },
        snapshot: null,
        thumbs: [],
      });
    }

    const built = await buildInquiryAutoProposal({ text });
    return json({
      parsed,
      matched: built.dryRun.matched,
      designatedCount: built.dryRun.designated.length,
      eligibleCount: built.dryRun.eligible.length,
      excludedCount: built.dryRun.excluded.length,
      mixUnits: built.dryRun.mixUnits,
      bodyTotalWon: built.dryRun.bodyTotalWon,
      appendixMediaSpecs: built.dryRun.appendixMediaSpecs,
      brief: {
        budgetInputWon: built.dryRun.brief.budgetInputWon,
        budgetMode: built.dryRun.brief.budgetMode,
        flightStart: built.dryRun.brief.flightStart,
        flightEnd: built.dryRun.brief.flightEnd,
      },
      snapshot: {
        totalCostWon: built.snapshot.metrics.totalCostWon,
        overBudgetWon: built.snapshot.metrics.overBudgetWon,
        budgetUsedRate: built.snapshot.metrics.budgetUsedRate,
        totalImpressions: built.snapshot.metrics.totalImpressions,
        mixCpmWon: built.snapshot.metrics.mixCpmWon,
        netReach: built.snapshot.metrics.netReach,
      },
      thumbs: built.payload.portfolio.map((row) => ({
        id: row.id,
        name: row.name,
        thumbUrl: row.thumbUrl ?? null,
      })),
    });
  } catch (e) {
    console.error("[inquiry-auto-proposal/dry-run]", e);
    return json({ error: "dry_run_failed" }, 500);
  }
}
