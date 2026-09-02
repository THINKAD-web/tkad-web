import { NextRequest, NextResponse } from "next/server";
import { attachmentContentDisposition } from "@/lib/content-disposition";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { buildQuoteExportPayload } from "@/lib/quote-export/build-payload";
import { buildQuotePptx } from "@/lib/quote-export/build-pptx";
import { quoteExportFileBase } from "@/lib/quote-export/types";
import { requirePlannerPdfAccess, plannerPdfAccessDeniedMessage } from "@/lib/require-planner-pdf-access";
import {
  budgetPricingExportNextResponse,
  isBudgetPricingNotImplementedError,
} from "@/lib/quote-export/budget-pricing-export-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 20, windowMs: 60_000 });
const CUID_RE = /^c[a-z0-9]{24,}$/i;

/** 견적서 PPTX — pptxgenjs (GET ?template=basic|premium) */
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

  const pdfAccess = await requirePlannerPdfAccess();
  if (!pdfAccess.allowed) {
    return new NextResponse(plannerPdfAccessDeniedMessage(pdfAccess.status), {
      status: pdfAccess.status,
    });
  }

  const template =
    new URL(request.url).searchParams.get("template") === "premium"
      ? "premium"
      : "basic";

  let quoteLocale: string | null = null;
  try {
    const db = getPrisma();
    const row = await db.ooHQuote.findUnique({ where: { id } });
    if (!row) return new NextResponse("Not found", { status: 404 });
    quoteLocale = row.locale;

    const payload = await buildQuoteExportPayload(db, row, template);
    const bytes = await buildQuotePptx(payload);

    return new NextResponse(new Blob([bytes as BlobPart]), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": attachmentContentDisposition(
          `${quoteExportFileBase(payload)}.pptx`,
        ),
        "Cache-Control": "no-store, private",
      },
    });
  } catch (e) {
    if (isBudgetPricingNotImplementedError(e)) {
      const isKo = !quoteLocale || quoteLocale.toLowerCase().startsWith("ko");
      return budgetPricingExportNextResponse(isKo);
    }
    console.error("[quote pptx GET]", e);
    return new NextResponse("Failed", { status: 500 });
  }
}
