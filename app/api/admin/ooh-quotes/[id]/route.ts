import { NextRequest } from "next/server";
import { OohContractStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { serializeOoHQuotePublic } from "@/lib/ooh-quote";
import { syncOoHQuoteBreakdown } from "@/lib/ooh-quote-sync-breakdown";
import { ensureOohContractExists } from "@/lib/ooh-contract-ensure";
import {
  loadOoHQuoteForContract,
  ooHQuoteToContractPdfVars,
  resolveMediaNamesForQuote,
} from "@/lib/ooh-contract-context";
import { canPreviewOohContract } from "@/lib/ooh-contract-display";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();
  const row = await loadOoHQuoteForContract(db, id);
  if (!row) return json({ error: "not_found" }, 404);

  const isKo = row.locale !== "en";
  const mediaNames = await resolveMediaNamesForQuote(db, row.mediaIds, isKo);

  let contract = row.oohContract;
  if (canPreviewOohContract(row.status) && !contract) {
    await ensureOohContractExists(db, id, row.status);
    const refreshed = await loadOoHQuoteForContract(db, id);
    contract = refreshed?.oohContract ?? null;
  }

  const contractRecordId = contract?.id ?? id;
  const pdfVars = ooHQuoteToContractPdfVars(
    { ...row, oohContract: contract },
    mediaNames,
    contractRecordId,
  );

  return json({
    quote: {
      ...serializeOoHQuotePublic(row),
      clientEmail: row.clientEmail,
      clientPhone: row.clientPhone,
      clientCompany: row.clientCompany,
      adminNote: row.adminNote,
      quoteBreakdown: row.quoteBreakdown,
      contactInquiryId: row.contactInquiryId,
      quotePdfSentAt: row.quotePdfSentAt?.toISOString() ?? null,
      validUntil: row.validUntil?.toISOString() ?? null,
      startDate: row.startDate?.toISOString() ?? null,
      endDate: row.endDate?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      contract: contract
        ? {
            id: contract.id,
            status: contract.status,
            specialTerms: contract.specialTerms,
            signedAt: contract.signedAt?.toISOString() ?? null,
            canEditTerms: contract.status === OohContractStatus.pending,
          }
        : null,
      contractDisplay: {
        isKo,
        advertiserLine: pdfVars.advertiserLine,
        mediaLines: pdfVars.mediaLines,
        period: pdfVars.period,
        amountLine: pdfVars.amountLine,
        canPreview: canPreviewOohContract(row.status),
      },
    },
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await params;
  const db = getPrisma();
  const existing = await db.ooHQuote.findUnique({ where: { id } });
  if (!existing) return json({ error: "not_found" }, 404);

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const recalc = body.recalculate === true;
  const discountRate =
    typeof body.discountRate === "number" ? body.discountRate : undefined;

  if (discountRate != null) {
    await db.ooHQuote.update({
      where: { id },
      data: { discountRate },
    });
  }

  if ("specialTerms" in body) {
    if (!canPreviewOohContract(existing.status)) {
      return json({ error: "contract_terms_need_booking" }, 400);
    }
    const contract = await ensureOohContractExists(db, id, existing.status);
    if (!contract) {
      return json({ error: "contract_terms_need_booking" }, 400);
    }
    if (contract.status !== OohContractStatus.pending) {
      return json({ error: "contract_terms_signed_locked" }, 409);
    }
    const nextTerms =
      typeof body.specialTerms === "string"
        ? body.specialTerms.trim() || null
        : body.specialTerms === null
          ? null
          : undefined;
    if (nextTerms === undefined) {
      return json({ error: "invalid_special_terms" }, 400);
    }
    await db.oohContract.update({
      where: { id: contract.id },
      data: { specialTerms: nextTerms },
    });
  }

  const row = await db.ooHQuote.findUnique({ where: { id } });
  if (!row) return json({ error: "not_found" }, 404);

  const updated = recalc ? await syncOoHQuoteBreakdown(db, row) : row;

  return json({
    ok: true,
    quote: {
      ...serializeOoHQuotePublic(updated),
      quoteBreakdown: updated.quoteBreakdown,
    },
  });
}
