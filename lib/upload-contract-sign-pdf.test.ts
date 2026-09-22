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
      TINY_PNG_B64,
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
});
