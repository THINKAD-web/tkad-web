import type { PrismaClient } from "@prisma/client";
import {
  loadOoHQuoteForContract,
  ooHQuoteToContractPdfVars,
  resolveContractMediaForQuote,
} from "@/lib/ooh-contract-context";
import { buildSignedOohContractPdf } from "@/lib/ooh-contract-pdf";
import {
  isUploadedContractSendMode,
  normalizeContractSendMode,
} from "@/lib/contract-send-mode";
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

function toPngDataUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("data:")) return trimmed;
  const b64 = signaturePngBase64FromStored(trimmed);
  return `data:image/png;base64,${b64}`;
}

/** DB 저장 서명·도장 → PDF 합성 입력 (재생성 시 갑 도장 위치 보장) */
export function resolveSignedPdfImagesFromContract(c: {
  signatureImage: string | null;
  clientStampImage?: string | null;
}): {
  signaturePngBase64?: string;
  clientStampDataUrl: string | null;
} {
  const stampRaw = c.clientStampImage?.trim() || "";
  const sigRaw = c.signatureImage?.trim() || "";

  let clientStampDataUrl: string | null = stampRaw ? toPngDataUrl(stampRaw) : null;
  let signaturePngBase64: string | undefined;

  if (sigRaw) {
    const sigB64 = signaturePngBase64FromStored(sigRaw);
    const stampB64 = stampRaw ? signaturePngBase64FromStored(stampRaw) : "";

    if (!stampRaw) {
      // 구 데이터: signature_image에 도장만 있는 경우
      clientStampDataUrl = toPngDataUrl(sigRaw);
    } else if (stampB64 && sigB64 === stampB64) {
      // 도장만 제출된 경우 signature·stamp 동일 저장
    } else {
      signaturePngBase64 = sigB64;
    }
  }

  return { signaturePngBase64, clientStampDataUrl };
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
  if (isUploadedContractSendMode(normalizeContractSendMode(c.sendMode))) {
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

  const images = resolveSignedPdfImagesFromContract(c);
  const sigForHash =
    images.signaturePngBase64 ??
    (images.clientStampDataUrl
      ? signaturePngBase64FromStored(images.clientStampDataUrl)
      : signaturePngBase64FromStored(c.signatureImage));

  const documentContentSha256 = await hashUnsignedContractDocument(vars);
  const signatureImageSha256 = hashSignatureImagePngBase64(sigForHash);

  return buildSignedOohContractPdf(
    vars,
    images,
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
