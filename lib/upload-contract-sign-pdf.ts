import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { sha256Hex } from "@/lib/signature-audit";

export type UploadContractSignOverlay = {
  signerName: string;
  signerEmail: string;
  signedAtKst: string;
  documentContentSha256: string;
  signatureImageSha256: string;
};

/** 업로드 PDF 마지막 페이지 하단에 서명·감사 텍스트 합성 (A-1) */
export async function buildSignedUploadContractPdf(
  sourcePdf: Buffer,
  signaturePngBase64: string,
  overlay: UploadContractSignOverlay,
): Promise<{ pdfBase64: string; sha256: string }> {
  const sigRaw = signaturePngBase64.includes(",")
    ? signaturePngBase64.split(",")[1]!
    : signaturePngBase64;
  const sigBytes = Buffer.from(sigRaw, "base64");

  const pdfDoc = await PDFDocument.load(sourcePdf, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const page = pages[pages.length - 1]!;
  const { width } = page.getSize();

  const png = await pdfDoc.embedPng(sigBytes);
  const sigW = 140;
  const sigH = (png.height / png.width) * sigW;
  const margin = 36;
  const yBase = margin + sigH + 8;

  page.drawImage(png, {
    x: margin,
    y: margin,
    width: sigW,
    height: sigH,
  });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 9;
  const lines = [
    `Signer: ${overlay.signerName} (${overlay.signerEmail})`,
    `Signed at (KST): ${overlay.signedAtKst}`,
    `Document SHA-256: ${overlay.documentContentSha256}`,
    `Signature SHA-256: ${overlay.signatureImageSha256}`,
  ];
  let y = yBase;
  for (const line of lines) {
    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0.15, 0.15, 0.15),
      maxWidth: width - margin * 2,
    });
    y += fontSize + 4;
  }

  const out = await pdfDoc.save();
  const buf = Buffer.from(out);
  return {
    pdfBase64: buf.toString("base64"),
    sha256: sha256Hex(buf),
  };
}
