import assert from "node:assert/strict";
import test from "node:test";
import {
  OohContractSendMode,
  OohContractStatus,
} from "@prisma/client";
import { contentDispositionInlinePdf } from "./contract-preview-pdf.ts";
import {
  canAdminSendInvoiceForContract,
  canCustomerSignContract,
  isAttachmentOnlyContract,
  isContractCustomerStepComplete,
  isUploadedContractSendMode,
  mapUploadPdfFetchErrorToHttpStatus,
  normalizeContractSendMode,
} from "./contract-send-mode.ts";
import { OoHQuoteStatus } from "@prisma/client";

test("normalizeContractSendMode defaults to auto_generated", () => {
  assert.equal(normalizeContractSendMode(null), OohContractSendMode.auto_generated);
});

test("sendMode helpers", () => {
  assert.equal(
    isUploadedContractSendMode(OohContractSendMode.uploaded_esign),
    true,
  );
  assert.equal(
    isUploadedContractSendMode(OohContractSendMode.auto_generated),
    false,
  );
});

test("Mode B attachment-only", () => {
  assert.equal(
    isAttachmentOnlyContract({
      sendMode: OohContractSendMode.uploaded_attachment,
      status: OohContractStatus.pending,
    }),
    true,
  );
  assert.equal(
    canCustomerSignContract({
      quoteStatus: OoHQuoteStatus.booking_confirmed,
      contract: {
        sendMode: OohContractSendMode.uploaded_attachment,
        status: OohContractStatus.attachment_sent,
      },
    }),
    false,
  );
});

test("Mode A can sign when pending", () => {
  assert.equal(
    canCustomerSignContract({
      quoteStatus: OoHQuoteStatus.booking_confirmed,
      contract: {
        sendMode: OohContractSendMode.uploaded_esign,
        status: OohContractStatus.pending,
      },
    }),
    true,
  );
});

test("contract step complete: signed or attachment_sent", () => {
  assert.equal(
    isContractCustomerStepComplete({
      sendMode: OohContractSendMode.uploaded_esign,
      status: OohContractStatus.signed,
    }),
    true,
  );
  assert.equal(
    isContractCustomerStepComplete({
      sendMode: OohContractSendMode.uploaded_attachment,
      status: OohContractStatus.attachment_sent,
    }),
    true,
  );
  assert.equal(
    isContractCustomerStepComplete({
      sendMode: OohContractSendMode.uploaded_esign,
      status: OohContractStatus.pending,
    }),
    false,
  );
});

test("admin invoice gate includes Mode B attachment_sent", () => {
  assert.equal(
    canAdminSendInvoiceForContract({
      sendMode: OohContractSendMode.uploaded_attachment,
      status: OohContractStatus.attachment_sent,
    }),
    true,
  );
  assert.equal(
    canAdminSendInvoiceForContract({
      sendMode: OohContractSendMode.uploaded_esign,
      status: OohContractStatus.pending,
    }),
    false,
  );
});

test("korean upload filename is a valid Content-Disposition ByteString", () => {
  const name = "(260918)_기어세컨드 홍대 상진빌딩 계약서_싱커드.pdf";
  const value = contentDispositionInlinePdf(name);
  assert.equal([...value].every((ch) => ch.charCodeAt(0) <= 255), true);
  const headers = new Headers({ "Content-Disposition": value });
  assert.match(headers.get("Content-Disposition") ?? "", /filename\*=UTF-8''/);
  assert.match(headers.get("Content-Disposition") ?? "", /filename="/);
});

test("mapUploadPdfFetchErrorToHttpStatus", () => {
  assert.equal(mapUploadPdfFetchErrorToHttpStatus("not_pdf"), 400);
  assert.equal(mapUploadPdfFetchErrorToHttpStatus("upload_fetch_failed"), 503);
});
