import { readFileSync } from "node:fs";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  decodePDFRawStream,
  PDFArray,
  PDFDocument,
  PDFName,
  PDFRawStream,
  rgb,
  StandardFonts,
  type PDFFont,
} from "pdf-lib";
import { loadServerKrTtf } from "@/lib/jspdf-register-noto-kr";
import { sha256Hex } from "@/lib/signature-audit";
import { extractLastPageTextRuns } from "@/lib/upload-contract-pdf-text";
import {
  lowerSealMatrices,
  partyASealFallback,
  partyASealRect,
  partyASignatureRect,
  type PdfRect,
} from "@/lib/upload-contract-stamp-anchor";

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

function lowerEmbeddedSeals(
  pdfDoc: PDFDocument,
  page: ReturnType<PDFDocument["getPages"]>[number],
  items: import("@/lib/upload-contract-stamp-anchor").PdfTextRun[],
) {
  const raw = page.node.Contents();
  const rewrite = (stream: PDFRawStream) => {
    const text = Buffer.from(decodePDFRawStream(stream).decode()).toString(
      "latin1",
    );
    const next = lowerSealMatrices(text, items);
    if (next === text) return stream;
    const dict = stream.dict.clone(pdfDoc.context);
    dict.delete(PDFName.of("Filter"));
    dict.delete(PDFName.of("DecodeParms"));
    return PDFRawStream.of(dict, new Uint8Array(Buffer.from(next, "latin1")));
  };

  if (raw instanceof PDFArray) {
    const nextRefs = raw.asArray().map((ref) => {
      const looked = pdfDoc.context.lookup(ref);
      if (!(looked instanceof PDFRawStream)) return ref;
      const replaced = rewrite(looked);
      if (replaced === looked) return ref;
      return pdfDoc.context.register(replaced);
    });
    page.node.set(PDFName.of("Contents"), pdfDoc.context.obj(nextRefs));
    return;
  }
  if (raw instanceof PDFRawStream) {
    const replaced = rewrite(raw);
    if (replaced !== raw) {
      page.node.set(
        PDFName.of("Contents"),
        pdfDoc.context.register(replaced),
      );
    }
  }
}

function fitInside(rect: PdfRect, imgW: number, imgH: number): PdfRect {
  const scale = Math.min(rect.w / imgW, rect.h / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return {
    x: rect.x + (rect.w - w) / 2,
    y: rect.y + (rect.h - h) / 2,
    w,
    h,
  };
}

/** 업로드 PDF 마지막 페이지 — 갑 `(인)`에 도장, 그 아래 서명·감사 텍스트 */
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

  const textLayer = await extractLastPageTextRuns(new Uint8Array(sourcePdf));
  const pageSize = page.getSize();
  const seal =
    (textLayer && partyASealRect(textLayer.page, textLayer.items)) ||
    partyASealFallback({ width: pageSize.width, height: pageSize.height });
  if (!textLayer) {
    console.warn("[upload-contract-sign] no text layer; using 갑 seal fallback");
  }
  if (textLayer) {
    lowerEmbeddedSeals(pdfDoc, page, textLayer.items);
  }

  const margin = 36;
  const yBase = 50;

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

  const sigRaw = images.signaturePngBase64?.trim();
  if (sigRaw) {
    const { img: png } = await embedSignImage(pdfDoc, sigRaw);
    const fitted = fitInside(partyASignatureRect(seal), png.width, png.height);
    page.drawImage(png, {
      x: fitted.x,
      y: fitted.y,
      width: fitted.w,
      height: fitted.h,
    });
  }

  const stampRaw = images.stampPngBase64?.trim();
  if (stampRaw) {
    const { img: stampImg } = await embedSignImage(pdfDoc, stampRaw);
    const fitted = fitInside(seal, stampImg.width, stampImg.height);
    page.drawImage(stampImg, {
      x: fitted.x,
      y: fitted.y,
      width: fitted.w,
      height: fitted.h,
    });
  }

  const out = await pdfDoc.save();
  const buf = Buffer.from(out);
  return {
    pdfBase64: buf.toString("base64"),
    sha256: sha256Hex(buf),
  };
}
