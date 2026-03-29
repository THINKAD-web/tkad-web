import { NextRequest, NextResponse } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ensureOohContractExists } from "@/lib/ooh-contract-ensure";
import {
  loadOoHQuoteForContract,
  ooHQuoteToContractPdfVars,
  resolveMediaNamesForQuote,
} from "@/lib/ooh-contract-context";
import { buildOohContractPdf } from "@/lib/ooh-contract-pdf";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 30, windowMs: 60_000 });
const CUID_RE = /^c[a-z0-9]{24,}$/i;

const VIEW_STATUSES: OoHQuoteStatus[] = [
  OoHQuoteStatus.booking_confirmed,
  OoHQuoteStatus.invoice_sent,
  OoHQuoteStatus.payment_pending,
  OoHQuoteStatus.payment_confirmed,
  OoHQuoteStatus.contract_confirmed,
  OoHQuoteStatus.in_progress,
  OoHQuoteStatus.completed,
];

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

  const db = getPrisma();
  let row = await loadOoHQuoteForContract(db, id);
  if (!row) return new NextResponse("Not found", { status: 404 });
  if (!VIEW_STATUSES.includes(row.status)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await ensureOohContractExists(db, id, row.status);
  row = (await loadOoHQuoteForContract(db, id))!;
  const contract = row.oohContract;
  if (!contract) return new NextResponse("Not found", { status: 404 });

  const isKo = row.locale !== "en";
  const mediaNames = await resolveMediaNamesForQuote(db, row.mediaIds, isKo);
  const vars = ooHQuoteToContractPdfVars(row, mediaNames, contract.id);
  const { pdfBase64 } = await buildOohContractPdf(vars);
  const buf = Buffer.from(pdfBase64, "base64");

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="thinkad-contract-preview.pdf"',
      "Cache-Control": "no-store, private",
    },
  });
}
