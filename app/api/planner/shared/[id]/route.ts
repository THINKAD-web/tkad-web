import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * 공유된 플랜 조회 (읽기 전용). viewCount 증가.
 * 만료된 플랜은 410 반환.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const plan = await prisma.savedPlannerPlan.findUnique({
    where: { id },
    select: {
      id: true,
      expiresAt: true,
      planJson: true,
      viewCount: true,
      createdAt: true,
    },
  });
  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (plan.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  // viewCount 증가는 best-effort. 실패해도 응답에 영향 없음.
  prisma.savedPlannerPlan
    .update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});

  return NextResponse.json({
    id: plan.id,
    expiresAt: plan.expiresAt.toISOString(),
    createdAt: plan.createdAt.toISOString(),
    planJson: plan.planJson,
  });
}
