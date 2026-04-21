// app/api/admin/verification/route.ts
// 설명: Admin 전용 - 매체 검증 목록 조회 + 승인/거절
// 주요 기능:
//   GET  ?status=pending|verified|rejected → 필터된 매체 리스트
//   POST { mediaId, action: "approve"|"reject", note } → visibilityScore 업데이트

import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const c = await cookies();
  const token = c.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { code: "DB_UNAVAILABLE" } }, { status: 503 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";
  const db = getPrisma();

  let where: Record<string, unknown> = { isActive: true };
  if (status === "pending") where = { ...where, visibilityScore: { lte: 0 } };
  else if (status === "verified") where = { ...where, visibilityScore: { gte: 3 } };
  else if (status === "review") where = { ...where, visibilityScore: { gt: 0, lt: 3 } };

  const rows = await db.media.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      location: true,
      region: true,
      type: true,
      price: true,
      image: true,
      visibilityScore: true,
      updatedAt: true,
    },
  });

  const total = await db.media.count({ where });
  return NextResponse.json({ ok: true, data: { items: rows, total } });
}

const PostBody = z.object({
  mediaId: z.string().min(1),
  action: z.enum(["approve", "reject", "review"]),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { code: "DB_UNAVAILABLE" } }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "INVALID_JSON" } }, { status: 400 });
  }
  const parsed = PostBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT" } }, { status: 400 });
  }

  const { mediaId, action, note } = parsed.data;
  const db = getPrisma();

  const nextScore = action === "approve" ? 4 : action === "reject" ? -1 : 2;

  try {
    await db.media.update({
      where: { id: mediaId },
      data: {
        visibilityScore: nextScore,
        ...(note ? { effectMemo: note } : {}),
        updatedAt: new Date(),
      },
    });
  } catch (e) {
    console.error("[admin/verification POST]", e);
    return NextResponse.json({ ok: false, error: { code: "UPDATE_FAILED" } }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { mediaId, visibilityScore: nextScore } });
}
