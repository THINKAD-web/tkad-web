import { NextRequest } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { canAdminBookingConfirm } from "@/lib/ooh-quote";
import { ensureOohContractExists } from "@/lib/ooh-contract-ensure";
import { sendContractInviteEmail } from "@/lib/contract-invite-email";
import {
  appendContractInviteSendLog,
  type ContractInviteSendEntry,
} from "@/lib/contract-invite-log";
import type { Prisma } from "@prisma/client";
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

    const contractRow = await ensureOohContractExists(db, id, updated.status);

    void notifySlackBookingConfirm({
      quoteId: id,
      clientName: row.clientName,
      totalAmountManwon: row.totalAmount,
      period: row.period,
      mediaCount: row.mediaIds.length,
      source: "admin",
    }).catch((e) => console.error("[booking-confirm] slack", e));

    const to = row.clientEmail?.trim();
    if (to && contractRow) {
      const locale = row.locale === "en" ? "en" : "ko";
      await sendContractInviteEmail({
        to,
        clientName: row.clientName,
        locale,
        quoteId: id,
        variant: "booking_confirmed",
      });

      const entry: ContractInviteSendEntry = {
        sentAt: new Date().toISOString(),
        to,
        kind: "initial",
      };
      const inviteLog = appendContractInviteSendLog(
        contractRow.inviteSendLog,
        entry,
      );
      await db.oohContract.update({
        where: { id: contractRow.id },
        data: { inviteSendLog: inviteLog as Prisma.InputJsonValue },
      });
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
