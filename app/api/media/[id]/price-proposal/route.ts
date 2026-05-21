import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { createPriceNegotiation } from "@/lib/price-negotiation";
import { getCurrentUser } from "@/lib/user-session";
import { isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 6, windowMs: 60_000 });

const Body = z.object({
  contactEmail: z.string().email().max(254),
  contactPhone: z.string().min(8).max(20),
  companyName: z.string().max(120).optional(),
  proposedPriceWon: z.number().int().min(10_000).max(500_000_000),
  message: z.string().max(2000).optional(),
  locale: z.string().max(8).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!limiter.check(`price-proposal:${ip}`)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const { id: mediaId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const result = await createPriceNegotiation({
    mediaId,
    userId: user?.id,
    contactEmail: parsed.data.contactEmail.trim(),
    contactPhone: parsed.data.contactPhone.trim(),
    companyName: parsed.data.companyName,
    proposedPriceWon: parsed.data.proposedPriceWon,
    message: parsed.data.message,
  });

  if (!result) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    negotiationId: result.id,
    statusUrl: `/api/price-negotiations/${result.id}/status`,
  });
}
