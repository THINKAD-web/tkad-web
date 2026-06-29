import { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin-guard";
import { buildAdminFormalQuoteParamsFromDraft } from "@/lib/admin-sales-quote";
import { adminFormalQuotePdfBuffer } from "@/lib/build-admin-formal-quote-pdf";
import { getPrisma } from "@/lib/prisma";
import {
  buildQuoteExportPayloadFromAdminDraft,
  type AdminQuoteDraftExportRow,
} from "@/lib/quote-export/build-payload";
import { buildQuotePdf } from "@/lib/quote-export/build-pdf";
import { attachmentContentDisposition } from "@/lib/content-disposition";

export const dynamic = "force-dynamic";

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, private",
    },
  });
}

function parseRow(r: unknown): AdminQuoteDraftExportRow | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const name = String(o.name ?? "").trim();
  if (!name) return null;
  const period = String(o.period ?? "").trim() || "—";
  const unitPriceWon = Math.round(Number(o.unitPriceWon));
  const lineTotalWon = Math.round(Number(o.lineTotalWon));
  if (!Number.isFinite(unitPriceWon) || !Number.isFinite(lineTotalWon)) return null;
  const mediaId =
    typeof o.mediaId === "string" && o.mediaId.trim() ? o.mediaId.trim() : null;
  const location =
    typeof o.location === "string" && o.location.trim() ? o.location.trim() : undefined;
  const spec =
    typeof o.spec === "string" && o.spec.trim() ? o.spec.trim() : undefined;
  const quantityRaw = Math.round(Number(o.quantity));
  const quantity =
    Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : undefined;
  return {
    mediaId,
    name,
    period,
    unitPriceWon,
    lineTotalWon,
    location,
    spec,
    quantity,
  };
}

export async function POST(request: NextRequest) {
  const deny = assertAdmin(request);
  if (deny) return deny;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonErr("Invalid JSON", 400);
  }

  const rowsRaw = body.rows;
  if (!Array.isArray(rowsRaw) || rowsRaw.length === 0) {
    return jsonErr("rows required", 400);
  }
  const rows: AdminQuoteDraftExportRow[] = [];
  for (const r of rowsRaw) {
    const row = parseRow(r);
    if (!row) return jsonErr("Invalid row", 400);
    rows.push(row);
  }

  const quoteNumber = String(body.quoteNumber ?? "").trim();
  if (!quoteNumber) return jsonErr("quoteNumber required", 400);

  const issueDate = String(body.issueDate ?? "").trim();
  const validUntil = String(body.validUntil ?? "").trim();
  if (!issueDate || !validUntil) return jsonErr("issueDate, validUntil required", 400);

  const clientCompany = String(body.clientCompany ?? "").trim();
  const clientName = String(body.clientName ?? "").trim();
  const clientPhone = String(body.clientPhone ?? "").trim();
  if (!clientCompany || !clientName || !clientPhone) {
    return jsonErr("clientCompany, clientName, clientPhone required", 400);
  }

  const periodLabel = String(body.periodLabel ?? "").trim() || "—";
  const supplyWon = Math.round(Number(body.supplyWon));
  const vatWon = Math.round(Number(body.vatWon));
  const totalWon = Math.round(Number(body.totalWon));
  if (!Number.isFinite(supplyWon) || !Number.isFinite(vatWon) || !Number.isFinite(totalWon)) {
    return jsonErr("Invalid totals", 400);
  }

  const linesSubtotalWon = Math.round(Number(body.linesSubtotalWon));
  const discountTotalWon = Math.round(Number(body.discountTotalWon));
  const discountSummary =
    typeof body.discountSummary === "string" ? body.discountSummary.trim() : undefined;
  const vatIncluded = body.vatIncluded === true;
  const discountPercent = Math.min(
    100,
    Math.max(0, Number(body.discountPercent) || 0),
  );
  const discountWon = Math.max(0, Math.round(Number(body.discountWon) || 0));
  const isKo = body.isKo !== false;
  const pdfStyle = String(body.pdfStyle ?? "basic").trim().toLowerCase();

  const safeNum = quoteNumber.replace(/[^\w.-]+/g, "_");
  const filename =
    pdfStyle === "formal"
      ? `thinkad-formal-quote-${safeNum}.pdf`
      : `thinkad-quote-${safeNum}.pdf`;

  try {
    if (pdfStyle === "formal") {
      const formalBuf = await adminFormalQuotePdfBuffer(
        buildAdminFormalQuoteParamsFromDraft({
          isKo,
          quoteNumber,
          issueDate,
          validUntil,
          clientCompany,
          clientName,
          clientPhone,
          clientEmail:
            typeof body.clientEmail === "string" ? body.clientEmail.trim() : undefined,
          periodLabel,
          discountPercent,
          discountWon,
          vatIncluded,
          totals: {
            linesSubtotalWon: Number.isFinite(linesSubtotalWon)
              ? linesSubtotalWon
              : supplyWon + (Number.isFinite(discountTotalWon) ? discountTotalWon : 0),
            discountTotalWon: Number.isFinite(discountTotalWon) ? discountTotalWon : 0,
            afterDiscountWon: supplyWon,
            supplyWon,
            vatWon,
            totalWon,
          },
          rows: rows.map((r) => ({
            name: r.name,
            spec: r.spec ?? "—",
            period: r.period,
            unitPriceWon: r.unitPriceWon,
            quantity: r.quantity ?? 1,
            lineTotalWon: r.lineTotalWon,
          })),
        }),
      );
      return new Response(new Uint8Array(formalBuf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": attachmentContentDisposition(filename),
          "Cache-Control": "no-store, private",
        },
      });
    }

    const db = getPrisma();
    const payload = await buildQuoteExportPayloadFromAdminDraft(
      db,
      {
        quoteNumber,
        issueDate,
        validUntil,
        clientCompany,
        clientName,
        clientPhone,
        clientEmail:
          typeof body.clientEmail === "string" ? body.clientEmail.trim() : undefined,
        periodLabel,
        isKo,
        supplyWon,
        vatWon,
        totalWon,
        linesSubtotalWon: Number.isFinite(linesSubtotalWon)
          ? linesSubtotalWon
          : undefined,
        discountTotalWon:
          Number.isFinite(discountTotalWon) && discountTotalWon > 0
            ? discountTotalWon
            : undefined,
        discountSummary,
        vatIncluded: vatIncluded || undefined,
        rows,
      },
      "basic",
    );
    const buf = await buildQuotePdf(payload);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": attachmentContentDisposition(filename),
        "Cache-Control": "no-store, private",
      },
    });
  } catch (e) {
    console.error("[admin-quotes-pdf]", e);
    return jsonErr("PDF build failed", 500);
  }
}
