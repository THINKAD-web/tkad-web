import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { sha256Hex } from "@/lib/signature-audit";

export type UploadContractSignOverlay = {
  signerName: string;
  signerEmail: string;
  signedAtKst: string;
  documentContentSha256: string;
  signatureImageSha256: string;
};

function decodeImageBase64(dataUrlOrB64: string): Buffer {
  const raw = dataUrlOrB64.includes(",")
    ? dataUrlOrB64.split(",")[1]!
    : dataUrlOrB64;
  return Buffer.from(raw, "base64");
}

async function embedSignImage(
  pdfDoc: PDFDocument,
  dataUrlOrB64: string,
): Promise<{ img: Awaited<ReturnType<PDFDocument["embedPng"]>>; mime: string }> {
  const bytes = decodeImageBase64(dataUrlOrB64);
  const mime = dataUrlOrB64.includes("image/jpeg")
    ? "jpeg"
    : dataUrlOrB64.includes("image/webp")
      ? "webp"
      : "png";
  try {
    if (mime === "jpeg") {
      return { img: await pdfDoc.embedJpg(bytes), mime };
    }
    return { img: await pdfDoc.embedPng(bytes), mime };
  } catch {
    try {
      return { img: await pdfDoc.embedJpg(bytes), mime: "jpeg" };
    } catch {
      return { img: await pdfDoc.embedPng(bytes), mime: "png" };
    }
  }
}

/** 업로드 PDF 마지막 페이지 하단에 서명·도장·감사 텍스트 합성 (A-1) */
export async function buildSignedUploadContractPdf(
  sourcePdf: Buffer,
  images: {
    signaturePngBase64?: string | null;
    stampPngBase64?: string | null;
  },
  overlay: UploadContractSignOverlay,
): Promise<{ pdfBase64: string; sha256: string }> {
  const pdfDoc = await PDFDocument.load(sourcePdf, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const page = pages[pages.length - 1]!;
  const { width } = page.getSize();

  const margin = 36;
  let yBase = margin + 8;
  const sigRaw = images.signaturePngBase64?.trim();
  if (sigRaw) {
    const { img: png } = await embedSignImage(pdfDoc, sigRaw);
    const sigW = 140;
    const sigH = (png.height / png.width) * sigW;
    yBase = margin + sigH + 8;
    page.drawImage(png, {
      x: margin,
      y: margin,
      width: sigW,
      height: sigH,
    });
  }

  const stampRaw = images.stampPngBase64?.trim();
  if (stampRaw) {
    const { img: stampImg } = await embedSignImage(pdfDoc, stampRaw);
    const stampW = 72;
    const stampH = (stampImg.height / stampImg.width) * stampW;
    page.drawImage(stampImg, {
      x: width - margin - stampW,
      y: margin,
      width: stampW,
      height: stampH,
    });
    yBase = Math.max(yBase, margin + stampH + 8);
  }

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
