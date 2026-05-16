import { NextRequest } from "next/server";
import { z } from "zod";
import { OoHQuoteStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { canAdminResolveRevision } from "@/lib/ooh-quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  /** 어드민 메모 — 선택. 기존 adminNote 끝에 append */
  adminNote: z.string().max(500).optional(),
});

/**
 * PATCH /api/admin/ooh-quotes/[id]/revision-resolve
 *
 * 어드민이 견적을 수정해서 다시 고객 검토 단계(sent)로 되돌립니다.
 * revision_requested → sent + revisionResolvedAt 기록.
 * revisionNote 는 감사용으로 유지(덮어쓰지 않음).
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await ctx.params;
  if (!id) return json({ error: "Not found" }, 404);

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = BodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return json({ error: "Invalid body" }, 400);
  }

  const db = getPrisma();
  const row = await db.ooHQuote.findUnique({ where: { id } });
  if (!row) return json({ error: "Not found" }, 404);
  if (!canAdminResolveRevision(row.status)) {
    return json(
      {
        error: "Quote is not in revision_requested state",
        status: row.status,
      },
      409,
    );
  }

  const noteToAppend = parsed.data.adminNote?.trim();
  const stamp = new Date().toISOString().slice(0, 10);
  const nextAdminNote = noteToAppend
    ? `${row.adminNote ? `${row.adminNote}\n\n` : ""}[${stamp} 수정 반영] ${noteToAppend}`
    : row.adminNote;

  await db.ooHQuote.update({
    where: { id },
    data: {
      status: OoHQuoteStatus.sent,
      revisionResolvedAt: new Date(),
      ...(nextAdminNote !== row.adminNote && { adminNote: nextAdminNote }),
    },
  });

  return json({ success: true });
}
