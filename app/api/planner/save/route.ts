import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const EXPIRATION_DAYS = 30;

const SavePlanBodySchema = z.object({
  userEmail: z.string().email().optional().nullable(),
  planJson: z.record(z.string(), z.unknown()),
});

/**
 * 플래너 상태 스냅샷 저장.
 * - 30일 후 자동 만료 (GET 시 expiresAt 체크, cron 으로 주기 purge 가능)
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

  const expiresAt = new Date(
    Date.now() + EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
  );

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
