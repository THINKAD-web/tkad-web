import { NextRequest, NextResponse } from "next/server";
import { attachmentContentDisposition } from "@/lib/content-disposition";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { buildQuoteExportPayloadFromWizard } from "@/lib/quote-export/build-payload";
import { buildQuotePdf } from "@/lib/quote-export/build-pdf";
import { buildQuotePptx } from "@/lib/quote-export/build-pptx";
import { parseQuoteMediaSelections } from "@/lib/quote-media-selections";
import {
  quoteExportFileBase,
  type QuoteExportFormat,
  type QuoteExportTemplate,
} from "@/lib/quote-export/types";
import { OOH_PERIOD_MONTHS } from "@/lib/ooh-quote";
import { requirePlannerPdfAccess, plannerPdfAccessDeniedMessage } from "@/lib/require-planner-pdf-access";
import {
  budgetPricingExportNextResponse,
  isBudgetPricingNotImplementedError,
} from "@/lib/quote-export/budget-pricing-export-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 30, windowMs: 60_000 });
const CUID_RE = /^c[a-z0-9]{24,}$/i;

function parseTemplate(raw: unknown): QuoteExportTemplate {
  const s = String(raw ?? "").trim().toLowerCase();
  return s === "premium" ? "premium" : "basic";
}

function parseFormat(raw: unknown): QuoteExportFormat | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "pdf" || s === "pptx") return s;
  return null;
}

function parseMediaPriceOptionIndex(
  raw: unknown,
): Record<string, number> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, number> = {};
  for (const [mediaId, value] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (!CUID_RE.test(mediaId)) continue;
    const n =
      typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(n) || n < 0) continue;
    out[mediaId] = Math.floor(n);
  }
  return out;
}

/** 견적 마법사 Step 4 — 저장 전 초안도 서버 jsPDF/pptxgenjs 출력 (#173과 동일 빌더) */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (!limiter.check(ip)) {
    return new NextResponse("Too many requests", { status: 429 });
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const format = parseFormat(body.format);
  if (!format) {
    return new NextResponse("Invalid format", { status: 400 });
  }

  const template = parseTemplate(body.template);
  const localeStr =
    String(body.locale ?? "").toLowerCase() === "en" ? "en" : "ko";

  const mediaIds = Array.isArray(body.mediaIds)
    ? body.mediaIds
        .map((id) => String(id ?? "").trim())
        .filter((id) => CUID_RE.test(id))
    : [];
  if (mediaIds.length === 0) {
    return new NextResponse("No media selected", { status: 400 });
  }

  const periodKeyRaw = String(body.periodKey ?? "30days").trim();
  const periodKey =
    periodKeyRaw in OOH_PERIOD_MONTHS ? periodKeyRaw : "30days";
  const mediaPriceOptionIndex = parseMediaPriceOptionIndex(
    body.mediaPriceOptionIndex,
  );
  const mediaSelections = parseQuoteMediaSelections(body.mediaSelections);

  try {
    const db = getPrisma();
    const payload = await buildQuoteExportPayloadFromWizard(db, {
      mediaIds,
      periodKey,
      locale: localeStr,
      template,
      clientName: String(body.clientName ?? "").trim(),
      clientEmail: String(body.clientEmail ?? "").trim(),
      clientPhone: body.clientPhone != null ? String(body.clientPhone).trim() : null,
      clientCompany: String(body.clientCompany ?? "").trim() || null,
      mediaPriceOptionIndex,
      mediaSelections,
    });

    const base = quoteExportFileBase(payload);
    if (format === "pdf") {
      const bytes = await buildQuotePdf(payload);
      return new NextResponse(new Blob([bytes as BlobPart]), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": attachmentContentDisposition(`${base}.pdf`),
          "Cache-Control": "no-store, private",
        },
      });
    }

    const bytes = await buildQuotePptx(payload);
    return new NextResponse(new Blob([bytes as BlobPart]), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": attachmentContentDisposition(`${base}.pptx`),
        "Cache-Control": "no-store, private",
      },
    });
  } catch (e) {
    if (isBudgetPricingNotImplementedError(e)) {
      return budgetPricingExportNextResponse(localeStr !== "en");
    }
    console.error("[quote export POST]", e);
    return new NextResponse("Failed", { status: 500 });
  }
}
