import { plannerChartColorRgb } from "@/lib/planner-chart-colors";
import { formatPlannerSharePct } from "@/lib/planner-logic";
import type { PlannerPerformanceGuide } from "@/lib/planner-report-performance-guide";
import type { PlannerExportChartDatum } from "@/lib/planner-report-export/types";

export const INK = [17, 24, 39] as const;
export const GRAY_600 = [75, 85, 99] as const;
export const GRAY_500 = [107, 114, 128] as const;
export const GRAY_200 = [228, 230, 236] as const;
export const GRAY_50 = [248, 249, 251] as const;
export const GRAY_100 = [238, 240, 244] as const;
export const WHITE = [255, 255, 255] as const;
export const BAR_TRACK = [243, 244, 246] as const;
/** qp 각진 카드 — roundedRect radius mm (견적 PDF와 동일) */
export const R = 0;

export type PdfDrawPrimitivesContext = {
  doc: import("jspdf").jsPDF;
  font: string;
  pageW: number;
  pageH: number;
  contentW: number;
  marginMm: number;
  isKo: boolean;
  accentRgb: readonly number[];
  accentSoftRgb: readonly number[];
  inkRgb: readonly number[];
  wordmarkOnDark: boolean;
  pageBottomReserveMm: number;
  footerYm: number;
  setFill: (c: readonly number[]) => void;
  setText: (c: readonly number[]) => void;
  setDraw: (c: readonly number[]) => void;
  getY: () => number;
  setY: (y: number) => void;
};

function fmtImp(n: number, isKo: boolean): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

