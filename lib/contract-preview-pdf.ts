import { OohContractSendMode, type PrismaClient } from "@prisma/client";
import { fetchUploadedContractPdfForPreview } from "@/lib/ooh-contract-upload-pdf";
import {
  loadOoHQuoteForContract,
  ooHQuoteToContractPdfVars,
  resolveMediaNamesForQuote,
} from "@/lib/ooh-contract-context";
import { buildOohContractPdf } from "@/lib/ooh-contract-pdf";
import { normalizeContractSendMode, isUploadedContractSendMode } from "@/lib/contract-send-mode";

type QuoteRow = NonNullable<Awaited<ReturnType<typeof loadOoHQuoteForContract>>>;
type ContractRow = NonNullable<QuoteRow["oohContract"]>;

export class ContractPreviewError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ContractPreviewError";
  }
}

/** sendMode별 계약 미리보기 PDF bytes (public preview / admin 검증용) */
export async function buildContractPreviewPdfBuffer(
  db: PrismaClient,
  row: QuoteRow,
  contract: ContractRow,
): Promise<{ buffer: Buffer; fileName: string }> {
  const sendMode = normalizeContractSendMode(contract.sendMode);

  if (isUploadedContractSendMode(sendMode)) {
    if (!contract.uploadedPdfUrl?.trim()) {
      throw new ContractPreviewError("missing_upload_url", "NOT_FOUND");
    }
    try {
      const buffer = await fetchUploadedContractPdfForPreview(
        contract.uploadedPdfUrl,
        contract.uploadedPdfSha256,
      );
      const fileName =
        contract.uploadedPdfFileName?.trim() || "thinkad-contract.pdf";
      return { buffer, fileName };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "upload_fetch_failed";
      throw new ContractPreviewError(msg, "UPLOAD_FETCH");
    }
  }

  if (sendMode !== OohContractSendMode.auto_generated) {
    throw new ContractPreviewError("unsupported_send_mode", "UNSUPPORTED");
  }

  try {
    const isKo = row.locale !== "en";
    const mediaNames = await resolveMediaNamesForQuote(db, row.mediaIds, isKo);
    const vars = ooHQuoteToContractPdfVars(row, mediaNames, contract.id);
    const { pdfBase64 } = await buildOohContractPdf(vars);
    return {
      buffer: Buffer.from(pdfBase64, "base64"),
      fileName: "thinkad-contract-preview.pdf",
    };
  } catch {
    throw new ContractPreviewError("pdf_generate_failed", "GENERATE");
  }
}
