import type { jsPDF } from "jspdf";
import type {
  BuildCampaignCompletionPdfParams,
  CompletionPdfProof,
} from "@/lib/build-campaign-completion-pdf";
import { fetchImageAsDataUrl } from "@/lib/campaign-report-image-fetch";

const C_BLACK: [number, number, number] = [0, 0, 0];
const C_ACCENT: [number, number, number] = [255, 102, 0];
const C_GRAY: [number, number, number] = [115, 115, 115];
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 22;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

function setColor(
  doc: jsPDF,
  kind: "fill" | "text" | "draw",
  rgb: [number, number, number],
) {
  if (kind === "fill") doc.setFillColor(...rgb);
  else if (kind === "text") doc.setTextColor(...rgb);
  else doc.setDrawColor(...rgb);
}

function monoLabel(
  doc: jsPDF,
  fam: string,
  text: string,
  x: number,
  y: number,
  size: number,
  color: [number, number, number],
) {
  doc.setFont(fam, "normal");
  doc.setFontSize(size);
  setColor(doc, "text", color);
  doc.text(text, x, y);
}

export async function enrichProofPhotosWithImages(
  photos: CompletionPdfProof[],
): Promise<CompletionPdfProof[]> {
  return Promise.all(
    photos.slice(0, 12).map(async (ph) => ({
      ...ph,
      imageData: await fetchImageAsDataUrl(ph.imageUrl),
    })),
  );
}

export function drawReportExtrasInBody(
  doc: jsPDF,
  fam: string,
  hasKrFont: boolean,
  p: BuildCampaignCompletionPdfParams,
  ctx: {
    y: number;
    pageBottom: number;
    writeSectionHeader: (label: string, y: number) => number;
    ensureSpace: (need: number) => void;
  },
): number {
  let { y } = ctx;
  const { ensureSpace, writeSectionHeader } = ctx;

  const gallery = p.proofPhotos.filter((ph) => ph.imageData?.dataUrl);
  if (gallery.length > 0) {
    ensureSpace(20);
    y = writeSectionHeader("집행 인증 사진", y);
    const cols = 2;
    const cellW = (CONTENT_W - 4) / cols;
    const cellH = 52;
    let col = 0;
    let rowY = y;
    for (let i = 0; i < Math.min(gallery.length, 8); i++) {
      const ph = gallery[i];
      if (!ph.imageData) continue;
      if (col === 0) {
        ensureSpace(cellH + 14);
        rowY = y;
      }
      const cx = MARGIN_X + col * (cellW + 4);
      setColor(doc, "draw", C_BLACK);
      doc.setLineWidth(0.5);
      doc.rect(cx, rowY, cellW, cellH, "S");
      try {
        doc.addImage(
          ph.imageData.dataUrl,
          ph.imageData.format,
          cx + 1,
          rowY + 1,
          cellW - 2,
          cellH - 12,
          undefined,
          "FAST",
        );
      } catch {
        doc.setFont(fam, "normal");
        doc.setFontSize(7);
        setColor(doc, "text", C_GRAY);
        doc.text("이미지 로드 실패", cx + 2, rowY + cellH / 2);
      }
      doc.setFont(fam, "normal");
      doc.setFontSize(6.5);
      setColor(doc, "text", C_GRAY);
      doc.text((ph.caption ?? "").slice(0, 40) || `Photo ${i + 1}`, cx + 2, rowY + cellH - 4);
      col += 1;
      if (col >= cols) {
        col = 0;
        y = rowY + cellH + 6;
      }
    }
    if (col > 0) y = rowY + cellH + 8;
  }

  const dailySeries = p.metricsOverride?.dailyImpressions ?? [];
  const weeklySeries = p.metricsOverride?.weeklyImpressions ?? [];
  if (dailySeries.length >= 2 || weeklySeries.length >= 2) {
    ensureSpace(58);
    y = writeSectionHeader("성과 추이 (일별 · 주별)", y);
    const chartH = 36;
    const halfW = (CONTENT_W - 4) / 2;
    const drawSeries = (title: string, values: number[], x: number) => {
      setColor(doc, "draw", C_BLACK);
      doc.setLineWidth(0.5);
      doc.rect(x, y, halfW, chartH, "S");
      monoLabel(doc, fam, title, x + 3, y + 7, 7, C_ACCENT);
      const max = Math.max(...values, 1);
      const innerW = halfW - 8;
      const innerH = chartH - 14;
      const n = values.length;
      const step = innerW / Math.max(n - 1, 1);
      setColor(doc, "draw", C_ACCENT);
      doc.setLineWidth(0.8);
      for (let i = 0; i < n - 1; i++) {
        const x1 = x + 4 + i * step;
        const y1 = y + chartH - 4 - (values[i] / max) * innerH;
        const x2 = x + 4 + (i + 1) * step;
        const y2 = y + chartH - 4 - (values[i + 1] / max) * innerH;
        doc.line(x1, y1, x2, y2);
      }
    };
    if (dailySeries.length >= 2) drawSeries("일별 노출", dailySeries, MARGIN_X);
    if (weeklySeries.length >= 2) {
      drawSeries("주별 노출", weeklySeries, MARGIN_X + halfW + 4);
    }
    y += chartH + 10;
  }

  if (p.nextCampaignProposal?.trim()) {
    ensureSpace(24);
    y = writeSectionHeader("다음 캠페인 제안", y);
    doc.setFont(fam, "normal");
    doc.setFontSize(9.5);
    setColor(doc, "text", C_BLACK);
    for (const line of doc.splitTextToSize(p.nextCampaignProposal.trim(), CONTENT_W)) {
      ensureSpace(5.5);
      doc.text(line, MARGIN_X, y);
      y += 5.5;
    }
    y += 8;
  }

  return y;
}

export function applyCoverBrandExtras(
  doc: jsPDF,
  fam: string,
  p: BuildCampaignCompletionPdfParams,
  titleY: number,
): void {
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  setColor(doc, "text", C_ACCENT);
  doc.text(
    `FOR · ${p.brandDisplayName || p.clientCompany || "—"}`,
    MARGIN_X,
    Math.max(titleY + 6, 130),
  );
  if (p.accountManager?.trim()) {
    doc.setFont(fam, "normal");
    doc.setFontSize(10);
    setColor(doc, "text", [220, 220, 220]);
    doc.text(`담당 · ${p.accountManager.trim()}`, MARGIN_X, Math.max(titleY + 14, 138));
  }
}
