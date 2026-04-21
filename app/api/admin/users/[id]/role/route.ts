// app/api/admin/users/[id]/role/route.ts
// 설명: Admin 전용 - 사용자 role 변경
// 주요 기능: PATCH { role: "advertiser"|"agency"|"owner"|"admin" }

import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-session";

export const runtime = "nodejs";

const Body = z.object({
  role: z.enum(["advertiser", "agency", "owner", "admin"]),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const c = await cookies();
  const token = c.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: { code: "DB_UNAVAILABLE" } }, { status: 503 });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: { code: "INVALID_JSON" } }, { status: 400 }); }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: { code: "INVALID_INPUT" } }, { status: 400 });
  }

  const db = getPrisma();
  try {
    const updated = await db.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: { id: true, role: true, email: true, name: true },
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    console.error("[admin/users role PATCH]", e);
    return NextResponse.json({ ok: false, error: { code: "UPDATE_FAILED" } }, { status: 500 });
  }
}
