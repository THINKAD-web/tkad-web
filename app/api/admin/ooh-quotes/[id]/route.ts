import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { serializeOoHQuotePublic } from "@/lib/ooh-quote";
import { syncOoHQuoteBreakdown } from "@/lib/ooh-quote-sync-breakdown";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();
  const row = await db.ooHQuote.findUnique({ where: { id } });
  if (!row) return json({ error: "not_found" }, 404);

  return json({
    quote: {
      ...serializeOoHQuotePublic(row),
      clientEmail: row.clientEmail,
      clientPhone: row.clientPhone,
      adminNote: row.adminNote,
      quoteBreakdown: row.quoteBreakdown,
      contactInquiryId: row.contactInquiryId,
      quotePdfSentAt: row.quotePdfSentAt?.toISOString() ?? null,
      validUntil: row.validUntil?.toISOString() ?? null,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();
  const existing = await db.ooHQuote.findUnique({ where: { id } });
  if (!existing) return json({ error: "not_found" }, 404);

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const recalc = body.recalculate === true;
  const discountRate =
    typeof body.discountRate === "number" ? body.discountRate : undefined;

  if (discountRate != null) {
    await db.ooHQuote.update({
      where: { id },
      data: { discountRate },
    });
  }

  const row = await db.ooHQuote.findUnique({ where: { id } });
  if (!row) return json({ error: "not_found" }, 404);

  const updated = recalc ? await syncOoHQuoteBreakdown(db, row) : row;

  return json({
    ok: true,
    quote: {
      ...serializeOoHQuotePublic(updated),
      quoteBreakdown: updated.quoteBreakdown,
    },
  });
}
