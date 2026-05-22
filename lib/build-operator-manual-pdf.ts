import type { jsPDF } from "jspdf";
import {
  ensureKrFontForServerPdf,
  krFontFamily,
} from "@/lib/jspdf-register-noto-kr";
import { loadThinkadLogoDataUrl } from "@/lib/quote-pdf-assets";
import {
  OPERATOR_MANUAL_SUBTITLE,
  OPERATOR_MANUAL_TITLE,
  operatorManualChapters,
  operatorManualTocEntries,
} from "@/lib/operator-manual-content";

const NAVY: [number, number, number] = [26, 42, 108];
const NAVY_DARK: [number, number, number] = [18, 26, 58];
const GOLD: [number, number, number] = [232, 213, 181];
const MUTED: [number, number, number] = [90, 99, 114];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FOOTER_Y = PAGE_H - 10;

function seoulDateLabel(): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function setFont(
  doc: jsPDF,
  fam: string,
  style: "normal" | "bold",
  size: number,
) {
  const s = style === "bold" ? "bold" : "normal";
  try {
    doc.setFont(fam, s);
  } catch {
    doc.setFont(fam, "normal");
  }
  doc.setFontSize(size);
}

function guessImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

function drawPageNumber(doc: jsPDF, page: number, total: number) {
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.text(
    `${page} / ${total}`,
    PAGE_W - MARGIN_X,
    FOOTER_Y,
    { align: "right" },
  );
}

function drawCover(doc: jsPDF, fam: string, logoDataUrl: string | null) {
  doc.setFillColor(...NAVY_DARK);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_X, 52, PAGE_W - MARGIN_X, 52);

  if (logoDataUrl) {
    try {
      const fmt = guessImageFormat(logoDataUrl);
      doc.addImage(logoDataUrl, fmt, MARGIN_X, 24, 36, 22);
    } catch {
      /* ignore */
    }
  }

  doc.setTextColor(...GOLD);
  setFont(doc, fam, "bold", 28);
  doc.text("THINKAD", MARGIN_X, logoDataUrl ? 62 : 40);

  setFont(doc, fam, "bold", 18);
  doc.setTextColor(255, 255, 255);
  let y = logoDataUrl ? 88 : 66;
  for (const line of doc.splitTextToSize(OPERATOR_MANUAL_TITLE, CONTENT_W)) {
    doc.text(line, MARGIN_X, y);
    y += 10;
  }

  y += 4;
  setFont(doc, fam, "normal", 11);
  doc.setTextColor(...GOLD);
  for (const line of doc.splitTextToSize(OPERATOR_MANUAL_SUBTITLE, CONTENT_W)) {
    doc.text(line, MARGIN_X, y);
    y += 7;
  }

  y = PAGE_H - 48;
  setFont(doc, fam, "normal", 9);
  doc.setTextColor(200, 210, 230);
  doc.text(`발행일: ${seoulDateLabel()} (KST)`, MARGIN_X, y);
  doc.text("내부 운영용 · 무단 배포 금지", MARGIN_X, y + 6);

  doc.setFillColor(...NAVY);
  doc.rect(0, PAGE_H - 18, PAGE_W, 18, "F");
  doc.setTextColor(...GOLD);
  setFont(doc, fam, "bold", 8);
  doc.text("THINKAD Admin Operations Manual", MARGIN_X, PAGE_H - 8);
}

function drawToc(doc: jsPDF, fam: string) {
  doc.setFillColor(248, 249, 252);
  doc.rect(0, 0, PAGE_W, 28, "F");
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_X, 28, PAGE_W - MARGIN_X, 28);

  setFont(doc, fam, "bold", 16);
  doc.setTextColor(...NAVY);
  doc.text("목차", MARGIN_X, 18);

  let y = 40;
  setFont(doc, fam, "normal", 10);
  for (const entry of operatorManualTocEntries()) {
    if (y > PAGE_H - 24) {
      doc.addPage();
      y = 28;
    }
    const indent = entry.level === 1 ? 0 : 6;
    doc.setTextColor(...(entry.level === 1 ? NAVY : MUTED));
    setFont(doc, fam, entry.level === 1 ? "bold" : "normal", 10);
    doc.text(entry.label, MARGIN_X + indent, y);
    y += entry.level === 1 ? 8 : 6;
  }
}

function writeWrapped(
  doc: jsPDF,
  fam: string,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
): number {
  setFont(doc, fam, "normal", 10);
  doc.setTextColor(40, 44, 52);
  for (const line of doc.splitTextToSize(text, maxW)) {
    if (y > PAGE_H - 22) {
      doc.addPage();
      y = 28;
    }
    doc.text(line, x, y);
    y += lineH;
  }
  return y;
}

function drawChapterSection(doc: jsPDF, fam: string) {
  for (const chapter of operatorManualChapters) {
    doc.addPage();
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE_W, 22, "F");
    setFont(doc, fam, "bold", 13);
    doc.setTextColor(...GOLD);
    doc.text(chapter.title, MARGIN_X, 14);

    let y = 34;
    for (const sub of chapter.subsections) {
      if (y > PAGE_H - 30) {
        doc.addPage();
        y = 28;
      }

      setFont(doc, fam, "bold", 12);
      doc.setTextColor(...NAVY);
      for (const line of doc.splitTextToSize(sub.title, CONTENT_W)) {
        if (y > PAGE_H - 24) {
          doc.addPage();
          y = 28;
        }
        doc.text(line, MARGIN_X, y);
        y += 7;
      }
      y += 2;

      for (const bullet of sub.bullets) {
        y = writeWrapped(
          doc,
          fam,
          `• ${bullet.text}`,
          MARGIN_X + 2,
          y,
          CONTENT_W - 4,
          5.5,
        );
        y += 1.5;
      }
      y += 6;
    }
  }
}

function drawAllPageNumbers(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    drawPageNumber(doc, p, total);
  }
}

export async function buildOperatorManualPdfBuffer(): Promise<Buffer> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const hasKr = await ensureKrFontForServerPdf(doc);
  const fam = krFontFamily(hasKr);
  const logoDataUrl = loadThinkadLogoDataUrl();

  drawCover(doc, fam, logoDataUrl);
  doc.addPage();
  drawToc(doc, fam);
  drawChapterSection(doc, fam);
  drawAllPageNumbers(doc);

  return Buffer.from(doc.output("arraybuffer"));
}
