import { ensureKrFontForServerPdf, krFontFamily } from "@/lib/jspdf-register-noto-kr";
import { CONTACT_EMAIL } from "@/lib/constants";
import {
  addPdfThumbImage,
  PLANNER_EXPORT_THUMB_BOX_MM,
  loadExportThumbMap,
  loadExportImageForPdf,
  dataUrlImageFormat,
} from "@/lib/export-media-images";
import type {
  PlannerExportMediaRow,
  PlannerReportExportAssets,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import {
  plannerMediaPageButtonLabel,
  plannerMediaPageUrl,
} from "@/lib/planner-report-export/media-page-url";
import { addPdfMediaDetailLink, addPdfRectLink } from "@/lib/planner-report-export/draw-media-link";
import { plannerChartColorRgb } from "@/lib/planner-chart-colors";
import { formatPlannerSharePct } from "@/lib/planner-logic";
import { formatExportBudgetWonLabel } from "@/lib/planner-report-export/format-export-money";
import type { PlannerPerformanceGuide } from "@/lib/planner-report-performance-guide";
import type { PlannerExportChartDatum } from "@/lib/planner-report-export/types";
import {
  filterExportSections,
  sectionVisible,
} from "@/lib/planner-report-export/section-visibility";
import { splitReportCopyParagraphs } from "@/lib/planner-report-export/report-copy";
import {
  collectMediaCardSpecs,
  exportMediaLineMetaParts,
  showMediaCardContributions,
  type MediaCardSpec,
} from "@/lib/planner-report-export/media-card-layout";
import { buildPortfolioLineupSegments } from "@/lib/planner-report-export/lineup-segments";
import {
  EXPORT_BADGE_PDF,
  exportBadgeBracketLabel,
} from "@/lib/planner-report-export/export-badge";
import type { PlannerExportKpi } from "@/lib/planner-report-export/types";
import { BRAND_ACCENT_RGB } from "@/lib/brand-palette";

/**
 * 플래너 보고서 PDF — 서버에서 jsPDF 로 직접 그린다 (벡터 텍스트, 한글 폰트 내장).
 * 견적서 PDF(`build-korean-quote-pdf.ts`)와 동일한 서버 생성 패턴.
 */

/** Quiet Professional — 흑백 + 브랜드 액센트 1종 (lib/brand-palette.ts) */
const QP_ACCENT = BRAND_ACCENT_RGB;
const QP_ACCENT_SOFT = [255, 243, 232] as const;
/** 주황 커버·배너 위 보조 텍스트 (구 라벤더 대체) */
const QP_ON_ACCENT_MUTED = [255, 236, 220] as const;
const QP_INK = [28, 28, 31] as const;
const INK = [17, 24, 39] as const;
const GRAY_600 = [75, 85, 99] as const;
const GRAY_500 = [107, 114, 128] as const;
const GRAY_200 = [228, 230, 236] as const;
const GRAY_50 = [248, 249, 251] as const;
const GRAY_100 = [238, 240, 244] as const;
const WHITE = [255, 255, 255] as const;
const BAR_TRACK = [243, 244, 246] as const;
/** qp 각진 카드 — roundedRect radius mm (견적 PDF와 동일) */
const R = 0;

/** PR3 균형안 — 여백·타이포·카드 레이아웃 (미세조정은 이 객체만 수정) */
export const PDF_LAYOUT = {
  marginMm: 13,
  pageBottomReserveMm: 16,
  footerYm: 8,

  summaryLabelPt: 8.5,
  summaryValuePt: 11,
  summaryRowHmm: 13,

  kpiLabelPt: 8,
  kpiValuePt: 12,
  kpiCardHmm: 16,

  detailPadMm: 3,
  detailCardGapMm: 4,
  detailNamePt: 10.5,
  detailBodyPt: 8.5,
  detailSpecPt: 8,
  detailPriceLabelPt: 7,
  detailPriceValuePt: 8.5,
  detailReasonPt: 8.5,
  detailBlockMm: 30,

  cardCols: 2,
  cardGapMm: 3,
  cardPadMm: 2,
  cardThumbMaxMm: 28,
  cardTextBlockMm: 18,
  cardNamePt: 9,
  cardMetaPt: 8,
  cardPricePt: 8.5,
  cardLinkPt: 6.5,
  cardNameLineHmm: 3.6,

  compactGapMm: 2.5,
  compactRowHmm: 11,
  compactThumbMm: 7,
  compactNamePt: 8.5,
  compactMetaPt: 7.5,

  regionHeaderMm: 8.5,
  regionHeaderPt: 11,
  categoryHeaderMm: 6.5,
  categoryHeaderPt: 7.5,
  groupSegmentTrailingMm: 2,
} as const;

const M = PDF_LAYOUT.marginMm;

function drawKpiBadge(
  doc: import("jspdf").jsPDF,
  k: PlannerExportKpi,
  x: number,
  y: number,
  maxW: number,
  isKo: boolean,
): void {
  const colors = EXPORT_BADGE_PDF[k.badge];
  const label = exportBadgeBracketLabel(k.badge, isKo);
  const labelW = Math.min(maxW - 2, doc.getTextWidth(label) + 3);
  const h = 3.2;
  doc.setFillColor(colors.fill);
  doc.setDrawColor(colors.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, labelW, h, 0.4, 0.4, "FD");
  doc.setFontSize(6);
  doc.setTextColor(colors.text);
  doc.text(label, x + 1.2, y + 2.2);
}

function fmtImp(n: number, isKo: boolean): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

export async function buildPlannerReportPdf(
  p: PlannerReportExportPayload,
  assets?: PlannerReportExportAssets,
): Promise<Uint8Array> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const vis = assets?.sectionVisibility;
  const exportSections = filterExportSections(p.sections, vis);
  const lineupViewMode = assets?.lineupViewMode ?? "detail";
  const hasKr = await ensureKrFontForServerPdf(doc);
  const FONT = krFontFamily(hasKr);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - M * 2;
  const isKo = p.isKo;

  const setFill = (c: readonly number[]) => doc.setFillColor(c[0]!, c[1]!, c[2]!);
  const setText = (c: readonly number[]) => doc.setTextColor(c[0]!, c[1]!, c[2]!);
  const setDraw = (c: readonly number[]) => doc.setDrawColor(c[0]!, c[1]!, c[2]!);

  let y = 0;

  /** 페이지 하단을 넘기면 새 페이지로 — need: 다음 블록 높이(mm) */
  function ensure(need: number) {
    if (y + need > pageH - PDF_LAYOUT.pageBottomReserveMm) {
      doc.addPage();
      y = M;
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
      doc.text("THINKAD CAMPAIGN PLANNER", M, pageH - PDF_LAYOUT.footerYm);
      doc.text(`${i - 1} / ${pages - 1}`, pageW - M, pageH - PDF_LAYOUT.footerYm, {
        align: "right",
      });
    }
  }

  function sectionTitle(label: string, followingBlockMm = 0) {
    ensure(14 + followingBlockMm);
    doc.setFont(FONT, "normal");
    doc.setFontSize(11);
    setFill(QP_ACCENT);
    doc.rect(M, y, 1.6, 5.2, "F");
    setText(INK);
    doc.text(label, M + 4, y + 4.6);
    y += 9;
  }

  /** THINKAD 워드마크 (THINK·AD 흰색 — 주황 커버/배너 위) */
  function drawWordmark(x: number, baseY: number, size: number) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(size);
    doc.setTextColor(255, 255, 255);
    doc.text("THINK", x, baseY);
    const w = doc.getTextWidth("THINK");
    setText(WHITE);
    doc.text("AD", x + w, baseY);
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
  function drawShareBars(
    x: number,
    w: number,
    rows: PlannerExportChartDatum[],
  ) {
    const labelW = 30;
    const valW = 20;
    const barX = x + labelW;
    const barW = w - labelW - valW;
    rows.forEach((row, i) => {
      ensure(7);
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
      y += 7;
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
      y += 7;
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
    doc.text(guide.title, M, y + 3);
    y += 7;

    setFill(QP_ACCENT_SOFT);
    doc.roundedRect(M, y, contentW, rowH + guide.table.rows.length * rowH + 2, R, R, "F");

    doc.setFont(FONT, "bold");
    doc.setFontSize(7.5);
    setText(QP_ACCENT);
    guide.table.headers.forEach((h, i) => {
      const x =
        i === 0 ? M + 2 : M + labelColW + (i - 1) * dataColW + 1;
      const w = i === 0 ? labelColW - 2 : dataColW - 2;
      doc.text(h, x, y + 4.5, { maxWidth: w });
    });
    y += rowH;

    doc.setFont(FONT, "normal");
    guide.table.rows.forEach((row) => {
      setText(GRAY_600);
      doc.text(row.label, M + 2, y + 4.5, { maxWidth: labelColW - 3 });
      row.cells.forEach((cell, i) => {
        setText(INK);
        doc.setFont(FONT, "bold");
        doc.text(cell, M + labelColW + i * dataColW + 1, y + 4.5, {
          maxWidth: dataColW - 2,
        });
        doc.setFont(FONT, "normal");
      });
      y += rowH;
    });
    y += 5;

    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    setText(GRAY_600);
    for (const line of guide.bullets) {
      const wrapped = doc.splitTextToSize(`• ${line}`, contentW - 4) as string[];
      ensure(wrapped.length * 4.5 + 2);
      doc.text(wrapped, M + 2, y + 3);
      y += wrapped.length * 4.2 + 1.5;
    }
    y += 3;
  }

  const subtitle =
    p.kind === "integrated"
      ? isKo
        ? "OOH + 디지털 통합 캠페인 제안서"
        : "OOH + Digital integrated campaign"
      : isKo
        ? "OOH 미디어 캠페인 플랜"
        : "OOH media campaign plan";

  const coverLogoData = p.coverLogoUrl?.trim()
    ? await loadExportImageForPdf(p.coverLogoUrl.trim(), {
        width: 256,
        height: 256,
        quality: 88,
      })
    : null;

  // ── 표지 페이지 ──
  // 배경은 화면 미리보기(DocumentGradientHero, bg-[#1c1c1f])와 통일한다.
  // QP_INK 가 정확히 #1c1c1f 라 두 상수의 역할만 맞바꾼다 — 배경=INK, 액센트 줄=ACCENT.
  setFill(QP_INK);
  doc.rect(0, 0, pageW, pageH, "F");
  setFill(QP_ACCENT);
  doc.rect(0, 0, pageW, 3, "F");

  drawWordmark(M, 50, 26);
  if (coverLogoData) {
    const logoSize = 28;
    try {
      doc.addImage(
        coverLogoData,
        dataUrlImageFormat(coverLogoData),
        pageW - M - logoSize,
        22,
        logoSize,
        logoSize,
      );
    } catch {
      /* broken logo */
    }
  }
  doc.setFont(FONT, "normal");
  setText(QP_ON_ACCENT_MUTED);
  doc.setFontSize(10);
  doc.text("CAMPAIGN PLANNER", M, 58);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  const titleLines = doc.splitTextToSize(p.documentTitle, contentW) as string[];
  doc.text(titleLines, M, 92);

  // 화면의 <div className="mt-5 h-1 w-16 bg-[color:var(--qp-accent)]" /> 와 대응.
  // 배경이 QP_INK 가 됐으니 이 룰도 QP_ACCENT 로 바꿔야 보인다(안 바꾸면 검정 위 검정).
  setFill(QP_ACCENT);
  doc.rect(M, 92 + titleLines.length * 11, 28, 1.6, "F");

  doc.setFontSize(13);
  setText(QP_ON_ACCENT_MUTED);
  doc.text(subtitle, M, 104 + titleLines.length * 11);

  if (p.clientName) {
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${p.clientName} ${isKo ? "귀중" : ""}`.trim(),
      M,
      pageH - 40,
    );
  }
  doc.setFontSize(10);
  setText(QP_ON_ACCENT_MUTED);
  doc.text(p.generatedAt, M, pageH - 28);
  doc.text(
    `THINKAD (싱커드)   ·   ${CONTACT_EMAIL}   ·   02-515-2772`,
    M,
    pageH - 21,
  );

  doc.addPage();
  y = 0;

  // ── 본문 헤더 배너 (slim) ──
  setFill(QP_ACCENT);
  doc.rect(0, 0, pageW, 26, "F");
  setFill(QP_INK);
  doc.rect(0, 26, pageW, 1.4, "F");

  drawWordmark(M, 11, 12);
  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  setText(QP_ON_ACCENT_MUTED);
  const headSub = [p.clientName, p.campaignName].filter(Boolean).join("  ·  ");
  if (headSub) doc.text(headSub, M, 19);
  setText(QP_ON_ACCENT_MUTED);
  doc.text(p.generatedAt, pageW - M, 11, { align: "right" });
  setText(QP_ON_ACCENT_MUTED);
  doc.text(p.documentTitle, pageW - M, 19, { align: "right" });

  y = 38;

  // ── 캠페인 요약 (라벨/값 2열) ──
  const summary: Array<[string, string]> = [
    [isKo ? "캠페인 목표" : "Goal", p.goalTitle || "—"],
    [
      isKo ? "총 예산" : "Total budget",
      p.budgetHonesty?.coverValue ??
        (isKo
          ? `${p.budgetMan.toLocaleString()}만원`
          : `${p.budgetMan.toLocaleString()}M KRW`),
    ],
    [isKo ? "집행 기간" : "Flight", p.periodDisplay || "—"],
    [isKo ? "지역" : "Regions", p.regionsText || "—"],
    [isKo ? "매체 유형" : "Media types", p.categoriesText || "—"],
    [isKo ? "타깃 연령" : "Target age", p.ageText || "—"],
    [isKo ? "업종" : "Industry", p.industryText || "—"],
  ];
  const colW = contentW / 2;
  const rowH = PDF_LAYOUT.summaryRowHmm;
  const budgetRowH = p.budgetHonesty ? 18 : rowH;
  summary.forEach(([label, value], i) => {
    const col = i % 2;
    const x = M + col * colW;
    const thisRowH = i <= 1 ? budgetRowH : rowH;
    if (col === 0) ensure(thisRowH);
    doc.setFont(FONT, "normal");
    doc.setFontSize(PDF_LAYOUT.summaryLabelPt);
    setText(GRAY_500);
    doc.text(label, x, y + 4);
    setText(INK);
    doc.setFontSize(PDF_LAYOUT.summaryValuePt);
    const lines = doc.splitTextToSize(value, colW - 4) as string[];
    const maxLines = i === 1 && p.budgetHonesty ? 3 : 2;
    doc.text(lines.slice(0, maxLines), x, y + 9);
    if (col === 1 || i === summary.length - 1) y += thisRowH;
  });

  y += 2;
  setDraw(GRAY_200);
  doc.setLineWidth(0.3);
  doc.line(M, y, pageW - M, y);
  y += 8;

  const drawCopyParagraphs = (paragraphs: readonly string[]) => {
    for (const para of paragraphs) {
      const lines = doc.splitTextToSize(para, contentW) as string[];
      ensure(lines.length * 4.6 + 2);
      doc.setFont(FONT, "normal");
      doc.setFontSize(9);
      setText(INK);
      doc.text(lines, M, y);
      y += lines.length * 4.6 + 2;
    }
    y += 2;
  };

  if (p.greetingText?.trim()) {
    sectionTitle(isKo ? "인사말" : "Greeting");
    drawCopyParagraphs(splitReportCopyParagraphs(p.greetingText));
  }
  if (p.executiveSummaryLines && p.executiveSummaryLines.length > 0) {
    sectionTitle(isKo ? "전략 요약" : "Strategy summary");
    drawCopyParagraphs(p.executiveSummaryLines);
  }

  // ── KPI 카드 행 ──
  if (p.kpis.length) {
    ensure(20);
    const kpis = p.kpis.slice(0, 4);
    const kW = contentW / kpis.length;
    kpis.forEach((k, i) => {
      const x = M + kW * i;
      setFill(GRAY_50);
      doc.roundedRect(x + 1, y, kW - 2, PDF_LAYOUT.kpiCardHmm, R, R, "F");
      doc.setFont(FONT, "normal");
      doc.setFontSize(PDF_LAYOUT.kpiLabelPt);
      setText(GRAY_500);
      doc.text(k.label, x + 4, y + 5.5);
      if (k.status === "pending") {
        setText(GRAY_500);
        doc.setFontSize(8);
        doc.text("—", x + 4, y + 11);
        drawKpiBadge(doc, k, x + 4, y + 12.5, kW - 7, isKo);
        if (k.pendingHint) {
          doc.setFontSize(6);
          setText(GRAY_500);
          const hintLines = doc.splitTextToSize(k.pendingHint, kW - 7) as string[];
          doc.text(hintLines.slice(0, 2), x + 4, y + 17.5);
        }
      } else {
        setText(QP_ACCENT);
        doc.setFontSize(PDF_LAYOUT.kpiValuePt);
        const vLines = doc.splitTextToSize(k.value, kW - 7) as string[];
        doc.text(vLines.slice(0, 1), x + 4, y + 11);
        drawKpiBadge(doc, k, x + 4, y + 13.5, kW - 7, isKo);
      }
    });
    y += 26;

    if (p.cpmFootnote) {
      const cpmLines = doc.splitTextToSize(p.cpmFootnote, contentW) as string[];
      ensure(cpmLines.length * 4 + 4);
      doc.setFont(FONT, "normal");
      doc.setFontSize(7.5);
      setText(GRAY_500);
      doc.text(cpmLines, M, y + 2);
      y += cpmLines.length * 4 + 4;
    }

    if (p.budgetHonesty?.overBudgetBanner) {
      const banner = p.budgetHonesty.overBudgetBanner;
      const bannerLines = doc.splitTextToSize(banner, contentW - 8) as string[];
      const bannerH = Math.max(10, 6 + bannerLines.length * 4);
      ensure(bannerH + 4);
      setFill([254, 226, 226]);
      setDraw([252, 165, 165]);
      doc.setLineWidth(0.3);
      doc.roundedRect(M, y, contentW, bannerH, R, R, "FD");
      doc.setFont(FONT, "normal");
      doc.setFontSize(8.5);
      setText([185, 28, 28]);
      doc.text(bannerLines, M + 3, y + 5);
      y += bannerH + 6;
    }
  }

  if (p.quoteSummary) {
    const qs = p.quoteSummary;
    const fmtAmt = (won: number) => formatExportBudgetWonLabel(won, isKo);
    const quoteRows: [string, string, boolean][] = [
      [
        isKo ? "매체비 (확정)" : "Media fee (confirmed)",
        fmtAmt(qs.supplyWon),
        false,
      ],
      [
        isKo ? "제작비" : "Production",
        qs.productionWon > 0 ? fmtAmt(qs.productionWon) : "—",
        false,
      ],
      [isKo ? "부가세 (10%)" : "VAT (10%)", fmtAmt(qs.vatWon), false],
    ];
    if (qs.quoteOnlyLine) {
      quoteRows.push([
        qs.quoteOnlyLine.label,
        qs.quoteOnlyLine.amountLabel,
        false,
      ]);
    }
    quoteRows.push([qs.totalLabel, fmtAmt(qs.totalWon), true]);

    sectionTitle(isKo ? "견적 요약" : "Quote summary");
    const rowH = 7;
    ensure(quoteRows.length * rowH + 8);
    quoteRows.forEach(([label, value, emphasis], i) => {
      const ry = y + i * rowH;
      if (emphasis) {
        setFill(GRAY_50);
        doc.rect(M, ry, contentW, rowH, "F");
      } else if (i > 0) {
        setDraw([229, 231, 235]);
        doc.setLineWidth(0.1);
        doc.line(M, ry, M + contentW, ry);
      }
      doc.setFont(FONT, emphasis ? "bold" : "normal");
      doc.setFontSize(9);
      setText(emphasis ? INK : GRAY_500);
      doc.text(label, M + 3, ry + 4.8);
      setText(emphasis ? QP_ACCENT : INK);
      doc.text(value, M + contentW - 3, ry + 4.8, { align: "right" });
    });
    y += quoteRows.length * rowH + 4;
    for (const note of qs.footnotes) {
      const noteLines = doc.splitTextToSize(`※ ${note}`, contentW) as string[];
      ensure(noteLines.length * 3.8 + 2);
      doc.setFont(FONT, "normal");
      doc.setFontSize(7);
      setText(GRAY_500);
      doc.text(noteLines, M, y);
      y += noteLines.length * 3.8 + 2;
    }
    y += 4;
  }

  // ── 성과 요약 차트 ──
  const ch = p.charts;
  if (
    sectionVisible(vis, "performance") &&
    ch &&
    ((ch.budgetSplit?.length ?? 0) > 0 ||
      (ch.browseBudgetSplit?.length ?? 0) > 0 ||
      (ch.cpmBars?.length ?? 0) > 0 ||
      (ch.reachSummary?.length ?? 0) > 0 ||
      Boolean(ch.performanceGuide))
  ) {
    sectionTitle(isKo ? "성과 요약" : "Performance summary");

    const hasTypeBudget = (ch.budgetSplit?.length ?? 0) > 0;
    const hasBrowseBudget = (ch.browseBudgetSplit?.length ?? 0) > 0;
    if (hasTypeBudget || hasBrowseBudget) {
      ensure(46);
      const halfW = contentW / 2 - 4;
      const drawBudgetDonut = (
        slices: NonNullable<typeof ch.budgetSplit>,
        title: string,
        colX: number,
      ) => {
        doc.setFontSize(8);
        setText(GRAY_500);
        doc.text(title, colX, y + 2);
        const cx = colX + 18;
        const cy = y + 24;
        drawDonut(cx, cy, 15, 8, slices);
        const total = slices.reduce((s, d) => s + d.value, 0) || 1;
        let ly = y + 10;
        slices.forEach((d, i) => {
          const c = plannerChartColorRgb(d.colorKey, i);
          doc.setFillColor(c[0]!, c[1]!, c[2]!);
          doc.rect(colX + halfW * 0.42, ly - 2.6, 2.5, 2.5, "F");
          setText(GRAY_600);
          doc.setFontSize(7.5);
          const label = (doc.splitTextToSize(d.label, halfW * 0.52) as string[])[0] ?? d.label;
          doc.text(
            `${label} ${formatPlannerSharePct(d.pct ?? (d.value / total) * 100)}`,
            colX + halfW * 0.42 + 4,
            ly,
          );
          ly += 5.5;
        });
      };
      if (hasTypeBudget && hasBrowseBudget) {
        drawBudgetDonut(
          ch.budgetSplit!,
          isKo ? "예산 배분 (유형별)" : "Budget by type",
          M,
        );
        drawBudgetDonut(
          ch.browseBudgetSplit!,
          isKo ? "예산 배분 (카테고리별)" : "Budget by category",
          M + contentW / 2,
        );
      } else if (hasTypeBudget) {
        drawBudgetDonut(
          ch.budgetSplit!,
          isKo ? "예산 배분 (유형별)" : "Budget by type",
          M,
        );
      } else if (hasBrowseBudget) {
        drawBudgetDonut(
          ch.browseBudgetSplit!,
          isKo ? "예산 배분 (카테고리별)" : "Budget by category",
          M,
        );
      }
      y += 48;
    }

    if (ch.reachSummary && ch.reachSummary.length) {
      ensure(6 + ch.reachSummary.length * 7);
      doc.setFontSize(8);
      setText(GRAY_500);
      doc.text(isKo ? "노출 요약" : "Impressions", M, y + 2);
      y += 5;
      drawBars(M, contentW, ch.reachSummary, QP_INK);
      y += 3;
      if (ch.impressionSplit && ch.impressionSplit.length) {
        ensure(6 + ch.impressionSplit.length * 7);
        doc.setFontSize(8);
        setText(GRAY_500);
        doc.text(
          isKo ? "유형별 노출 비중" : "Impression share by type",
          M,
          y + 2,
        );
        y += 5;
        drawShareBars(M, contentW, ch.impressionSplit);
        y += 3;
      }
    }

    if (ch.cpmBars && ch.cpmBars.length) {
      ensure(6 + ch.cpmBars.length * 7);
      doc.setFontSize(8);
      setText(GRAY_500);
      const cpmTitle = p.cpmExcludesQuoteOnly
        ? isKo
          ? "CPM 비교 (원) (문의 매체 제외)"
          : "CPM comparison (KRW, excl. inquiry)"
        : isKo
          ? "CPM 비교 (원)"
          : "CPM comparison (KRW)";
      doc.text(cpmTitle, M, y + 2);
      y += 5;
      drawBars(M, contentW, ch.cpmBars, QP_ACCENT, true);
      y += 3;
    }
    if (ch.performanceGuide) {
      drawPerformanceGuide(ch.performanceGuide);
    }
    y += 4;
  }

  if (
    sectionVisible(vis, "region") &&
    p.regionBreakdown &&
    p.regionBreakdown.length > 0
  ) {
    sectionTitle(isKo ? "지역별 예산 · 효과" : "Budget & impact by region");
    if (ch?.regionBudgetSplit && ch.regionBudgetSplit.length > 1) {
      ensure(46);
      doc.setFontSize(8);
      setText(GRAY_500);
      doc.text(isKo ? "지역별 예산 비중" : "Budget by region", M, y + 2);
      const cx = M + 22;
      const cy = y + 26;
      drawDonut(cx, cy, 18, 10, ch.regionBudgetSplit);
      y += 50;
    }
    if (ch?.regionImpressionSplit && ch.regionImpressionSplit.length > 1) {
      ensure(6 + ch.regionImpressionSplit.length * 7);
      doc.setFontSize(8);
      setText(GRAY_500);
      doc.text(isKo ? "지역별 노출 비중" : "Impressions by region", M, y + 2);
      y += 5;
      drawShareBars(M, contentW, ch.regionImpressionSplit);
      y += 3;
    }
    const cols = isKo
      ? ["지역", "매체", "월 예산", "월 노출"]
      : ["Region", "Media", "Monthly", "Imp/mo"];
    const cw = [34, 18, 46, 40];
    ensure(8 + p.regionBreakdown.length * 7);
    doc.setFontSize(8);
    setText(GRAY_500);
    let dx = M;
    cols.forEach((h, i) => {
      doc.text(h, dx, y + 2);
      dx += cw[i] ?? 24;
    });
    y += 6;
    doc.setFont(FONT, "normal");
    for (const row of p.regionBreakdown) {
      ensure(7);
      dx = M;
      const cells = [
        row.label,
        String(row.mediaCount),
        formatExportBudgetWonLabel(row.monthlyBudgetWon, isKo),
        row.monthlyImpressions.toLocaleString(isKo ? "ko-KR" : "en-US"),
      ];
      cells.forEach((cell, i) => {
        setText(i === 0 ? INK : GRAY_600);
        const line = (doc.splitTextToSize(cell, (cw[i] ?? 24) - 2) as string[])[0] ?? cell;
        doc.text(line, dx, y + 2);
        dx += cw[i] ?? 24;
      });
      y += 7;
    }
    y += 4;
  }

  if (
    sectionVisible(vis, "subdivision") &&
    p.regionSubdivision &&
    p.regionSubdivision.breakdown.length >= 2
  ) {
    sectionTitle(isKo ? "상권 · 권역 세분화" : "District & zone detail");
    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    setText(GRAY_500);
    const meta = `${isKo ? "기준" : "Source"}: ${p.regionSubdivision.sourceFieldLabel} (${p.regionSubdivision.classifiedCount}/${p.regionSubdivision.totalCount})`;
    ensure(6);
    doc.text(meta, M, y + 2);
    y += 5;
    if (p.regionSubdivision.coverageNote) {
      const note = doc.splitTextToSize(p.regionSubdivision.coverageNote, contentW) as string[];
      ensure(note.length * 4 + 2);
      setText(GRAY_600);
      doc.text(note, M, y + 2);
      y += note.length * 4 + 2;
    }
    if (
      ch?.regionSubdivisionBudgetSplit &&
      ch.regionSubdivisionBudgetSplit.length > 1
    ) {
      ensure(46);
      doc.setFontSize(8);
      setText(GRAY_500);
      doc.text(isKo ? "세분화 예산 비중" : "Budget by sub-area", M, y + 2);
      drawDonut(M + 22, y + 26, 18, 10, ch.regionSubdivisionBudgetSplit);
      y += 50;
    }
    if (
      ch?.regionSubdivisionImpressionSplit &&
      ch.regionSubdivisionImpressionSplit.length > 1
    ) {
      ensure(6 + ch.regionSubdivisionImpressionSplit.length * 7);
      doc.setFontSize(8);
      setText(GRAY_500);
      doc.text(isKo ? "세분화 노출 비중" : "Impressions by sub-area", M, y + 2);
      y += 5;
      drawShareBars(M, contentW, ch.regionSubdivisionImpressionSplit);
      y += 3;
    }
    const subCols = isKo
      ? ["상권·권역", "매체", "월 예산", "월 노출"]
      : ["Sub-area", "Media", "Monthly", "Imp/mo"];
    const subCw = [38, 18, 44, 40];
    ensure(8 + p.regionSubdivision.breakdown.length * 7);
    doc.setFontSize(8);
    setText(GRAY_500);
    let sdx = M;
    subCols.forEach((h, i) => {
      doc.text(h, sdx, y + 2);
      sdx += subCw[i] ?? 24;
    });
    y += 6;
    doc.setFont(FONT, "normal");
    for (const row of p.regionSubdivision.breakdown) {
      ensure(7);
      sdx = M;
      const cells = [
        row.label,
        String(row.mediaCount),
        formatExportBudgetWonLabel(row.monthlyBudgetWon, isKo),
        row.monthlyImpressions.toLocaleString(isKo ? "ko-KR" : "en-US"),
      ];
      cells.forEach((cell, i) => {
        setText(i === 0 ? INK : GRAY_600);
        const line = (doc.splitTextToSize(cell, (subCw[i] ?? 24) - 2) as string[])[0] ?? cell;
        doc.text(line, sdx, y + 2);
        sdx += subCw[i] ?? 24;
      });
      y += 7;
    }
    y += 4;
  }

  // ── 매체 구성 (디테일 카드) ──
  const thumbs = await loadExportThumbMap(p.portfolio);
  const thumbBox = PLANNER_EXPORT_THUMB_BOX_MM;

  function drawPdfContributionBar(
    x: number,
    y: number,
    w: number,
    label: string,
    pct: number,
    fill: readonly number[],
  ): number {
    const trackH = 1.6;
    doc.setFont(FONT, "normal");
    doc.setFontSize(7);
    setText(GRAY_500);
    doc.text(label, x, y);
    doc.text(`${pct}%`, x + w, y, { align: "right" });
    const trackY = y + 2.4;
    setFill(BAR_TRACK);
    doc.roundedRect(x, trackY, w, trackH, R, R, "F");
    const fillW = (w * Math.min(100, Math.max(0, pct))) / 100;
    if (fillW > 0.3) {
      setFill(fill);
      doc.roundedRect(x, trackY, fillW, trackH, R, R, "F");
    }
    return 7;
  }

  function drawMediaCard(row: PlannerExportMediaRow, thumb?: string) {
    const pad = PDF_LAYOUT.detailPadMm;
    const thumbSlot = Boolean(row.thumbUrl?.trim());
    const thumbW = thumbSlot ? thumbBox.w : 0;
    const textX = M + pad + (thumbSlot ? thumbW + 3 : 0);
    const textW = contentW - pad * 2 - (thumbSlot ? thumbW + 3 : 0);
    const colW = (textW - 3) / 2;
    const specs = collectMediaCardSpecs(row, isKo);
    const showContrib = showMediaCardContributions(p.portfolio.length, row);
    const mediaUrl = plannerMediaPageUrl(row.id, isKo);
    const linkBlockH = mediaUrl ? 11 : 0;

    let contentH = 5;
    if (row.location) contentH += 4.2;
    if (row.categoryLabel) contentH += 4.2;
    if (specs.length > 0) contentH += 3 + Math.ceil(specs.length / 2) * 5.2;
    if (row.monthlyPriceLabel || row.lineTotalLabel) contentH += 11;
    if (row.recommendReason?.trim()) {
      const reasonLines = doc.splitTextToSize(
        row.recommendReason.trim(),
        textW - 2,
      ) as string[];
      contentH += 4 + Math.min(reasonLines.length, 3) * 3.8;
    }
    if (showContrib) contentH += 16;
    contentH += linkBlockH + pad;

    const thumbColH = thumbSlot ? thumbBox.h + pad * 2 : 0;
    const rh = Math.max(thumbColH, contentH, 22);

    ensure(rh + 4);
    setFill(WHITE);
    setDraw(GRAY_200);
    doc.setLineWidth(0.25);
    doc.roundedRect(M, y, contentW, rh, R, R, "FD");

    if (thumbSlot) {
      if (thumb) {
        addPdfThumbImage(doc, thumb, M + pad, y + pad, thumbBox.w, thumbBox.h);
      } else {
        setFill(GRAY_50);
        doc.roundedRect(M + pad, y + pad, thumbBox.w, thumbBox.h, R, R, "F");
        doc.setFont(FONT, "normal");
        doc.setFontSize(7);
        setText(GRAY_500);
        doc.text(
          isKo ? "이미지 없음" : "No image",
          M + pad + thumbBox.w / 2,
          y + pad + thumbBox.h / 2 + 1,
          { align: "center" },
        );
      }
    }

    let ty = y + pad + 4;
    doc.setFont(FONT, "bold");
    doc.setFontSize(PDF_LAYOUT.detailNamePt);
    setText(INK);
    const nameLines = doc.splitTextToSize(row.name, textW) as string[];
    doc.text(nameLines.slice(0, 2), textX, ty);
    ty += nameLines.slice(0, 2).length * 4.2 + 1;

    doc.setFont(FONT, "normal");
    doc.setFontSize(PDF_LAYOUT.detailBodyPt);
    if (row.location) {
      setText(GRAY_600);
      const locLines = doc.splitTextToSize(row.location, textW) as string[];
      doc.text(locLines.slice(0, 2), textX, ty);
      ty += locLines.slice(0, 2).length * 3.8 + 0.6;
    }
    if (row.categoryLabel) {
      setText(GRAY_600);
      doc.text(row.categoryLabel, textX, ty);
      ty += 4.2;
    }

    if (specs.length > 0) {
      setDraw(GRAY_100);
      doc.setLineWidth(0.15);
      doc.line(textX, ty, textX + textW, ty);
      ty += 3;
      doc.setFontSize(PDF_LAYOUT.detailSpecPt);
      for (let i = 0; i < specs.length; i += 2) {
        const drawSpec = (spec: MediaCardSpec, sx: number) => {
          setText(GRAY_500);
          doc.text(`${spec.label}`, sx, ty);
          setText(INK);
          doc.setFont(FONT, "normal");
          const val = (doc.splitTextToSize(spec.value, colW - 14) as string[])[0] ?? spec.value;
          doc.text(val, sx + 14, ty);
        };
        drawSpec(specs[i]!, textX);
        if (specs[i + 1]) drawSpec(specs[i + 1]!, textX + colW + 3);
        ty += 5;
      }
    }

    if (row.monthlyPriceLabel || row.lineTotalLabel) {
      setDraw(GRAY_100);
      doc.line(textX, ty, textX + textW, ty);
      ty += 4;
      doc.setFontSize(PDF_LAYOUT.detailPriceLabelPt);
      if (row.monthlyPriceLabel) {
        setText(GRAY_500);
        doc.text(isKo ? "월 단가" : "Monthly", textX, ty);
        doc.setFont(FONT, "bold");
        doc.setFontSize(PDF_LAYOUT.detailPriceValuePt);
        setText(QP_ACCENT);
        doc.text(row.monthlyPriceLabel, textX, ty + 3.5);
      }
      if (row.lineTotalLabel) {
        setText(GRAY_500);
        doc.setFont(FONT, "normal");
        doc.setFontSize(PDF_LAYOUT.detailPriceLabelPt);
        doc.text(isKo ? "집행 소계" : "Subtotal", textX + colW + 3, ty);
        doc.setFont(FONT, "bold");
        doc.setFontSize(PDF_LAYOUT.detailPriceValuePt);
        setText(QP_ACCENT);
        doc.text(row.lineTotalLabel, textX + colW + 3, ty + 3.5);
      }
      ty += 9;
    }

    if (row.recommendReason?.trim()) {
      doc.setFont(FONT, "bold");
      doc.setFontSize(PDF_LAYOUT.detailReasonPt);
      setText(QP_ACCENT);
      const label = isKo ? "추천 " : "Why ";
      doc.text(label, textX, ty);
      const labelW = doc.getTextWidth(label);
      doc.setFont(FONT, "normal");
      setText(GRAY_600);
      const reasonLines = doc.splitTextToSize(
        row.recommendReason.trim(),
        textW - labelW,
      ) as string[];
      if (reasonLines.length > 0) {
        doc.text(reasonLines[0]!, textX + labelW, ty);
        for (let ri = 1; ri < Math.min(reasonLines.length, 3); ri++) {
          ty += 3.8;
          doc.text(reasonLines[ri]!, textX, ty);
        }
      }
      ty += 4.5;
    }

    if (showContrib) {
      setDraw(GRAY_100);
      doc.line(textX, ty, textX + textW, ty);
      ty += 3.5;
      const barW = colW;
      const barY = ty;
      const hasExposure = row.exposureContributionPct != null;
      const hasBudget = row.budgetContributionPct != null;
      if (hasExposure && hasBudget) {
        drawPdfContributionBar(
          textX,
          barY,
          barW,
          isKo ? "노출 기여" : "Exposure share",
          row.exposureContributionPct!,
          QP_INK,
        );
        drawPdfContributionBar(
          textX + colW + 3,
          barY,
          barW,
          isKo ? "예산 비중" : "Budget share",
          row.budgetContributionPct!,
          QP_ACCENT,
        );
        ty = barY + 7;
      } else if (hasExposure) {
        ty = barY + drawPdfContributionBar(
          textX,
          barY,
          barW,
          isKo ? "노출 기여" : "Exposure share",
          row.exposureContributionPct!,
          QP_INK,
        );
      } else if (hasBudget) {
        ty = barY + drawPdfContributionBar(
          textX,
          barY,
          barW,
          isKo ? "예산 비중" : "Budget share",
          row.budgetContributionPct!,
          QP_ACCENT,
        );
      }
    }

    if (mediaUrl) {
      const btnW = 48;
      const btnX = M + contentW - btnW - pad;
      const btnY = y + rh - linkBlockH + 1;
      addPdfMediaDetailLink(doc, {
        x: btnX,
        y: btnY,
        w: btnW,
        label: plannerMediaPageButtonLabel(isKo),
        url: mediaUrl,
        font: FONT,
        accent: QP_ACCENT,
        ink: QP_INK,
      });
    }
    y += rh + PDF_LAYOUT.detailCardGapMm;
  }

  type PdfGridState = { col: number; rowY: number };

  function cardGridMetrics() {
    const gap = PDF_LAYOUT.cardGapMm;
    const cols = PDF_LAYOUT.cardCols;
    const cellW = (contentW - gap * (cols - 1)) / cols;
    const pad = PDF_LAYOUT.cardPadMm;
    const thumbSize = Math.min(cellW - pad * 2, PDF_LAYOUT.cardThumbMaxMm);
    const cellH = pad + thumbSize + PDF_LAYOUT.cardTextBlockMm + pad;
    return { gap, cols, cellW, pad, thumbSize, cellH };
  }

  function compactGridMetrics() {
    const gap = PDF_LAYOUT.compactGapMm;
    const cols = PDF_LAYOUT.cardCols;
    const cellW = (contentW - gap * (cols - 1)) / cols;
    const rowH = PDF_LAYOUT.compactRowHmm;
    const thumbSize = PDF_LAYOUT.compactThumbMm;
    return { gap, cols, cellW, rowH, thumbSize };
  }

  function flushPdfCardGrid(state: PdfGridState): PdfGridState {
    const { cellH, gap } = cardGridMetrics();
    if (state.col > 0) {
      const newY = state.rowY + cellH + gap;
      y = newY;
      return { col: 0, rowY: newY };
    }
    y = state.rowY;
    return { col: 0, rowY: state.rowY };
  }

  function flushPdfCompactGrid(state: PdfGridState): PdfGridState {
    const { rowH, gap } = compactGridMetrics();
    if (state.col > 0) {
      const newY = state.rowY + rowH + gap;
      y = newY;
      return { col: 0, rowY: newY };
    }
    y = state.rowY;
    return { col: 0, rowY: state.rowY };
  }

  function drawPortfolioRegionHeader(label: string, followingBlockMm: number) {
    ensure(PDF_LAYOUT.regionHeaderMm + followingBlockMm);
    doc.setFont(FONT, "bold");
    doc.setFontSize(PDF_LAYOUT.regionHeaderPt);
    setText(INK);
    doc.text(label, M, y + 4.2);
    setDraw(GRAY_200);
    doc.setLineWidth(0.25);
    doc.line(M, y + 6.2, M + contentW, y + 6.2);
    y += PDF_LAYOUT.regionHeaderMm;
  }

  function drawPortfolioCategoryHeader(label: string, followingBlockMm: number) {
    ensure(PDF_LAYOUT.categoryHeaderMm + followingBlockMm);
    doc.setFont(FONT, "bold");
    doc.setFontSize(PDF_LAYOUT.categoryHeaderPt);
    setText(QP_ACCENT);
    doc.text(label.toUpperCase(), M, y + 4);
    y += PDF_LAYOUT.categoryHeaderMm;
  }

  function renderPortfolioLineup() {
    const { grouped, segments } = buildPortfolioLineupSegments(p);
    const cardBlockMm = cardGridMetrics().cellH + cardGridMetrics().gap;
    const compactBlockMm = compactGridMetrics().rowH + compactGridMetrics().gap;
    const detailBlockMm = PDF_LAYOUT.detailBlockMm;
    const firstBlockMm =
      lineupViewMode === "card"
        ? cardBlockMm
        : lineupViewMode === "compact"
          ? compactBlockMm
          : detailBlockMm;

    const lineupFollowingMm = grouped
      ? PDF_LAYOUT.regionHeaderMm + PDF_LAYOUT.categoryHeaderMm + firstBlockMm
      : firstBlockMm;

    sectionTitle(isKo ? "매체 구성" : "Media lineup", lineupFollowingMm);

    if (p.portfolio.length === 0) {
      ensure(10);
      setText(GRAY_500);
      doc.setFontSize(9);
      doc.text(
        isKo ? "포트폴리오에 담긴 매체가 없습니다." : "No media selected.",
        M + 2,
        y + 5,
      );
      y += 12;
      return;
    }

    if (lineupViewMode === "card") {
      let grid: PdfGridState = { col: 0, rowY: y };
      let prevRegion = "";
      for (const seg of segments) {
        if (!seg.items.length) continue;
        if (grouped) {
          if (seg.regionLabel !== prevRegion) {
            grid = flushPdfCardGrid(grid);
            drawPortfolioRegionHeader(
              seg.regionLabel,
              PDF_LAYOUT.categoryHeaderMm + firstBlockMm,
            );
            prevRegion = seg.regionLabel;
          } else {
            grid = flushPdfCardGrid(grid);
          }
          drawPortfolioCategoryHeader(seg.categoryLabel, firstBlockMm);
        }
        grid = drawMediaCardGrid(seg.items, thumbs, grid);
        if (grouped) {
          y = grid.rowY + PDF_LAYOUT.groupSegmentTrailingMm;
          grid = { col: grid.col, rowY: y };
        }
      }
      const { cellH, gap } = cardGridMetrics();
      y = grid.col > 0 ? grid.rowY + cellH + gap : grid.rowY;
    } else if (lineupViewMode === "compact") {
      let grid: PdfGridState = { col: 0, rowY: y };
      let prevRegion = "";
      for (const seg of segments) {
        if (!seg.items.length) continue;
        if (grouped) {
          if (seg.regionLabel !== prevRegion) {
            grid = flushPdfCompactGrid(grid);
            drawPortfolioRegionHeader(
              seg.regionLabel,
              PDF_LAYOUT.categoryHeaderMm + firstBlockMm,
            );
            prevRegion = seg.regionLabel;
          } else {
            grid = flushPdfCompactGrid(grid);
          }
          drawPortfolioCategoryHeader(seg.categoryLabel, firstBlockMm);
        }
        grid = drawMediaCompactGrid(seg.items, thumbs, grid);
        if (grouped) {
          y = grid.rowY + PDF_LAYOUT.groupSegmentTrailingMm;
          grid = { col: grid.col, rowY: y };
        }
      }
      const { rowH, gap } = compactGridMetrics();
      y = grid.col > 0 ? grid.rowY + rowH + gap : grid.rowY;
    } else {
      let prevRegion = "";
      for (const seg of segments) {
        if (!seg.items.length) continue;
        if (grouped) {
          if (seg.regionLabel !== prevRegion) {
            if (prevRegion) y += PDF_LAYOUT.groupSegmentTrailingMm;
            drawPortfolioRegionHeader(
              seg.regionLabel,
              PDF_LAYOUT.categoryHeaderMm + detailBlockMm,
            );
            prevRegion = seg.regionLabel;
          }
          drawPortfolioCategoryHeader(seg.categoryLabel, detailBlockMm);
        }
        for (const row of seg.items) {
          const thumb = row.thumbUrl ? thumbs.get(row.thumbUrl) : undefined;
          drawMediaCard(row, thumb);
        }
      }
    }
    y += 4;
    if (p.portfolio.length > 0 && p.budgetHonesty?.mixVsBudgetFootnote) {
      const note = p.budgetHonesty.mixVsBudgetFootnote;
      const noteLines = doc.splitTextToSize(note, contentW) as string[];
      ensure(noteLines.length * 4.5 + 4);
      doc.setFont(FONT, "normal");
      doc.setFontSize(8.5);
      setText([185, 28, 28]);
      doc.text(noteLines, M, y + 3);
      y += noteLines.length * 4.5 + 4;
    }
    if (p.portfolio.length > 0 && p.partialRateNotice) {
      const lines = doc.splitTextToSize(p.partialRateNotice, contentW) as string[];
      ensure(lines.length * 4.5 + 4);
      doc.setFont(FONT, "normal");
      doc.setFontSize(8.5);
      setText([146, 64, 14]);
      doc.text(lines, M, y + 3);
      y += lines.length * 4.5 + 4;
    }
    if (p.portfolio.length > 0 && p.unpricedMediaNotice) {
      const lines = doc.splitTextToSize(p.unpricedMediaNotice, contentW) as string[];
      ensure(lines.length * 4.5 + 4);
      doc.setFont(FONT, "normal");
      doc.setFontSize(8.5);
      setText([146, 64, 14]);
      doc.text(lines, M, y + 3);
      y += lines.length * 4.5 + 4;
    }
  }

  function drawMediaCardGrid(
    rows: PlannerExportMediaRow[],
    thumbMap: Map<string, string>,
    grid?: PdfGridState,
  ): PdfGridState {
    const { gap, cols, cellW, pad, thumbSize, cellH } = cardGridMetrics();
    let col = grid?.col ?? 0;
    let rowY = grid?.rowY ?? y;
    y = rowY;

    for (const row of rows) {
      if (col === 0) {
        ensure(cellH + gap);
        rowY = y;
      }
      const cx = M + col * (cellW + gap);
      const mediaUrl = plannerMediaPageUrl(row.id, isKo);

      setFill(WHITE);
      setDraw(GRAY_200);
      doc.setLineWidth(0.25);
      doc.roundedRect(cx, rowY, cellW, cellH, R, R, "FD");

      const thumb = row.thumbUrl ? thumbMap.get(row.thumbUrl) : undefined;
      if (thumb) {
        addPdfThumbImage(doc, thumb, cx + pad, rowY + pad, thumbSize, thumbSize);
      } else if (row.thumbUrl?.trim()) {
        setFill(GRAY_50);
        doc.roundedRect(cx + pad, rowY + pad, thumbSize, thumbSize, R, R, "F");
        doc.setFont(FONT, "normal");
        doc.setFontSize(6);
        setText(GRAY_500);
        doc.text(
          isKo ? "이미지 없음" : "No image",
          cx + pad + thumbSize / 2,
          rowY + pad + thumbSize / 2 + 0.5,
          { align: "center" },
        );
      }

      const textW = cellW - pad * 2;
      let ty = rowY + pad + thumbSize + 3.5;
      doc.setFont(FONT, "bold");
      doc.setFontSize(PDF_LAYOUT.cardNamePt);
      setText(INK);
      const nameLines = doc.splitTextToSize(row.name, textW) as string[];
      doc.text(nameLines.slice(0, 2), cx + pad, ty);
      ty +=
        nameLines.slice(0, 2).length * PDF_LAYOUT.cardNameLineHmm + 0.8;

      doc.setFont(FONT, "normal");
      doc.setFontSize(PDF_LAYOUT.cardMetaPt);
      setText(GRAY_600);
      const meta = exportMediaLineMetaParts(row).join(" · ");
      if (meta) {
        const metaLine = (doc.splitTextToSize(meta, textW) as string[])[0] ?? meta;
        doc.text(metaLine, cx + pad, ty);
        ty += 3.4;
      }
      const price = row.monthlyPriceLabel ?? row.priceLabel;
      if (price) {
        doc.setFont(FONT, "bold");
        doc.setFontSize(PDF_LAYOUT.cardPricePt);
        setText(QP_ACCENT);
        doc.text(price, cx + pad, ty);
      }

      if (mediaUrl) {
        doc.setFont(FONT, "normal");
        doc.setFontSize(PDF_LAYOUT.cardLinkPt);
        setText(QP_INK);
        const linkLabel = isKo ? "상세 →" : "Details →";
        doc.text(linkLabel, cx + cellW - pad, rowY + cellH - 2.2, { align: "right" });
        addPdfRectLink(doc, { x: cx, y: rowY, w: cellW, h: cellH, url: mediaUrl });
      }

      col += 1;
      if (col >= cols) {
        col = 0;
        y = rowY + cellH + gap;
        rowY = y;
      }
    }
    if (col > 0) y = rowY + cellH + gap;
    else y = rowY;
    return { col, rowY: y };
  }

  function drawMediaCompactGrid(
    rows: PlannerExportMediaRow[],
    thumbMap: Map<string, string>,
    grid?: PdfGridState,
  ): PdfGridState {
    const { gap, cols, cellW, rowH, thumbSize } = compactGridMetrics();
    let col = grid?.col ?? 0;
    let rowY = grid?.rowY ?? y;
    y = rowY;

    for (const row of rows) {
      if (col === 0) {
        ensure(rowH + gap);
        rowY = y;
      }
      const cx = M + col * (cellW + gap);
      const mediaUrl = plannerMediaPageUrl(row.id, isKo);

      setFill(WHITE);
      setDraw(GRAY_200);
      doc.setLineWidth(0.2);
      doc.roundedRect(cx, rowY, cellW, rowH, R, R, "FD");

      const thumb = row.thumbUrl ? thumbMap.get(row.thumbUrl) : undefined;
      if (thumb) {
        addPdfThumbImage(doc, thumb, cx + 1.5, rowY + 1.5, thumbSize, thumbSize);
      }

      const textX = cx + thumbSize + 3;
      const textW = cellW - thumbSize - 5;
      doc.setFont(FONT, "bold");
      doc.setFontSize(PDF_LAYOUT.compactNamePt);
      setText(INK);
      const nameLine = (doc.splitTextToSize(row.name, textW) as string[])[0] ?? row.name;
      doc.text(nameLine, textX, rowY + 4.2);

      doc.setFont(FONT, "normal");
      doc.setFontSize(PDF_LAYOUT.compactMetaPt);
      setText(GRAY_600);
      const meta = exportMediaLineMetaParts(row, { includePrice: true }).join(" · ");
      if (meta) {
        const metaLine = (doc.splitTextToSize(meta, textW) as string[])[0] ?? meta;
        doc.text(metaLine, textX, rowY + 8);
      }

      if (mediaUrl) {
        addPdfRectLink(doc, { x: cx, y: rowY, w: cellW, h: rowH, url: mediaUrl });
      }

      col += 1;
      if (col >= cols) {
        col = 0;
        y = rowY + rowH + gap;
        rowY = y;
      }
    }
    if (col > 0) y = rowY + rowH + gap;
    else y = rowY;
    return { col, rowY: y };
  }

  if (sectionVisible(vis, "recommend") && p.recommendRationale) {
    sectionTitle(isKo ? "추천 근거" : "Recommendation rationale");
    for (const line of p.recommendRationale.summaryLines) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(9);
      setText(GRAY_600);
      const wrapped = doc.splitTextToSize(line, contentW) as string[];
      ensure(wrapped.length * 4.2 + 2);
      doc.text(wrapped, M, y + 3);
      y += wrapped.length * 4.2 + 2;
    }
    if (p.recommendRationale.mediaReasons.length > 0) {
      ensure(p.recommendRationale.mediaReasons.length * 8 + 4);
      y += 2;
      for (const item of p.recommendRationale.mediaReasons) {
        doc.setFont(FONT, "bold");
        doc.setFontSize(8.5);
        setText(INK);
        doc.text(item.name, M + 2, y + 3);
        y += 4.5;
        doc.setFont(FONT, "normal");
        setText(GRAY_600);
        const wrapped = doc.splitTextToSize(item.reason, contentW - 6) as string[];
        ensure(wrapped.length * 4);
        doc.text(wrapped, M + 4, y + 2);
        y += wrapped.length * 4 + 2;
      }
    }
    y += 4;
  }

  renderPortfolioLineup();

  // ── 디지털 배분 (통합) ──
  if (p.digital && p.digital.length) {
    sectionTitle(isKo ? "디지털 예산 배분" : "Digital budget allocation");
    if (p.digitalSummary) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(8.5);
      setText(GRAY_600);
      const sl = doc.splitTextToSize(p.digitalSummary, contentW) as string[];
      ensure(sl.length * 4.5 + 2);
      doc.text(sl, M, y + 3);
      y += sl.length * 4.5 + 2;
    }
    const dc = [
      { label: isKo ? "플랫폼" : "Platform", w: contentW * 0.5 },
      { label: isKo ? "비중" : "Share", w: contentW * 0.2 },
      { label: isKo ? "예상 노출" : "Est. impressions", w: contentW * 0.3 },
    ];
    ensure(9);
    setFill(QP_INK);
    doc.rect(M, y, contentW, 7, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    let cx = M + 2;
    for (const c of dc) {
      doc.text(c.label, cx, y + 4.8);
      cx += c.w;
    }
    y += 7;
    doc.setFontSize(8.5);
    p.digital.forEach((row, idx) => {
      ensure(7);
      if (idx % 2 === 1) {
        setFill(GRAY_50);
        doc.rect(M, y, contentW, 7, "F");
      }
      setText(INK);
      let dx = M + 2;
      doc.text(
        (doc.splitTextToSize(row.platform, dc[0].w - 3) as string[]).slice(0, 1),
        dx,
        y + 4.6,
      );
      dx += dc[0].w;
      setText(GRAY_600);
      doc.text(`${row.sharePct}%`, dx, y + 4.6);
      dx += dc[1].w;
      doc.text(fmtImp(row.impressions, isKo), dx, y + 4.6);
      y += 7;
    });
    y += 6;
  }

  // ── 추가 섹션 (PRO 인사이트 등) ──
  for (const sec of exportSections ?? []) {
    if (!sec.lines.length) continue;
    sectionTitle(sec.title);
    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    for (const line of sec.lines) {
      const wrapped = doc.splitTextToSize(line, contentW - 5) as string[];
      ensure(wrapped.length * 4.6 + 1.5);
      setFill(QP_ACCENT);
      doc.circle(M + 1.2, y + 1.6, 0.7, "F");
      setText(GRAY_600);
      doc.text(wrapped, M + 4, y + 3);
      y += wrapped.length * 4.6 + 1.5;
    }
    y += 4;
  }

  // ── 면책 ──
  ensure(14);
  y += 2;
  setDraw(GRAY_200);
  doc.line(M, y, pageW - M, y);
  y += 5;
  doc.setFont(FONT, "normal");
  doc.setFontSize(7.5);
  setText(GRAY_500);
  const footnotes: string[] = [];
  if (p.currencyFootnote) footnotes.push(p.currencyFootnote);
  if (p.pricingFootnote) footnotes.push(p.pricingFootnote);
  footnotes.push(p.disclaimer);
  const disc = doc.splitTextToSize(footnotes.join("\n\n"), contentW) as string[];
  doc.text(disc, M, y + 2);

  footer();

  const ab = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(ab);
}
