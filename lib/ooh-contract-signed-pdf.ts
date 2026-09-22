import type { PrismaClient } from "@prisma/client";
import {
  loadOoHQuoteForContract,
  ooHQuoteToContractPdfVars,
  resolveContractMediaForQuote,
} from "@/lib/ooh-contract-context";
import { buildSignedOohContractPdf } from "@/lib/ooh-contract-pdf";
import {
  formatSignedAtKst,
  hashSignatureImagePngBase64,
  hashUnsignedContractDocument,
} from "@/lib/signature-audit";

function signaturePngBase64FromStored(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.includes(",") ? trimmed.split(",")[1]! : trimmed;
}

/** DB에 저장된 서명 이미지·계약 변수로 서명 완료 PDF를 재생성합니다. */
export async function rebuildSignedOohContractPdfFromRecord(
  db: PrismaClient,
  quoteId: string,
): Promise<{ pdfBase64: string; sha256: string } | null> {
  const row = await loadOoHQuoteForContract(db, quoteId);
  const c = row?.oohContract;
  if (!row || !c?.signatureImage?.trim() || !c.signerName || !c.signerEmail || !c.signedAt) {
    return null;
  }

  const isKo = row.locale !== "en";
  const mediaPack = await resolveContractMediaForQuote(
    db,
    row.mediaIds,
    row.quoteBreakdown as import("@/lib/quote-calculator").QuoteBreakdown | null,
    isKo,
    { start: row.startDate, end: row.endDate },
  );
  const vars = ooHQuoteToContractPdfVars(
    row,
    mediaPack.names,
    c.id,
    undefined,
    mediaPack.lineItems,
  );
  const sigB64 = signaturePngBase64FromStored(c.signatureImage);

  const documentContentSha256 = await hashUnsignedContractDocument(vars);
  const signatureImageSha256 = hashSignatureImagePngBase64(sigB64);

  return buildSignedOohContractPdf(
    vars,
    { signaturePngBase64: sigB64 },
    {
      documentNumber: c.id,
      signerName: c.signerName,
      signerEmail: c.signerEmail,
      signedAtIso: c.signedAt.toISOString(),
      signedAtKst: formatSignedAtKst(c.signedAt),
      signerIp: c.signerIp ?? "unknown",
      signerAgent: c.signerAgent ?? "unknown",
      documentContentSha256,
      signatureImageSha256,
    },
  );
}
