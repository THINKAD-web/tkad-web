import { NextRequest } from "next/server";
import { OoHQuoteStatus, OohContractStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { canAdminPaymentConfirm } from "@/lib/ooh-quote";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const amountRaw = body.paymentAmount ?? body.amount;
  const amount =
    amountRaw != null ? Math.round(Number(amountRaw)) : Number.NaN;
  if (!Number.isFinite(amount) || amount < 0) {
    return json({ error: "paymentAmount required (KRW 만원 단위)" }, 400);
  }

  const { id } = await ctx.params;
  const db = getPrisma();
  const row = await db.ooHQuote.findUnique({ where: { id } });
  if (!row) return json({ error: "Not found" }, 404);
  if (!canAdminPaymentConfirm(row.status)) {
    return json({ error: "Invalid status for this action" }, 409);
  }

  const updated = await db.ooHQuote.update({
    where: { id },
    data: {
      status: OoHQuoteStatus.payment_confirmed,
      paymentAmount: amount,
      paymentConfirmedAt: new Date(),
    },
  });

  await db.oohContract.updateMany({
    where: {
      ooHQuoteId: id,
      status: OohContractStatus.signed,
    },
    data: { status: OohContractStatus.confirmed },
  });

  return json({ ok: true, status: updated.status });
}
