import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { runInquiryAutoProposalDryRun } from "@/lib/inquiry-auto-proposal/run-dry-run";

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
    const result = await runInquiryAutoProposalDryRun(text);
    return json({
      parsed: {
        budgetWon: result.parsed.budgetWon,
        budgetAssumed: result.parsed.budgetAssumed,
        months: result.parsed.months,
        wantsAirport: result.parsed.wantsAirport,
        wantsRestStopLed: result.parsed.wantsRestStopLed,
        namedNeedles: result.parsed.namedNeedles,
      },
      matched: result.matched,
      eligibleCount: result.eligible.length,
      excludedCount: result.excluded.length,
      options: result.options,
    });
  } catch (e) {
    console.error("[inquiry-auto-proposal/dry-run]", e);
    return json({ error: "dry_run_failed" }, 500);
  }
}
