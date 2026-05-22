import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { getTeamMembershipForUser } from "@/lib/team-context";
import { canEditTeamPlanner } from "@/lib/team-permissions";
import { z } from "zod";

export const dynamic = "force-dynamic";

const EXPIRATION_DAYS_SHARE = 30;
const EXPIRATION_HOURS_DRAFT = 24;

const SavePlanBodySchema = z.object({
  userEmail: z.string().email().optional().nullable(),
  planJson: z.record(z.string(), z.unknown()),
  /** `share`(기본): 30일 · `draft`: 24시간 임시 링크 */
  saveMode: z.enum(["share", "draft"]).optional().default("share"),
  shareWithTeam: z.boolean().optional().default(false),
  planId: z.string().min(1).max(64).optional(),
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
    const sessionUser = await getCurrentUser();
    const teamCtx = sessionUser
      ? await getTeamMembershipForUser(sessionUser.id)
      : null;

    if (sessionUser && teamCtx && !canEditTeamPlanner(teamCtx.role)) {
      return NextResponse.json(
        { error: "뷰어 권한은 플래너를 저장할 수 없습니다." },
        { status: 403 },
      );
    }

    const shareWithTeam =
      Boolean(parsed.data.shareWithTeam) &&
      Boolean(teamCtx) &&
      parsed.data.saveMode === "share";

    if (parsed.data.planId && sessionUser && teamCtx) {
      const existing = await prisma.savedPlannerPlan.findUnique({
        where: { id: parsed.data.planId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }
      const canUpdate =
        existing.userEmail === sessionUser.email ||
        (existing.isTeamShared &&
          existing.teamId === teamCtx.team.id &&
          canEditTeamPlanner(teamCtx.role));
      if (!canUpdate) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const updated = await prisma.savedPlannerPlan.update({
        where: { id: parsed.data.planId },
        data: {
          expiresAt,
          planJson: parsed.data.planJson as never,
          userEmail: parsed.data.userEmail ?? sessionUser.email ?? null,
          teamId: shareWithTeam ? teamCtx.team.id : existing.teamId,
          isTeamShared: shareWithTeam ? true : existing.isTeamShared,
        },
        select: { id: true, expiresAt: true },
      });
      return NextResponse.json({
        id: updated.id,
        expiresAt: updated.expiresAt.toISOString(),
      });
    }

    const created = await prisma.savedPlannerPlan.create({
      data: {
        expiresAt,
        userEmail:
          parsed.data.userEmail ?? sessionUser?.email ?? null,
        planJson: parsed.data.planJson as never,
        teamId: shareWithTeam ? teamCtx!.team.id : null,
        isTeamShared: shareWithTeam,
      },
      select: { id: true, expiresAt: true },
    });
    if (sessionUser && parsed.data.saveMode === "share") {
      const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      void import("@/lib/points").then(({ awardPoints }) =>
        awardPoints(sessionUser.id, "PLANNER_COMPLETE", kst).catch(() => {}),
      );
    }
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
