import { NextRequest } from "next/server";
import { OohContractStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { releaseHoldsForQuote } from "@/lib/ooh-quote-booking-hold";

export const dynamic = "force-dynamic";

const CANCELLABLE = new Set<OohContractStatus>([
  OohContractStatus.pending,
  OohContractStatus.attachment_sent,
]);

/** Soft cancel — DB row 유지, 서명 URL 무효(pending 아님), 홀드 해제 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await ctx.params;
  const db = getPrisma();
  const row = await db.ooHQuote.findUnique({
    where: { id },
    include: { oohContract: true },
  });
  if (!row?.oohContract) return json({ error: "Not found" }, 404);

  const status = row.oohContract.status;
  if (status === OohContractStatus.signed || status === OohContractStatus.confirmed) {
    return json(
      { error: "서명·확정된 계약은 취소할 수 없습니다.", code: "signed_locked" },
      409,
    );
  }
  if (!CANCELLABLE.has(status)) {
    return json({ error: "Already closed" }, 409);
  }

  await db.oohContract.update({
    where: { id: row.oohContract.id },
    data: { status: OohContractStatus.cancelled },
  });
  await releaseHoldsForQuote(db, id, "admin_cancel_contract");

  return json({ ok: true, contractStatus: OohContractStatus.cancelled });
}
