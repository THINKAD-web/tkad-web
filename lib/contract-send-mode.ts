import {
  OoHQuoteStatus,
  OohContractSendMode,
  OohContractStatus,
} from "@prisma/client";

export const CONTRACT_CUSTOMER_VIEW_STATUSES: OoHQuoteStatus[] = [
  OoHQuoteStatus.booking_confirmed,
  OoHQuoteStatus.invoice_sent,
  OoHQuoteStatus.payment_pending,
  OoHQuoteStatus.payment_confirmed,
  OoHQuoteStatus.contract_confirmed,
  OoHQuoteStatus.in_progress,
  OoHQuoteStatus.completed,
];

export type ContractRowLike = {
  sendMode?: OohContractSendMode | null;
  status: OohContractStatus;
};

export function normalizeContractSendMode(
  mode: OohContractSendMode | null | undefined,
): OohContractSendMode {
  return mode ?? OohContractSendMode.auto_generated;
}

export function isUploadedContractSendMode(
  mode: OohContractSendMode,
): boolean {
  return (
    mode === OohContractSendMode.uploaded_esign ||
    mode === OohContractSendMode.uploaded_attachment
  );
}

/** Mode B — 첨부 발송, 서명 UI 없음 */
export function isAttachmentOnlyContract(contract: ContractRowLike): boolean {
  const mode = normalizeContractSendMode(contract.sendMode);
  return (
    mode === OohContractSendMode.uploaded_attachment ||
    contract.status === OohContractStatus.attachment_sent
  );
}

/** 청구·타임라인: e-sign 완료 또는 첨부 발송 완료 */
export function isContractCustomerStepComplete(
  contract: ContractRowLike | null | undefined,
): boolean {
  if (!contract) return false;
  if (
    contract.status === OohContractStatus.signed ||
    contract.status === OohContractStatus.confirmed
  ) {
    return true;
  }
  return (
    normalizeContractSendMode(contract.sendMode) ===
      OohContractSendMode.uploaded_attachment &&
    contract.status === OohContractStatus.attachment_sent
  );
}

export function canCustomerSignContract(input: {
  quoteStatus: OoHQuoteStatus;
  contract: ContractRowLike | null | undefined;
}): boolean {
  if (input.quoteStatus !== OoHQuoteStatus.booking_confirmed) return false;
  if (!input.contract || input.contract.status !== OohContractStatus.pending) {
    return false;
  }
  return !isAttachmentOnlyContract(input.contract);
}

/** Admin 청구서 발송 API — e-sign signed 또는 첨부 발송 완료 */
export function canAdminSendInvoiceForContract(
  contract: ContractRowLike | null | undefined,
): boolean {
  if (!contract) return false;
  if (contract.status === OohContractStatus.signed) return true;
  return (
    normalizeContractSendMode(contract.sendMode) ===
      OohContractSendMode.uploaded_attachment &&
    contract.status === OohContractStatus.attachment_sent
  );
}

export function mapUploadPdfFetchErrorToHttpStatus(message: string): number {
  if (
    message === "upload_fetch_failed" ||
    message.startsWith("BUNNY_") ||
    message === "upload_pdf_unavailable"
  ) {
    return 503;
  }
  if (
    message === "upload_sha_mismatch" ||
    message === "not_pdf" ||
    message === "empty_pdf" ||
    message === "pdf_too_large" ||
    message === "invalid_upload_url"
  ) {
    return 400;
  }
  return 503;
}
