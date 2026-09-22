import { readFileSync } from "node:fs";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";
import { loadServerKrTtf } from "@/lib/jspdf-register-noto-kr";
import { sha256Hex } from "@/lib/signature-audit";

/** Git에 포함된 파일. `public/fonts/*.ttf`는 gitignore라 Vercel 함수에 없다. */
const BUNDLED_KR_FONT = join(
  process.cwd(),
  "lib/fonts/Pretendard-Regular.ttf",
);

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

/** Helvetica(WinAnsi)에 없는 글자는 ? 로 바꿔 서명 합성 자체가 실패하지 않게 한다. */
export function toWinAnsiSafe(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    out += code >= 32 && code <= 126 ? ch : "?";
  }
  return out;
}

function readBundledKrFont(): Buffer | null {
  try {
    const buf = readFileSync(BUNDLED_KR_FONT);
    if (
      buf.length > 10_000 &&
      buf[0] === 0x00 &&
      buf[1] === 0x01 &&
      buf[2] === 0x00 &&
      buf[3] === 0x00
    ) {
      return buf;
    }
  } catch (e) {
    console.warn("[upload-contract-sign] bundled KR font missing", e);
  }
  return null;
}

function fontCanDrawHangul(font: PDFFont): boolean {
  try {
    const hangul = font.widthOfTextAtSize("홍", 12);
    const latin = font.widthOfTextAtSize("Signer", 12);
    return hangul > 4 && hangul < 40 && latin > 12 && latin < 90;
  } catch {
    return false;
  }
}

export type OverlayFontSource = "bundled" | "cdn" | "helvetica";

let lastOverlayFontSource: OverlayFontSource = "helvetica";

export function takeOverlayFontSource(): OverlayFontSource {
  return lastOverlayFontSource;
}

async function overlayFont(
  pdfDoc: PDFDocument,
): Promise<{ font: PDFFont; hangul: boolean }> {
  const bundled = readBundledKrFont();
  const ttf = bundled ?? (await loadServerKrTtf());
  const source: OverlayFontSource = bundled ? "bundled" : ttf ? "cdn" : "helvetica";
  if (ttf) {
    try {
      pdfDoc.registerFontkit(fontkit);
      // subset:true 는 Pretendard/Noto CJK에서 글자가 띄엄띄엄 깨진다.
      const font = await pdfDoc.embedFont(ttf, { subset: false });
      if (fontCanDrawHangul(font)) {
        lastOverlayFontSource = source;
        return { font, hangul: true };
      }
      console.warn("[upload-contract-sign] KR font failed glyph check", font.name);
    } catch (e) {
      console.warn("[upload-contract-sign] KR font embed failed", e);
    }
  }
  lastOverlayFontSource = "helvetica";
  return {
    font: await pdfDoc.embedFont(StandardFonts.Helvetica),
    hangul: false,
  };
}

function wrapOverlayLine(
  font: PDFFont,
  text: string,
  size: number,
  maxW: number,
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const ch of text) {
    const next = current + ch;
    if (current && font.widthOfTextAtSize(next, size) > maxW) {
      lines.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
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

  const { font, hangul } = await overlayFont(pdfDoc);
  const fontSize = 9;
  const textOf = (line: string) => (hangul ? line : toWinAnsiSafe(line));
  const maxW = width - margin * 2;
  const lines = [
    `Signer: ${overlay.signerName} (${overlay.signerEmail})`,
    `Signed at (KST): ${overlay.signedAtKst}`,
    `Document SHA-256: ${overlay.documentContentSha256}`,
    `Signature SHA-256: ${overlay.signatureImageSha256}`,
  ].flatMap((line) => wrapOverlayLine(font, textOf(line), fontSize, maxW));
  const lineH = fontSize + 4;
  const boxH = lines.length * lineH + 8;
  page.drawRectangle({
    x: margin - 4,
    y: yBase - 4,
    width: maxW + 8,
    height: boxH,
    color: rgb(1, 1, 1),
  });
  let y = yBase + (lines.length - 1) * lineH;
  for (const line of lines) {
    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineH;
  }

  const out = await pdfDoc.save();
  const buf = Buffer.from(out);
  return {
    pdfBase64: buf.toString("base64"),
    sha256: sha256Hex(buf),
  };
}
