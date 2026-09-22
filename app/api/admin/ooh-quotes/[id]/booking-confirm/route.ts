import { NextRequest } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { canAdminBookingConfirm } from "@/lib/ooh-quote";
import { ensureOohContractExists } from "@/lib/ooh-contract-ensure";
import { isEmailConfigured, sendEmail } from "@/lib/email/client";
import { sendContractInviteEmail } from "@/lib/contract-invite-email";
import { notifySlackBookingConfirm } from "@/lib/quote-slack-notify";
import {
  createHoldsForQuote,
  isBookingHoldConflictError,
  isQuoteHoldDatesRequiredError,
} from "@/lib/ooh-quote-booking-hold";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let force = false;
  try {
    const body = (await request.json()) as { force?: unknown };
    force = body?.force === true;
  } catch {
    force = false;
  }

  const { id } = await ctx.params;
  const db = getPrisma();
  const row = await db.ooHQuote.findUnique({ where: { id } });
  if (!row) return json({ error: "Not found" }, 404);
  if (!canAdminBookingConfirm(row.status)) {
    return json({ error: "Invalid status for this action" }, 409);
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      await createHoldsForQuote(tx, row, { force });
      return tx.ooHQuote.update({
        where: { id },
        data: {
          status: OoHQuoteStatus.booking_confirmed,
          bookingConfirmedAt: new Date(),
        },
      });
    });

    await ensureOohContractExists(db, id, updated.status);

    void notifySlackBookingConfirm({
      quoteId: id,
      clientName: row.clientName,
      totalAmountManwon: row.totalAmount,
      period: row.period,
      mediaCount: row.mediaIds.length,
      source: "admin",
    }).catch((e) => console.error("[booking-confirm] slack", e));

    const to = row.clientEmail?.trim();
    if (to && isEmailConfigured()) {
      try {
        await sendContractInviteEmail(db, id, async (mail) => {
          await sendEmail({ to, ...mail });
        });
      } catch (e) {
        console.error("[booking-confirm] contract invite email", e);
      }
    }

    return json({ ok: true, status: updated.status, forced: force });
  } catch (e) {
    if (isBookingHoldConflictError(e)) {
      return json(
        {
          error: e.message,
          code: e.code,
          conflicts: e.conflicts,
        },
        409,
      );
    }
    if (isQuoteHoldDatesRequiredError(e)) {
      return json({ error: e.message, code: e.code }, 400);
    }
    throw e;
  }
}
