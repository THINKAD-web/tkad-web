import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const EXPIRATION_DAYS_SHARE = 30;
const EXPIRATION_HOURS_DRAFT = 24;

const SavePlanBodySchema = z.object({
  userEmail: z.string().email().optional().nullable(),
  planJson: z.record(z.string(), z.unknown()),
  /** `share`(기본): 30일 · `draft`: 24시간 임시 링크 */
  saveMode: z.enum(["share", "draft"]).optional().default("share"),
});

/**
 * 플래너 상태 스냅샷 저장.
 * - share: 30일 만료 (GET 시 expiresAt 체크, cron 으로 주기 purge 가능)
 * - draft: 24시간 만료
 * - 익명 가능 (userEmail 없이도 저장)
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = SavePlanBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const ms =
    parsed.data.saveMode === "draft"
      ? EXPIRATION_HOURS_DRAFT * 60 * 60 * 1000
      : EXPIRATION_DAYS_SHARE * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ms);

  try {
    const created = await prisma.savedPlannerPlan.create({
      data: {
        expiresAt,
        userEmail: parsed.data.userEmail ?? null,
        planJson: parsed.data.planJson as never,
      },
      select: { id: true, expiresAt: true },
    });
    return NextResponse.json({
      id: created.id,
      expiresAt: created.expiresAt.toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to save plan", detail: msg },
      { status: 500 },
    );
  }
}
