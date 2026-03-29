import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  isAdminQuoteStatus,
  parseQuoteItemsInput,
  generateAdminQuoteNumber,
  serializeQuote,
  parseValidUntilDate,
} from "@/lib/admin-sales-quote";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const from = searchParams.get("from")?.trim() ?? "";
  const to = searchParams.get("to")?.trim() ?? "";
  const take = Math.min(Number(searchParams.get("take") ?? 80) || 80, 200);

  const db = getPrisma();
  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { clientName: { contains: q, mode: "insensitive" } },
      { quoteNumber: { contains: q, mode: "insensitive" } },
      { clientEmail: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status && status !== "all" && isAdminQuoteStatus(status)) {
    where.status = status;
  }
  if (from || to) {
    const ca: { gte?: Date; lte?: Date } = {};
    if (from) {
      const d = new Date(`${from}T00:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) ca.gte = d;
    }
    if (to) {
      const d = new Date(`${to}T23:59:59.999Z`);
      if (!Number.isNaN(d.getTime())) ca.lte = d;
    }
    if (Object.keys(ca).length > 0) where.createdAt = ca;
  }

  const quotes = await db.quote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: { items: { orderBy: { id: "asc" } } },
  });

  return json({ quotes: quotes.map(serializeQuote) });
}

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const items = parseQuoteItemsInput(body.items);
  if (!items) return json({ error: "items required" }, 400);

  let quoteNumber = String(body.quoteNumber ?? "").trim();
  if (!quoteNumber) quoteNumber = generateAdminQuoteNumber();

  const clientName = String(body.clientName ?? "").trim();
  if (!clientName) return json({ error: "clientName required" }, 400);

  const validUntilRaw = String(body.validUntil ?? "").trim();
  const validUntil = parseValidUntilDate(validUntilRaw);
  if (!validUntil) return json({ error: "validUntil required (YYYY-MM-DD)" }, 400);

  const subtotal = Math.round(Number(body.subtotal));
  const discount = Math.max(0, Math.round(Number(body.discount)));
  const tax = Math.max(0, Math.round(Number(body.tax)));
  const total = Math.round(Number(body.total));
  if (
    !Number.isFinite(subtotal) ||
    !Number.isFinite(total) ||
    !Number.isFinite(tax)
  ) {
    return json({ error: "Invalid amounts" }, 400);
  }

  const clientEmail =
    typeof body.clientEmail === "string" && body.clientEmail.trim()
      ? body.clientEmail.trim()
      : null;
  const clientPhone =
    typeof body.clientPhone === "string" && body.clientPhone.trim()
      ? body.clientPhone.trim()
      : null;

  let status = String(body.status ?? "draft").trim();
  if (!isAdminQuoteStatus(status)) status = "draft";
  const isKo = body.isKo !== false;

  const db = getPrisma();
  try {
    const created = await db.quote.create({
      data: {
        quoteNumber,
        status,
        clientName,
        clientEmail,
        clientPhone,
        subtotal,
        discount,
        tax,
        total,
        validUntil,
        isKo,
        items: {
          create: items.map((it) => ({
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
      return json({ error: "quoteNumber already exists" }, 409);
    }
    console.error("[admin-quotes POST]", e);
    return json({ error: "Failed to save" }, 500);
  }
}
