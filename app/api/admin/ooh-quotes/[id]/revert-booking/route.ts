import { NextRequest } from "next/server";
import { OoHQuoteStatus, OohContractStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { releaseHoldsForQuote } from "@/lib/ooh-quote-booking-hold";

export const dynamic = "force-dynamic";

/**
 * booking_confirmed → sent 또는 booking_requested.
 * 서명·확정 이후에는 되돌릴 수 없다.
 */
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
  if (!row) return json({ error: "Not found" }, 404);
  if (row.status !== OoHQuoteStatus.booking_confirmed) {
    return json({ error: "Only booking_confirmed can be reverted" }, 409);
  }
  const contractStatus = row.oohContract?.status;
  if (
    contractStatus === OohContractStatus.signed ||
    contractStatus === OohContractStatus.confirmed
  ) {
    return json(
      { error: "서명 완료 이후에는 부킹을 되돌릴 수 없습니다.", code: "signed_locked" },
      409,
    );
  }

  const nextStatus = row.bookingRequestedAt
    ? OoHQuoteStatus.booking_requested
    : OoHQuoteStatus.sent;

  await db.$transaction(async (tx) => {
    if (row.oohContract && contractStatus !== OohContractStatus.cancelled) {
      await tx.oohContract.update({
        where: { id: row.oohContract.id },
        data: { status: OohContractStatus.cancelled },
      });
    }
    await tx.ooHQuote.update({
      where: { id },
      data: {
        status: nextStatus,
        bookingConfirmedAt: null,
      },
    });
  });
  await releaseHoldsForQuote(db, id, "admin_revert_booking");

  return json({ ok: true, status: nextStatus });
}
