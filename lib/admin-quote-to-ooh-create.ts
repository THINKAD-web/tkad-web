import type { PrismaClient } from "@prisma/client";
import {
  buildOoHQuoteFromAdminQuote,
  type AdminQuoteToOoHBridgeResult,
} from "@/lib/admin-quote-to-ooh";

export async function findOoHQuoteByAdminQuoteId(
  db: Pick<PrismaClient, "ooHQuote">,
  adminQuoteId: string,
): Promise<{ id: string } | null> {
  return db.ooHQuote.findUnique({
    where: { sourceAdminQuoteId: adminQuoteId },
    select: { id: true },
  });
}

export async function createOoHQuoteFromAdminQuote(
  db: Pick<PrismaClient, "ooHQuote" | "quote">,
  adminQuoteId: string,
): Promise<{ oohQuoteId: string; created: boolean; bridge: AdminQuoteToOoHBridgeResult }> {
  const existing = await findOoHQuoteByAdminQuoteId(db, adminQuoteId);
  if (existing) {
    const quote = await db.quote.findUniqueOrThrow({
      where: { id: adminQuoteId },
      include: { items: { orderBy: { id: "asc" } } },
    });
    const bridge = buildOoHQuoteFromAdminQuote(quote);
    return { oohQuoteId: existing.id, created: false, bridge };
  }

  const quote = await db.quote.findUnique({
    where: { id: adminQuoteId },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!quote) throw new Error("NOT_FOUND");

  const bridge = buildOoHQuoteFromAdminQuote(quote);
  const ooh = await db.ooHQuote.create({ data: bridge.data });
  return { oohQuoteId: ooh.id, created: true, bridge };
}
