import { NextRequest, NextResponse } from "next/server";
import { OohContractStatus } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { loadOoHQuoteForContract } from "@/lib/ooh-contract-context";
import { isAdminRequestAuthorized } from "@/lib/require-admin-request";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 30, windowMs: 60_000 });
const CUID_RE = /^c[a-z0-9]{24,}$/i;

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const isAdmin = isAdminRequestAuthorized(request);
  if (!isAdmin) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    if (!limiter.check(ip)) {
      return new NextResponse("Too many requests", { status: 429 });
    }
  }

  const { id } = await ctx.params;
  if (!id || !CUID_RE.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!isDatabaseConfigured()) {
    return new NextResponse("Unavailable", { status: 503 });
  }

  const db = getPrisma();
  const row = await loadOoHQuoteForContract(db, id);
  if (!row) return new NextResponse("Not found", { status: 404 });
  const c = row.oohContract;
  if (
    !c ||
    (c.status !== OohContractStatus.signed &&
      c.status !== OohContractStatus.confirmed)
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = c.contractPdfUrl?.trim();
  if (url?.startsWith("http://") || url?.startsWith("https://")) {
    return NextResponse.redirect(url, 302);
  }

  if (!c.signedPdfBase64) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buf = Buffer.from(c.signedPdfBase64, "base64");
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="thinkad-contract-signed.pdf"',
      "Cache-Control": "no-store, private",
    },
  });
}
