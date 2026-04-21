// app/api/admin/users/route.ts
// 설명: Admin 전용 - 사용자 목록 조회
// 주요 기능: GET ?q=&role= → User 50건 (email/name 검색, role 필터)

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const c = await cookies();
  const token = c.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { code: "DB_UNAVAILABLE" } }, { status: 503 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const role = url.searchParams.get("role")?.trim() ?? "";

  const where: Record<string, unknown> = { deletedAt: null };
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
    ];
  }
  if (role && ["advertiser", "agency", "owner", "admin"].includes(role)) {
    where.role = role;
  }

  const db = getPrisma();
  const rows = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      phone: true,
      role: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, data: { items: rows, total: rows.length } });
}
