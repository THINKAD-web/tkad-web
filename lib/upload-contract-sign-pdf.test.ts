import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { buildSignedUploadContractPdf } from "@/lib/upload-contract-sign-pdf";

/** 1×1 PNG */
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("buildSignedUploadContractPdf", () => {
  it("embeds signature into uploaded PDF bytes", async () => {
    const src = await PDFDocument.create();
    src.addPage([400, 400]);
    const sourcePdf = Buffer.from(await src.save());

    const { pdfBase64, sha256 } = await buildSignedUploadContractPdf(
      sourcePdf,
      { signaturePngBase64: TINY_PNG_B64 },
      {
        signerName: "Test User",
        signerEmail: "test@example.com",
        signedAtKst: "2026-01-01 12:00:00",
        documentContentSha256: "a".repeat(64),
        signatureImageSha256: "b".repeat(64),
      },
    );

    assert.equal(sha256.length, 64);
    const out = Buffer.from(pdfBase64, "base64");
    assert.ok(out.subarray(0, 5).toString("ascii").startsWith("%PDF-"));
    const reopened = await PDFDocument.load(out);
    assert.ok(reopened.getPageCount() >= 1);
  });

  it("embeds a Korean signer name without WinAnsi failure", async () => {
    const src = await PDFDocument.create();
    src.addPage([400, 600]);
    const sourcePdf = Buffer.from(await src.save());

    const { pdfBase64 } = await buildSignedUploadContractPdf(
      sourcePdf,
      { signaturePngBase64: TINY_PNG_B64 },
      {
        signerName: "홍장기",
        signerEmail: "marnote@naver.com",
        signedAtKst: "2026. 09. 22. 18:00:00",
        documentContentSha256: "c".repeat(64),
        signatureImageSha256: "d".repeat(64),
      },
    );

    const out = Buffer.from(pdfBase64, "base64");
    assert.ok(out.subarray(0, 5).toString("ascii").startsWith("%PDF-"));
    const reopened = await PDFDocument.load(out);
    assert.equal(reopened.getPageCount(), 1);
  });
});
