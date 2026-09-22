import { NextRequest, NextResponse } from "next/server";
import {
  ContractPreviewError,
  buildContractPreviewPdfBuffer,
  contentDispositionInlinePdf,
} from "@/lib/contract-preview-pdf";
import { CONTRACT_CUSTOMER_VIEW_STATUSES } from "@/lib/contract-send-mode";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ensureOohContractExists } from "@/lib/ooh-contract-ensure";
import { loadOoHQuoteForContract } from "@/lib/ooh-contract-context";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 30, windowMs: 60_000 });
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
    let row = await loadOoHQuoteForContract(db, id);
    if (!row) return new NextResponse("Not found", { status: 404 });
    if (!CONTRACT_CUSTOMER_VIEW_STATUSES.includes(row.status)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await ensureOohContractExists(db, id, row.status);
    row = (await loadOoHQuoteForContract(db, id))!;
    const contract = row.oohContract;
    if (!contract) return new NextResponse("Not found", { status: 404 });

    const { buffer, fileName } = await buildContractPreviewPdfBuffer(
      db,
      row,
      contract,
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDispositionInlinePdf(fileName),
        "Cache-Control": "no-store, private",
      },
    });
  } catch (e) {
    if (e instanceof ContractPreviewError) {
      if (e.code === "NOT_FOUND") {
        return new NextResponse("Not found", { status: 404 });
      }
      console.error("[contract preview]", { quoteId: id, code: e.code, err: e.message });
      return new NextResponse("Unavailable", { status: 503 });
    }
    console.error("[contract preview] unexpected", { quoteId: id, err: e });
    return new NextResponse("Unavailable", { status: 503 });
  }
}
