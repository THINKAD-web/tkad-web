import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { buildSignedUploadContractPdf } from "@/lib/upload-contract-sign-pdf";
import { extractLastPageTextRuns } from "@/lib/upload-contract-pdf-text";
import { partyASealRect } from "@/lib/upload-contract-stamp-anchor";

const REFERENCE_PDF = "reports/contract-quality-2026-09-22/reference-original.pdf";

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
    assert.ok(out.length > 500_000, "full KR font should be embedded");
    const reopened = await PDFDocument.load(out);
    assert.equal(reopened.getPageCount(), 1);
  });

  it("places the stamp on 갑 (인) of the uploaded gearsecond contract", async () => {
    if (!existsSync(REFERENCE_PDF)) {
      return;
    }
    const sourcePdf = readFileSync(REFERENCE_PDF);
    const text = await extractLastPageTextRuns(new Uint8Array(sourcePdf));
    assert.ok(text, "pdfjs must read the uploaded contract");
    const anchor = partyASealRect(text.page, text.items);
    assert.ok(anchor, "갑 대표자 line must anchor the seal");
    assert.ok(anchor.y + anchor.h <= 195.1 - 2);
    assert.ok(anchor.x + anchor.w < text.page.width * 0.5);

    const { pdfBase64 } = await buildSignedUploadContractPdf(
      sourcePdf,
      { stampPngBase64: TINY_PNG_B64 },
      {
        signerName: "홍용기",
        signerEmail: "mannote@tkad.co.kr",
        signedAtKst: "2026. 09. 23. 03:57:11",
        documentContentSha256: "e".repeat(64),
        signatureImageSha256: "f".repeat(64),
      },
    );

    const signed = Buffer.from(pdfBase64, "base64");
    const placed = await imageRectsOnLastPage(signed);
    const client = placed.find(
      (rect) => rect.x < text.page.width * 0.5 && rect.w < 60,
    );
    assert.ok(client, `client stamp missing: ${JSON.stringify(placed)}`);
    assert.ok(client.y > 120, "stamp must not sit on the footer");
    assert.ok(client.y + client.h <= 195.1 - 1, "stamp covers the phone line");

    const company = placed.find((rect) => rect.x > text.page.width * 0.5);
    assert.ok(company, "company seal missing");
    assert.ok(
      company.y + company.h <= 195.1 - 1,
      `company seal still covers the phone: ${JSON.stringify(company)}`,
    );
  });
});

async function imageRectsOnLastPage(
  pdfBytes: Buffer,
): Promise<Array<{ x: number; y: number; w: number; h: number }>> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as {
    getDocument: (src: Record<string, unknown>) => {
      promise: Promise<{
        numPages: number;
        getPage: (n: number) => Promise<{
          getOperatorList: () => Promise<{ fnArray: number[]; argsArray: unknown[] }>;
        }>;
      }>;
    };
    OPS: { save: number; restore: number; transform: number; paintImageXObject: number };
  };
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(pdfBytes),
    verbosity: 0,
  }).promise;
  const page = await doc.getPage(doc.numPages);
  const op = await page.getOperatorList();
  const stack: number[][] = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const mul = (m: number[], n: number[]) => {
    const [a, b, c, d, e, f] = m;
    const [a2, b2, c2, d2, e2, f2] = n;
    return [
      a * a2 + c * b2,
      b * a2 + d * b2,
      a * c2 + c * d2,
      b * c2 + d * d2,
      a * e2 + c * f2 + e,
      b * e2 + d * f2 + f,
    ];
  };
  const rects: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (let i = 0; i < op.fnArray.length; i++) {
    const fn = op.fnArray[i];
    const args = op.argsArray[i] as number[];
    if (fn === pdfjs.OPS.save) {
      stack.push(ctm.slice());
      continue;
    }
    if (fn === pdfjs.OPS.restore) {
      ctm = stack.pop() ?? ctm;
      continue;
    }
    if (fn === pdfjs.OPS.transform) {
      ctm = mul(ctm, args);
      continue;
    }
    if (fn === pdfjs.OPS.paintImageXObject) {
      const [a, , , d, e, f] = ctm;
      rects.push({ x: e, y: f, w: a, h: d });
    }
  }
  return rects;
}
