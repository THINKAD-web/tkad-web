import { NextRequest, NextResponse } from "next/server";
import { attachmentContentDisposition } from "@/lib/content-disposition";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ooHQuotePdfToBase64 } from "@/lib/server-ooh-quote-pdf";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 20, windowMs: 60_000 });
const CUID_RE = /^c[a-z0-9]{24,}$/i;

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (!limiter.check(ip)) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const { id } = await ctx.params;
  if (!id || !CUID_RE.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!isDatabaseConfigured()) {
    return new NextResponse("Unavailable", { status: 503 });
  }

  try {
    const db = getPrisma();
    const row = await db.ooHQuote.findUnique({ where: { id } });
    if (!row) return new NextResponse("Not found", { status: 404 });

    const b64 = await ooHQuotePdfToBase64(db, {
      clientCompany: row.clientCompany,
      clientName: row.clientName,
      period: row.period,
      periodKey: row.periodKey,
      budgetMin: row.budgetMin,
      budgetMax: row.budgetMax,
      pdfTemplate: row.pdfTemplate,
      locale: row.locale,
      mediaIds: row.mediaIds,
      totalAmount: row.totalAmount,
      networkSelections: row.networkSelections ?? undefined,
    });
    const buf = Buffer.from(b64, "base64");
    const locale = row.locale?.toLowerCase().startsWith("ko") ? "ko" : "en";
    const displayName =
      locale === "ko" ? "싱커드-견적서.pdf" : "THINKAD-quote.pdf";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": attachmentContentDisposition(displayName),
        "Cache-Control": "no-store, private",
      },
    });
  } catch (e) {
    console.error("[quote pdf GET]", e);
    return new NextResponse("Failed", { status: 500 });
  }
}
