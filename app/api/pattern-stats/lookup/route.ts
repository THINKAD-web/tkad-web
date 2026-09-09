import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isPatternStatsNotesEnabled,
  lookupPatternStatsCount,
  resolvePatternStatsOperationalNote,
} from "@/lib/recommend/pattern-stats-lookup";

export const dynamic = "force-dynamic";

const Body = z.object({
  combo: z.object({
    source: z.enum(["recommend", "planner"]),
    industry: z.string().max(32),
    target: z.string().max(32),
    budgetBucket: z.string().max(32),
    goal: z.string().max(32),
  }),
  isKo: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  if (!isPatternStatsNotesEnabled()) {
    return NextResponse.json({ enabled: false, note: null, count: null });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const isKo = parsed.data.isKo ?? true;
  const count = await lookupPatternStatsCount(parsed.data.combo);
  const note = await resolvePatternStatsOperationalNote(parsed.data.combo, isKo);

  return NextResponse.json({
    enabled: true,
    note,
    count,
  });
}
