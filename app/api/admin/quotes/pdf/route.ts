import { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin-guard";
import {
  adminFormalQuotePdfBuffer,
  type AdminFormalQuotePdfParams,
  type AdminFormalQuotePdfRow,
} from "@/lib/build-admin-formal-quote-pdf";
import { loadThinkadLogoDataUrl } from "@/lib/quote-pdf-assets";

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

function parseRow(r: unknown): AdminFormalQuotePdfRow | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const name = String(o.name ?? "").trim();
  if (!name) return null;
  const spec = String(o.spec ?? "").trim() || "—";
  const period = String(o.period ?? "").trim() || "—";
  const unitPriceWon = Math.round(Number(o.unitPriceWon));
  const quantity = Math.max(1, Math.round(Number(o.quantity)) || 1);
  const lineTotalWon = Math.round(Number(o.lineTotalWon));
  if (!Number.isFinite(unitPriceWon) || !Number.isFinite(lineTotalWon)) return null;
  return {
    name,
    spec,
    period,
    unitPriceWon,
    quantity,
    lineTotalWon,
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
  const rows: AdminFormalQuotePdfRow[] = [];
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
  const vatIncluded = Boolean(body.vatIncluded);

  const discountTotalWon = Math.max(0, Math.round(Number(body.discountTotalWon)));
  const discountSummary =
    typeof body.discountSummary === "string" ? body.discountSummary.trim() : undefined;

  const linesSubtotalWon = Math.round(Number(body.linesSubtotalWon));
  const supplyWon = Math.round(Number(body.supplyWon));
  const vatWon = Math.round(Number(body.vatWon));
  const totalWon = Math.round(Number(body.totalWon));
  if (
    !Number.isFinite(linesSubtotalWon) ||
    !Number.isFinite(supplyWon) ||
    !Number.isFinite(vatWon) ||
    !Number.isFinite(totalWon)
  ) {
    return jsonErr("Invalid totals", 400);
  }

  const logoFromBody =
    typeof body.logoDataUrl === "string" && body.logoDataUrl.startsWith("data:image/")
      ? body.logoDataUrl
      : null;

  const params: AdminFormalQuotePdfParams = {
    isKo: body.isKo !== false,
    logoDataUrl: logoFromBody ?? loadThinkadLogoDataUrl(),
    quoteNumber,
    issueDate,
    validUntil,
    clientCompany,
    clientName,
    clientPhone,
    clientEmail:
      typeof body.clientEmail === "string" ? body.clientEmail.trim() : undefined,
    periodLabel,
    vatIncluded,
    discountTotalWon,
    discountSummary: discountSummary || undefined,
    rows,
    linesSubtotalWon,
    supplyWon,
    vatWon,
    totalWon,
  };

  try {
    const buf = await adminFormalQuotePdfBuffer(params);
    const filename = `thinkad-quote-${quoteNumber.replace(/[^\w.-]+/g, "_")}.pdf`;
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (e) {
    console.error("[admin-quotes-pdf]", e);
    return jsonErr("PDF build failed", 500);
  }
}
