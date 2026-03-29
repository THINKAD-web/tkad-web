import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  generateAdminQuoteNumber,
  serializeQuote,
} from "@/lib/admin-sales-quote";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await ctx.params;
  const db = getPrisma();
  const src = await db.quote.findUnique({
    where: { id },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!src) return json({ error: "Not found" }, 404);

  const quoteNumber = generateAdminQuoteNumber();

  try {
    const created = await db.quote.create({
      data: {
        quoteNumber,
        status: "draft",
        clientName: src.clientName,
        clientEmail: src.clientEmail,
        clientPhone: src.clientPhone,
        validUntil: src.validUntil,
        subtotal: src.subtotal,
        discount: src.discount,
        tax: src.tax,
        total: src.total,
        isKo: src.isKo,
        sentAt: null,
        items: {
          create: src.items.map((it) => ({
            mediaId: it.mediaId,
            mediaName: it.mediaName,
            spec: it.spec,
            period: it.period,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            amount: it.amount,
          })),
        },
      },
      include: { items: { orderBy: { id: "asc" } } },
    });
    return json({ quote: serializeQuote(created) }, 201);
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e ? (e as { code?: string }).code : "";
    if (code === "P2002") {
      return json({ error: "quoteNumber collision, retry" }, 409);
    }
    console.error("[admin-quotes copy]", e);
    return json({ error: "Copy failed" }, 500);
  }
}
