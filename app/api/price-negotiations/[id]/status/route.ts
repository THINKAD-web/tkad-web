import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 30, windowMs: 60_000 });

const Query = z.object({
  email: z.string().email().max(254),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!limiter.check(`neg-status:${ip}`)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const { id } = await params;
  const parsed = Query.safeParse({
    email: request.nextUrl.searchParams.get("email") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 400 });
  }

  const db = getPrisma();
  const row = await db.priceNegotiationRequest.findUnique({
    where: { id },
    select: {
      status: true,
      contactEmail: true,
      expiresAt: true,
      respondedAt: true,
      ownerNote: true,
      proposedPriceWon: true,
      media: { select: { name: true } },
      oohQuote: { select: { id: true, status: true } },
    },
  });

  if (!row) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (
    row.contactEmail.trim().toLowerCase() !==
    parsed.data.email.trim().toLowerCase()
  ) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const locale = "ko";
  const quoteId = row.oohQuote?.id ?? null;
  const contractUrl = quoteId ? `/${locale}/quote/${quoteId}/contract` : null;
  const previewUrl = quoteId ? `/${locale}/quote/${quoteId}/preview` : null;

  return NextResponse.json({
    ok: true,
    status: row.status,
    mediaName: row.media.name,
    proposedPriceWon: row.proposedPriceWon,
    expiresAt: row.expiresAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
    ownerNote: row.ownerNote,
    quoteId,
    quoteStatus: row.oohQuote?.status ?? null,
    contractUrl,
    previewUrl,
  });
}