export function createPdfDrawPrimitives(ctx: PdfDrawPrimitivesContext) {
  const {
    doc,
    font: FONT,
    pageW,
    pageH,
    contentW,
    marginMm: M,
    isKo,
    accentRgb: QP_ACCENT,
    accentSoftRgb: QP_ACCENT_SOFT,
    inkRgb: QP_INK,
    wordmarkOnDark,
    pageBottomReserveMm,
    footerYm,
    setFill,
    setText,
    getY,
    setY,
  } = ctx;

  /** 페이지 하단을 넘기면 새 페이지로 — need: 다음 블록 높이(mm) */
  function ensure(need: number) {
    const y = getY();
    if (y + need > pageH - pageBottomReserveMm) {
      doc.addPage();
      setY(M);
    }
  }

  function footer() {
    const pages = doc.getNumberOfPages();
    // 표지(1p) 제외, 본문 페이지에만 푸터.
    for (let i = 2; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont(FONT, "normal");
      doc.setFontSize(7);
      setText(GRAY_500);
      doc.text("THINKAD CAMPAIGN PLANNER", M, pageH - footerYm);
      doc.text(`${i - 1} / ${pages - 1}`, pageW - M, pageH - footerYm, {
        align: "right",
      });
    }
  }

  function sectionTitle(label: string, followingBlockMm = 0) {
    ensure(14 + followingBlockMm);
    const y = getY();
    doc.setFont(FONT, "normal");
    doc.setFontSize(11);
    setFill(QP_ACCENT);
    doc.rect(M, y, 1.6, 5.2, "F");
    setText(INK);
    doc.text(label, M + 4, y + 4.6);
    setY(y + 9);
  }

  /** THINKAD 워드마크 */
  function drawWordmark(x: number, baseY: number, size: number) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(size);
    if (wordmarkOnDark) {
      doc.setTextColor(255, 255, 255);
      doc.text("THINK", x, baseY);
      const w = doc.getTextWidth("THINK");
      setText(QP_ACCENT);
      doc.text("AD", x + w, baseY);
    } else {
      setText(QP_INK);
      doc.text("THINK", x, baseY);
      const w = doc.getTextWidth("THINK");
      setText(QP_ACCENT);
      doc.text("AD", x + w, baseY);
    }
  }

  /** 도넛 차트 (삼각형 팬 + 중앙 흰 원) */
  function drawDonut(
    cx: number,
    cy: number,
    rOut: number,
    rIn: number,
    segs: { label: string; value: number; colorKey?: string }[],
  ) {
    const total = segs.reduce((s, d) => s + d.value, 0);
    if (total <= 0) return;
    let a0 = -Math.PI / 2;
    segs.forEach((seg, i) => {
      const a1 = a0 + (seg.value / total) * 2 * Math.PI;
      const c = plannerChartColorRgb(seg.colorKey, i);
      doc.setFillColor(c[0]!, c[1]!, c[2]!);
      const steps = Math.max(2, Math.ceil((a1 - a0) / 0.1));
      for (let s = 0; s < steps; s++) {
        const t0 = a0 + ((a1 - a0) * s) / steps;
        const t1 = a0 + ((a1 - a0) * (s + 1)) / steps;
        doc.triangle(
          cx,
          cy,
          cx + rOut * Math.cos(t0),
          cy + rOut * Math.sin(t0),
          cx + rOut * Math.cos(t1),
          cy + rOut * Math.sin(t1),
          "F",
        );
      }
      a0 = a1;
    });
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, rIn, "F");
  }

  /** 가로 막대 — 비중(%) 표시 */
  function drawShareBars(x: number, w: number, rows: PlannerExportChartDatum[]) {
    const labelW = 30;
    const valW = 20;
    const barX = x + labelW;
    const barW = w - labelW - valW;
    rows.forEach((row, i) => {
      ensure(7);
      let y = getY();
      const pct = row.pct ?? 0;
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      setText(GRAY_600);
      doc.text(
        (doc.splitTextToSize(row.label, labelW - 2) as string[]).slice(0, 1),
        x,
        y + 3,
      );
      doc.setFillColor(GRAY_100[0], GRAY_100[1], GRAY_100[2]);
      doc.roundedRect(barX, y, barW, 3.2, R, R, "F");
      const barRgb = plannerChartColorRgb(row.colorKey, i);
      doc.setFillColor(barRgb[0]!, barRgb[1]!, barRgb[2]!);
      doc.roundedRect(barX, y, Math.max(2, (barW * pct) / 100), 3.2, R, R, "F");
      setText(INK);
      doc.text(formatPlannerSharePct(pct), x + w, y + 3, { align: "right" });
      setY(y + 7);
    });
  }

  /** 가로 막대 차트 */
  function drawBars(
    x: number,
    w: number,
    rows: { label: string; value: number; colorKey?: string }[],
    color: readonly number[],
    perRowColor = false,
  ) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    const labelW = 30;
    const valW = 26;
    const barX = x + labelW;
    const barW = w - labelW - valW;
    rows.forEach((row, i) => {
      ensure(7);
      let y = getY();
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      setText(GRAY_600);
      doc.text(
        (doc.splitTextToSize(row.label, labelW - 2) as string[]).slice(0, 1),
        x,
        y + 3,
      );
      doc.setFillColor(GRAY_100[0], GRAY_100[1], GRAY_100[2]);
      doc.roundedRect(barX, y, barW, 3.2, R, R, "F");
      const barRgb = perRowColor ? plannerChartColorRgb(row.colorKey, i) : color;
      doc.setFillColor(barRgb[0]!, barRgb[1]!, barRgb[2]!);
      doc.roundedRect(barX, y, Math.max(2, (barW * row.value) / max), 3.2, R, R, "F");
      setText(INK);
      doc.text(fmtImp(row.value, isKo), x + w, y + 3, { align: "right" });
      setY(y + 7);
    });
  }

  function drawPerformanceGuide(guide: PlannerPerformanceGuide) {
    const colCount = guide.table.headers.length;
    const labelColW = 34;
    const dataColW = (contentW - labelColW) / Math.max(1, colCount - 1);
    const rowH = 6.5;

    ensure(10 + guide.bullets.length * 8);
    doc.setFont(FONT, "bold");
    doc.setFontSize(9);
    setText(QP_ACCENT);
    doc.text(guide.title, M, getY() + 3);
    setY(getY() + 7);

    setFill(QP_ACCENT_SOFT);
    doc.roundedRect(
      M,
      getY(),
      contentW,
      rowH + guide.table.rows.length * rowH + 2,
      R,
      R,
      "F",
    );

    doc.setFont(FONT, "bold");
    doc.setFontSize(7.5);
    setText(QP_ACCENT);
    guide.table.headers.forEach((h, i) => {
      const x = i === 0 ? M + 2 : M + labelColW + (i - 1) * dataColW + 1;
      const w = i === 0 ? labelColW - 2 : dataColW - 2;
      doc.text(h, x, getY() + 4.5, { maxWidth: w });
    });
    setY(getY() + rowH);

    doc.setFont(FONT, "normal");
    guide.table.rows.forEach((row) => {
      setText(GRAY_600);
      doc.text(row.label, M + 2, getY() + 4.5, { maxWidth: labelColW - 3 });
      row.cells.forEach((cell, i) => {
        setText(INK);
        doc.setFont(FONT, "bold");
        doc.text(cell, M + labelColW + i * dataColW + 1, getY() + 4.5, {
          maxWidth: dataColW - 2,
        });
        doc.setFont(FONT, "normal");
      });
      setY(getY() + rowH);
    });
    setY(getY() + 5);

    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    setText(GRAY_600);
    for (const line of guide.bullets) {
      const wrapped = doc.splitTextToSize(`• ${line}`, contentW - 4) as string[];
      ensure(wrapped.length * 4.5 + 2);
      doc.text(wrapped, M + 2, getY() + 3);
      setY(getY() + wrapped.length * 4.2 + 1.5);
    }
    setY(getY() + 3);
  }

  return {
    getY,
    setY,
    ensure,
    footer,
    sectionTitle,
    drawWordmark,
    drawDonut,
    drawShareBars,
    drawBars,
    drawPerformanceGuide,
  };
}
