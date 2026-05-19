import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  isAdminQuoteStatus,
  parseQuoteItemsInput,
  serializeQuote,
  parseValidUntilDate,
} from "@/lib/admin-sales-quote";
import { notifyUserByEmail } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await ctx.params;
  const db = getPrisma();
  const q = await db.quote.findUnique({
    where: { id },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!q) return json({ error: "Not found" }, 404);
  return json({ quote: serializeQuote(q) });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const db = getPrisma();
  const existing = await db.quote.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  const data: Prisma.QuoteUpdateInput = {};

  if (typeof body.status === "string") {
    const s = body.status.trim();
    if (isAdminQuoteStatus(s)) data.status = s;
  }
  if (typeof body.clientName === "string")
    data.clientName = body.clientName.trim();
  if (body.clientEmail === null) data.clientEmail = null;
  if (typeof body.clientEmail === "string")
    data.clientEmail = body.clientEmail.trim() || null;
  if (body.clientPhone === null) data.clientPhone = null;
  if (typeof body.clientPhone === "string")
    data.clientPhone = body.clientPhone.trim() || null;
  if (typeof body.validUntil === "string") {
    const d = parseValidUntilDate(body.validUntil);
    if (d) data.validUntil = d;
  }
  if (body.isKo !== undefined) data.isKo = body.isKo !== false;
  for (const k of ["subtotal", "discount", "tax", "total"] as const) {
    if (body[k] !== undefined) {
      const n = Math.round(Number(body[k]));
      if (!Number.isFinite(n)) continue;
      if (k === "discount" || k === "tax") data[k] = Math.max(0, n);
      else data[k] = n;
    }
  }

  const itemsReplace = parseQuoteItemsInput(body.items);

  try {
    const updated = await db.$transaction(async (tx) => {
      if (itemsReplace) {
        await tx.quoteItem.deleteMany({ where: { quoteId: id } });
        await tx.quoteItem.createMany({
          data: itemsReplace.map((it) => ({
            quoteId: id,
            mediaId: it.mediaId,
            mediaName: it.mediaName,
            spec: it.spec,
            period: it.period,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            amount: it.amount,
          })),
        });
      }
      if (Object.keys(data).length === 0 && !itemsReplace) {
        return tx.quote.findUniqueOrThrow({
          where: { id },
          include: { items: { orderBy: { id: "asc" } } },
        });
      }
      if (Object.keys(data).length > 0) {
        return tx.quote.update({
          where: { id },
          data,
          include: { items: { orderBy: { id: "asc" } } },
        });
      }
      return tx.quote.findUniqueOrThrow({
        where: { id },
        include: { items: { orderBy: { id: "asc" } } },
      });
    });

    const newStatus =
      typeof data.status === "string" ? data.status : existing.status;
    if (
      newStatus === "contracted" &&
      existing.status !== "contracted" &&
      updated.clientEmail
    ) {
      void notifyUserByEmail(updated.clientEmail, {
        type: "QUOTE_ACCEPTED",
        title: "견적이 확정되었습니다",
        body: updated.isKo
          ? `견적번호 ${updated.quoteNumber}`
          : `Quote ${updated.quoteNumber}`,
        link: `/quote/${id}`,
        dedupeKey: `quote_contracted:${id}`,
      });
    }

    return json({ quote: serializeQuote(updated) });
  } catch (e) {
    console.error("[admin-quotes PATCH]", e);
    return json({ error: "Update failed" }, 500);
  }
}
