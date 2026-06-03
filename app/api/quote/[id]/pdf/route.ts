import { NextRequest, NextResponse } from "next/server";
import { attachmentContentDisposition } from "@/lib/content-disposition";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ooHQuotePdfToBase64 } from "@/lib/server-ooh-quote-pdf";
import { buildKoreanQuotePdf } from "@/lib/build-korean-quote-pdf";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { requirePlannerPdfAccess } from "@/lib/require-planner-pdf-access";

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
  const template = new URL(request.url).searchParams.get("template");
  if (!id || !CUID_RE.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!isDatabaseConfigured()) {
    return new NextResponse("Unavailable", { status: 503 });
  }

  const pdfAccess = await requirePlannerPdfAccess();
  if (!pdfAccess.allowed) {
    return new NextResponse(pdfAccess.status === 401 ? "Login required" : "PRO required", {
      status: pdfAccess.status,
    });
  }

  try {
    const db = getPrisma();
    const row = await db.ooHQuote.findUnique({ where: { id } });
    if (!row) return new NextResponse("Not found", { status: 404 });

    // 모든 경로 신규 디자인 통일 — 서버 jsPDF (보고서와 동일 방식).
    // template 미지정 시 행의 pdfTemplate(기본/프리미엄) 따름.
    try {
      const { buildQuoteExportPayload, quoteTemplateFromRow } = await import(
        "@/lib/quote-export/build-payload"
      );
      const { buildQuotePdf } = await import("@/lib/quote-export/build-pdf");
      const { quoteExportFileBase } = await import("@/lib/quote-export/types");
      const tmpl =
        template === "basic" || template === "premium"
          ? template
          : quoteTemplateFromRow(row);
      const payload = await buildQuoteExportPayload(db, row, tmpl);
      const bytes = await buildQuotePdf(payload);
      return new NextResponse(new Blob([bytes as BlobPart]), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": attachmentContentDisposition(
            `${quoteExportFileBase(payload)}.pdf`,
          ),
          "Cache-Control": "no-store, private",
        },
      });
    } catch (newErr) {
      // 신규 빌더 실패 시 레거시 빌더로 폴백 (클라이언트 대면 문서 500 방지)
      console.error("[quote pdf GET] new builder failed, fallback to legacy", newErr);
    }

    const localeKo = !row.locale || row.locale.toLowerCase().startsWith("ko");
    let buf: Buffer;
    const quoteRow = row;

    async function buildEnglishFallback(): Promise<Buffer> {
      const b64 = await ooHQuotePdfToBase64(db, {
        clientCompany: quoteRow.clientCompany,
        clientName: quoteRow.clientName,
        period: quoteRow.period,
        periodKey: quoteRow.periodKey,
        budgetMin: quoteRow.budgetMin,
        budgetMax: quoteRow.budgetMax,
        pdfTemplate: quoteRow.pdfTemplate,
        locale: quoteRow.locale,
        mediaIds: quoteRow.mediaIds,
        totalAmount: quoteRow.totalAmount,
        networkSelections: quoteRow.networkSelections ?? undefined,
      });
      return Buffer.from(b64, "base64");
    }

    if (localeKo) {
      // 한국어 견적서 (Noto Sans KR + THINKAD 브랜드)
      try {
        const catalog = await fetchPublicMediaCatalog();
        const rows = catalog
          .filter((m) => row.mediaIds.includes(m.id))
          .map((m) => ({
            name: m.name,
            location: m.location,
            type: m.type,
            price: catalogPriceFieldToWon(m.price ?? 0),
            pricePeriod: m.pricePeriod ?? "month",
            visibilityScore: m.visibilityScore ?? 0,
          }));
        if (rows.length === 0) {
          // 매체 매칭 실패 시 즉시 영문 fallback
          console.warn("[quote pdf GET] no media rows matched, fallback to en", { id, mediaIds: row.mediaIds });
          buf = await buildEnglishFallback();
        } else {
          const bytes = await buildKoreanQuotePdf({
            quoteId: row.id,
            createdAt: row.createdAt,
            clientName: row.clientName,
            clientEmail: row.clientEmail,
            clientCompany: row.clientCompany,
            period: row.period,
            startDate: row.startDate,
            endDate: row.endDate,
            budgetMin: row.budgetMin,
            budgetMax: row.budgetMax,
            totalAmount: row.totalAmount,
            rows,
          });
          buf = Buffer.from(bytes);
        }
      } catch (koErr) {
        console.error("[quote pdf GET] korean builder failed, fallback to en", koErr);
        buf = await buildEnglishFallback();
      }
    } else {
      buf = await buildEnglishFallback();
    }

    const displayName = localeKo ? "싱커드-견적서.pdf" : "THINKAD-quote.pdf";
    return new NextResponse(new Uint8Array(buf), {
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
