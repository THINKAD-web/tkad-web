import { NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin-guard";
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
  return { mediaId, name, period, unitPriceWon, lineTotalWon, location };
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

  const db = getPrisma();
  try {
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
        isKo: body.isKo !== false,
        supplyWon,
        vatWon,
        totalWon,
        rows,
      },
      "basic",
    );
    const buf = await buildQuotePdf(payload);
    const safeNum = quoteNumber.replace(/[^\w.-]+/g, "_");
    const filename = `thinkad-quote-${safeNum}.pdf`;
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
