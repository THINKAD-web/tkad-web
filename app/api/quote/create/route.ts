import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export const runtime = "nodejs";

const Body = z.object({
  mediaIds: z.array(z.string().min(1)).min(1).max(50),
  clientName: z.string().min(1).max(40),
  clientEmail: z.string().email().max(254),
  clientPhone: z.string().max(20).optional(),
  clientCompany: z.string().max(80).optional(),
  period: z.string().min(1).max(40),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budgetMin: z.number().int().nonnegative().optional(),
  budgetMax: z.number().int().nonnegative().optional(),
  locale: z.enum(["ko", "en"]).default("ko"),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_JSON" } },
      { status: 400 },
    );
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_INPUT", issues: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const {
    mediaIds,
    clientName,
    clientEmail,
    clientPhone,
    clientCompany,
    period,
    startDate,
    endDate,
    budgetMin,
    budgetMax,
    locale,
  } = parsed.data;

  const catalog = await fetchPublicMediaCatalog();
  const picked = catalog.filter((m) => mediaIds.includes(m.id));
  if (picked.length === 0) {
    return NextResponse.json(
      { ok: false, error: { code: "NO_VALID_MEDIA" } },
      { status: 400 },
    );
  }

  const totalAmount = picked.reduce((sum, m) => sum + (m.price ?? 0), 0);

  const quote = await prisma.oOHQuote.create({
    data: {
      status: "draft",
      clientName,
      clientEmail,
      clientPhone,
      clientCompany,
      mediaIds: picked.map((m) => m.id),
      totalAmount,
      period,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budgetMin: budgetMin ?? null,
      budgetMax: budgetMax ?? null,
      locale,
      pdfTemplate: "default",
    },
    select: { id: true, createdAt: true, totalAmount: true },
  });

  return NextResponse.json(
    { ok: true, data: { id: quote.id, totalAmount: quote.totalAmount } },
    { status: 201 },
  );
}
