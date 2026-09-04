import { EXPORT_THUMB_BOX_MM, PLANNER_EXPORT_THUMB_BOX_MM, loadExportThumbMap, loadExportImageForPdf } from "@/lib/export-media-images";
import type {
  PlannerExportMediaRow,
  PlannerReportExportAssets,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import { plannerChartColorPptx } from "@/lib/planner-chart-colors";
import { formatPlannerSharePct } from "@/lib/planner-logic";
import { formatExportBudgetWonLabel } from "@/lib/planner-report-export/format-export-money";
import type { PlannerPerformanceGuide } from "@/lib/planner-report-performance-guide";
import {
  plannerMediaPageButtonLabel,
  plannerMediaPageUrl,
} from "@/lib/planner-report-export/media-page-url";
import {
  filterExportSections,
  sectionVisible,
} from "@/lib/planner-report-export/section-visibility";
import {
  collectMediaCardSpecs,
  exportMediaLineMetaParts,
  showMediaCardContributions,
} from "@/lib/planner-report-export/media-card-layout";
import { buildPortfolioLineupSegments } from "@/lib/planner-report-export/lineup-segments";
import {
  EXPORT_BADGE_PDF,
  exportBadgeBracketLabel,
} from "@/lib/planner-report-export/export-badge";
import { getReportDocumentTheme } from "@/lib/planner-report-export/document-theme";
import { reportExportCoverSubtitle } from "@/lib/planner-report-export/report-cover-copy";

/**
 * 플래너 보고서 PPTX — pptxgenjs 로 편집 가능한 제안서 슬라이드를 생성한다.
 * 텍스트/표/도형 네이티브 요소라 영업팀이 PowerPoint 에서 바로 수정 가능.
 */

const INK = "111827";
const GRAY = "6B7280";
const LIGHT = "F1F1F7";
const WHITE = "FFFFFF";

function fmtImp(n: number, isKo: boolean): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

type PptxSlide = ReturnType<InstanceType<typeof import("pptxgenjs")["default"]>["addSlide"]>;

/** Keynote·Google Slides 호환 — 네이티브 addChart 대신 도형 막대 */
function addShapeBarChart(
  slide: PptxSlide,
  pptx: InstanceType<typeof import("pptxgenjs").default>,
  opts: {
    title: string;
    x: number;
    y: number;
    w: number;
    rows: { label: string; value: number; colorKey?: string }[];
    color: string;
    face: string;
    fmt: (n: number) => string;
    colorByRow?: boolean;
  },
): number {
  const { title, x, y, w, rows, color, face, fmt, colorByRow = false } = opts;
  slide.addText(title, {
    x,
    y,
    w,
    h: 0.3,
    fontFace: face,
    fontSize: 12,
    color: GRAY,
    bold: true,
  });
  const labelW = 1.35;
  const valW = 1.05;
  const barX = x + labelW;
  const barMaxW = w - labelW - valW;
  const max = Math.max(1, ...rows.map((r) => r.value));
  rows.forEach((row, i) => {
    const rowY = y + 0.38 + i * 0.58;
    slide.addText(row.label, {
      x,
      y: rowY,
      w: labelW,
      h: 0.35,
      fontFace: face,
      fontSize: 10,
      color: GRAY,
      valign: "middle",
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: barX,
      y: rowY + 0.04,
      w: barMaxW,
      h: 0.26,
      fill: { color: LIGHT },
      rectRadius: 0.05,
      line: { color: "E4E6EC", width: 0.5 },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: barX,
      y: rowY + 0.04,
      w: Math.max(0.1, (barMaxW * row.value) / max),
      h: 0.26,
      fill: { color: colorByRow ? plannerChartColorPptx(row.colorKey, i) : color },
      rectRadius: 0.05,
    });
    slide.addText(fmt(row.value), {
      x: x + w - valW,
      y: rowY,
      w: valW,
      h: 0.35,
      fontFace: face,
      fontSize: 10,
      color: INK,
      align: "right",
      valign: "middle",
    });
  });
  return y + 0.38 + rows.length * 0.58 + 0.15;
}

function addBudgetSplitShapes(
  slide: PptxSlide,
  pptx: InstanceType<typeof import("pptxgenjs").default>,
  x: number,
  y: number,
  w: number,
  rows: { label: string; value: number; colorKey?: string; pct?: number }[],
  face: string,
  isKo: boolean,
): number {
  const total = rows.reduce((s, d) => s + d.value, 0) || 1;
  const barY = y + 0.45;
  const barH = 0.38;
  const barW = w * 0.92;
  let bx = x;
  rows.forEach((d, i) => {
    const segW = (barW * d.value) / total;
    if (segW < 0.02) return;
    slide.addShape(pptx.ShapeType.rect, {
      x: bx,
      y: barY,
      w: segW,
      h: barH,
      fill: { color: plannerChartColorPptx(d.colorKey, i) },
      line: { color: "E4E6EC", width: 0.25 },
    });
    bx += segW;
  });
  rows.forEach((d, i) => {
    const ly = barY + barH + 0.22 + i * 0.4;
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: ly,
      w: 0.16,
      h: 0.16,
      fill: { color: plannerChartColorPptx(d.colorKey, i) },
    });
    slide.addText(
      `${d.label}  ${formatPlannerSharePct(d.pct ?? (d.value / total) * 100)}  (₩${d.value.toLocaleString(isKo ? "ko-KR" : "en-US")})`,
      {
        x: x + 0.24,
        y: ly - 0.02,
        w: w - 0.3,
        h: 0.32,
        fontFace: face,
        fontSize: 11,
        color: INK,
      },
    );
  });
  return barY + barH + 0.22 + rows.length * 0.4 + 0.1;
}

const INK_DEEP_BAR = "1C1C1F";
const BAR_TRACK = "F3F4F6";

function addPptContributionBar(
  slide: PptxSlide,
  pptx: InstanceType<typeof import("pptxgenjs")["default"]>,
  x: number,
  y: number,
  w: number,
  label: string,
  pct: number,
  color: string,
  face: string,
) {
  slide.addText(label, {
    x,
    y,
    w: w * 0.62,
    h: 0.16,
    fontSize: 8,
    color: GRAY,
    fontFace: face,
  });
  slide.addText(`${pct}%`, {
    x: x + w * 0.62,
    y,
    w: w * 0.38,
    h: 0.16,
    fontSize: 8,
    color: INK,
    fontFace: face,
    align: "right",
  });
  const barY = y + 0.18;
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y: barY,
    w,
    h: 0.09,
    fill: { color: BAR_TRACK },
    rectRadius: 0.045,
    line: { color: BAR_TRACK, width: 0 },
  });
  const fillW = Math.max(0.04, (w * Math.min(100, Math.max(0, pct))) / 100);
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y: barY,
    w: fillW,
    h: 0.09,
    fill: { color },
    rectRadius: 0.045,
    line: { color, width: 0 },
  });
}

function estimatePptCardHeight(
  row: PlannerExportMediaRow,
  portfolioLen: number,
  isKo: boolean,
  thumbHIn: number,
): number {
  const specs = collectMediaCardSpecs(row, isKo);
  let h = 0.55;
  if (row.location) h += 0.22;
  if (row.categoryLabel) h += 0.2;
  if (specs.length > 0) h += 0.12 + Math.ceil(specs.length / 2) * 0.24;
  if (row.monthlyPriceLabel || row.lineTotalLabel) h += 0.48;
  if (row.recommendReason?.trim()) h += 0.38;
  if (showMediaCardContributions(portfolioLen, row)) h += 0.42;
  if (row.kind === "custom") return Math.max(h + 0.35, 1.1);
  return Math.max(h + 0.35, thumbHIn + 0.4);
}

export async function buildPlannerReportPptx(
  p: PlannerReportExportPayload,
  assets?: PlannerReportExportAssets,
): Promise<Uint8Array> {
  const theme = getReportDocumentTheme(assets?.style);
  const ACCENT = theme.pptx.accent;
  const ACCENT_LT = theme.pptx.accentLight;
  const CYAN = theme.pptx.ink;
  const COVER_BG = theme.pptx.coverBg;
  const COVER_TEXT = theme.pptx.coverText;
  const COVER_MUTED = theme.pptx.coverMuted;

  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.author = "THINKAD";
  pptx.company = "THINKAD";
  pptx.title = p.documentTitle;

  const isKo = p.isKo;
  const face = isKo ? "Malgun Gothic" : "Arial";
  const W = 13.33;
  const vis = assets?.sectionVisibility;
  const exportSections = filterExportSections(p.sections, vis)?.filter(
    (sec) =>
      !(
        p.executiveSummaryLines?.length &&
        (sec.title === "전략 요약" || sec.title === "Strategy summary")
      ),
  );
  const lineupViewMode = assets?.lineupViewMode ?? "detail";

  const wordmark = (size: number) => [
    { text: "THINK", options: { color: theme.coverMode === "filled" ? WHITE : COVER_TEXT, bold: true } },
    { text: "AD", options: { color: ACCENT_LT, bold: true } },
  ].map((r) => ({ ...r, options: { ...r.options, fontFace: face, fontSize: size } }));

  const coverLogoData = p.coverLogoUrl?.trim()
    ? await loadExportImageForPdf(p.coverLogoUrl.trim(), {
        width: 256,
        height: 256,
        quality: 88,
      })
    : null;

  // ── 1. 표지 ──
  // 배경은 화면 미리보기(DocumentGradientHero, bg-[#1c1c1f])와 통일한다.
  // INK_DEEP 상수가 이름과 달리 값은 이미 "1C1C1F" 라 그대로 근흑색 배경으로 쓴다.
  const cover = pptx.addSlide();
  cover.background = { color: COVER_BG };
  if (coverLogoData) {
    try {
      cover.addImage({
        data: coverLogoData,
        x: W - 2.2,
        y: 0.45,
        w: 1.5,
        h: 1.5,
      });
    } catch {
      /* broken logo */
    }
  }
  const coverTitleColor = theme.coverMode === "filled" ? WHITE : COVER_TEXT;
  const coverMutedColor = theme.coverMode === "filled" ? "D1D5DB" : COVER_MUTED;

  cover.addText(wordmark(30), { x: 0.7, y: 1.35, w: 6, h: 0.7 });
  cover.addText("CAMPAIGN PLANNER", {
    x: 0.72, y: 2.05, w: 9, h: 0.4, fontFace: face,
    fontSize: 12, color: coverMutedColor, charSpacing: 3,
  });
  cover.addText(p.documentTitle, {
    x: 0.7, y: 2.7, w: 12, h: 1.4, fontFace: face,
    fontSize: 38, bold: true, color: coverTitleColor,
  });
  cover.addShape(pptx.ShapeType.rect, { x: 0.72, y: 4.0, w: 2.2, h: 0.06, fill: { color: ACCENT } });
  cover.addText(
    reportExportCoverSubtitle(isKo, {
      kind: p.kind,
      reportComposition: p.reportComposition,
    }),
    { x: 0.7, y: 4.25, w: 12, h: 0.5, fontFace: face, fontSize: 17, color: coverMutedColor },
  );
  if (p.clientName) {
    cover.addText(`${p.clientName} ${isKo ? "귀중" : ""}`.trim(), {
      x: 0.7, y: 6.0, w: 12, h: 0.4, fontFace: face, fontSize: 14, color: coverTitleColor,
    });
  }
  cover.addText(p.generatedAt, {
    x: 0.7, y: 6.6, w: 12, h: 0.4, fontFace: face, fontSize: 12, color: coverMutedColor,
  });

  // 공통 헤더 그리기
  function header(slide: ReturnType<typeof pptx.addSlide>, label: string) {
    slide.background = { color: WHITE };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.9, fill: { color: ACCENT } });
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.9, w: W, h: 0.05, fill: { color: CYAN } });
    slide.addText(label, {
      x: 0.6, y: 0.12, w: 9, h: 0.66, fontFace: face, fontSize: 20, bold: true, color: WHITE,
    });
    const sub = [p.campaignName, p.generatedAt].filter(Boolean).join("  ·  ");
    slide.addText(sub, {
      x: W - 5.1, y: 0.3, w: 4.5, h: 0.35, fontFace: face, fontSize: 11,
      color: "E1DCF5", align: "right",
    });
  }

  function lineupSlideTitle(slideIndex: number): string {
    if (slideIndex === 0) return isKo ? "매체 구성" : "Media lineup";
    return isKo ? "매체 구성 (계속)" : "Media lineup (cont.)";
  }

  function addPptRegionHeader(slide: PptxSlide, label: string, topY: number): number {
    slide.addText(label, {
      x: 0.6,
      y: topY,
      w: 12.1,
      h: 0.35,
      fontFace: face,
      fontSize: 15,
      bold: true,
      color: INK,
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.6,
      y: topY + 0.38,
      w: 12.1,
      h: 0,
      line: { color: GRAY, width: 0.75 },
    });
    return topY + 0.52;
  }

  function addPptCategoryHeader(slide: PptxSlide, label: string, topY: number): number {
    slide.addText(label.toUpperCase(), {
      x: 0.6,
      y: topY,
      w: 12.1,
      h: 0.22,
      fontFace: face,
      fontSize: 10,
      bold: true,
      color: ACCENT,
    });
    return topY + 0.28;
  }

  // ── 1b. 인사말 / 전략 요약 (C-full-1) ──
  if (p.greetingText?.trim()) {
    const gSlide = pptx.addSlide();
    header(gSlide, isKo ? "인사말" : "Greeting");
    gSlide.addText(
      p.greetingText
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n\n"),
      {
        x: 0.7,
        y: 1.3,
        w: 12,
        h: 5.2,
        fontFace: face,
        fontSize: 14,
        color: INK,
        valign: "top",
      },
    );
  }
  if (p.executiveSummaryLines && p.executiveSummaryLines.length > 0) {
    const eSlide = pptx.addSlide();
    header(eSlide, isKo ? "전략 요약" : "Strategy summary");
    eSlide.addText(p.executiveSummaryLines.join("\n\n"), {
      x: 0.7,
      y: 1.3,
      w: 12,
      h: 5.2,
      fontFace: face,
      fontSize: 13,
      color: INK,
      valign: "top",
    });
  }

  // ── 2. 캠페인 요약 + KPI ──
  const s2 = pptx.addSlide();
  header(s2, isKo ? "캠페인 개요" : "Campaign overview");
  const summaryRows: Array<[string, string]> = [
    [isKo ? "캠페인 목표" : "Goal", p.goalTitle || "—"],
    [isKo ? "총 예산" : "Total budget", p.budgetHonesty?.coverValue ?? (isKo ? `${p.budgetMan.toLocaleString()}만원` : `${p.budgetMan.toLocaleString()}M KRW`)],
    [isKo ? "집행 기간" : "Flight", p.periodDisplay || "—"],
    [isKo ? "지역" : "Regions", p.regionsText || "—"],
    [isKo ? "매체 유형" : "Media types", p.categoriesText || "—"],
    [isKo ? "타깃 연령" : "Target age", p.ageText || "—"],
    [isKo ? "업종" : "Industry", p.industryText || "—"],
  ];
  s2.addTable(
    summaryRows.map(([k, v]) => [
      { text: k, options: { fill: { color: LIGHT }, color: GRAY, bold: true, fontSize: 12, fontFace: face } },
      { text: v, options: { color: INK, fontSize: 12, fontFace: face } },
    ]),
    { x: 0.6, y: 1.25, w: 7.2, colW: [2.4, 4.8], border: { type: "solid", color: "E4E6EC", pt: 0.5 }, rowH: 0.42, valign: "middle" },
  );
  // KPI 카드 (오른쪽)
  const kpis = p.kpis.slice(0, 4);
  kpis.forEach((k, i) => {
    const ky = 1.25 + i * 1.25;
    s2.addShape(pptx.ShapeType.roundRect, { x: 8.2, y: ky, w: 4.5, h: 1.05, fill: { color: LIGHT }, rectRadius: 0.08, line: { color: "E4E6EC", width: 0.5 } });
    s2.addText(k.label, { x: 8.4, y: ky + 0.12, w: 4.1, h: 0.3, fontFace: face, fontSize: 10, color: GRAY });
    if (k.status === "pending") {
      s2.addText("—", { x: 8.4, y: ky + 0.38, w: 4.1, h: 0.35, fontFace: face, fontSize: 16, bold: true, color: GRAY });
    } else {
      s2.addText(k.value, { x: 8.4, y: ky + 0.38, w: 4.1, h: 0.45, fontFace: face, fontSize: 18, bold: true, color: ACCENT });
    }
    const badgeColors = EXPORT_BADGE_PDF[k.badge];
    s2.addShape(pptx.ShapeType.roundRect, {
      x: 8.4,
      y: ky + (k.status === "pending" ? 0.72 : 0.82),
      w: 2.2,
      h: 0.22,
      fill: { color: badgeColors.fill.replace("#", "") },
      line: { color: badgeColors.border.replace("#", ""), width: 0.5 },
      rectRadius: 0.04,
    });
    s2.addText(exportBadgeBracketLabel(k.badge, isKo), {
      x: 8.45,
      y: ky + (k.status === "pending" ? 0.73 : 0.83),
      w: 2.1,
      h: 0.2,
      fontFace: face,
      fontSize: 7,
      bold: true,
      color: badgeColors.text.replace("#", ""),
    });
  });

  if (p.cpmFootnote) {
    s2.addText(p.cpmFootnote, {
      x: 0.6,
      y: 6.15,
      w: 12.1,
      h: 0.35,
      fontFace: face,
      fontSize: 9,
      color: GRAY,
    });
  }

  if (p.budgetHonesty?.overBudgetBanner) {
    s2.addShape(pptx.ShapeType.roundRect, {
      x: 0.6,
      y: 6.55,
      w: 12.1,
      h: 0.55,
      fill: { color: "FEE2E2" },
      rectRadius: 0.06,
      line: { color: "FECACA", width: 0.5 },
    });
    s2.addText(p.budgetHonesty.overBudgetBanner, {
      x: 0.75,
      y: 6.62,
      w: 11.8,
      h: 0.4,
      fontFace: face,
      fontSize: 11,
      bold: true,
      color: "B91C1C",
    });
  }

  if (p.quoteSummary) {
    const qs = p.quoteSummary;
    const fmtAmt = (won: number) => formatExportBudgetWonLabel(won, isKo);
    const sq = pptx.addSlide();
    header(sq, isKo ? "견적 요약" : "Quote summary");
    const quoteRows: Array<[string, string, boolean]> = [
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
    sq.addTable(
      quoteRows.map(([k, v, emphasis]) => [
        {
          text: k,
          options: {
            fill: { color: emphasis ? LIGHT : "FFFFFF" },
            color: emphasis ? INK : GRAY,
            bold: emphasis,
            fontSize: 11,
            fontFace: face,
          },
        },
        {
          text: v,
          options: {
            fill: { color: emphasis ? LIGHT : "FFFFFF" },
            color: emphasis ? ACCENT.replace("#", "") : INK,
            bold: emphasis,
            align: "right",
            fontSize: 11,
            fontFace: face,
          },
        },
      ]),
      {
        x: 0.6,
        y: 1.25,
        w: 7.2,
        colW: [4.2, 3],
        border: { type: "solid", color: "E4E6EC", pt: 0.5 },
        rowH: 0.45,
        valign: "middle",
      },
    );
    if (qs.footnotes.length > 0) {
      sq.addText(
        qs.footnotes.map((n) => `※ ${n}`).join("\n"),
        {
          x: 0.6,
          y: 1.25 + quoteRows.length * 0.45 + 0.2,
          w: 12.1,
          h: 0.6,
          fontFace: face,
          fontSize: 9,
          color: GRAY,
        },
      );
    }
  }

  // ── 2.5 성과 요약 (도형 차트 — Keynote·Google Slides 호환) ──
  const ch = p.charts;
  if (
    sectionVisible(vis, "performance") &&
    ch &&
    ((ch.budgetSplit?.length ?? 0) > 0 ||
      (ch.browseBudgetSplit?.length ?? 0) > 0 ||
      (ch.cpmBars?.length ?? 0) > 0 ||
      (ch.reachSummary?.length ?? 0) > 0)
  ) {
    const sc = pptx.addSlide();
    header(sc, isKo ? "성과 요약" : "Performance summary");

    const hasTypeBudget = (ch.budgetSplit?.length ?? 0) > 0;
    const hasBrowseBudget = (ch.browseBudgetSplit?.length ?? 0) > 0;
    let budgetBlockBottom = 1.15;
    if (hasTypeBudget) {
      sc.addText(isKo ? "예산 배분 (유형별)" : "Budget by type", {
        x: 0.6,
        y: 1.15,
        w: 6,
        h: 0.3,
        fontFace: face,
        fontSize: 12,
        color: GRAY,
        bold: true,
      });
      budgetBlockBottom = Math.max(
        budgetBlockBottom,
        addBudgetSplitShapes(sc, pptx, 0.6, 1.15, 5.8, ch.budgetSplit!, face, isKo),
      );
    }
    if (hasBrowseBudget) {
      sc.addText(isKo ? "예산 배분 (카테고리별)" : "Budget by category", {
        x: hasTypeBudget ? 6.9 : 0.6,
        y: 1.15,
        w: 6,
        h: 0.3,
        fontFace: face,
        fontSize: 12,
        color: GRAY,
        bold: true,
      });
      budgetBlockBottom = Math.max(
        budgetBlockBottom,
        addBudgetSplitShapes(
          sc,
          pptx,
          hasTypeBudget ? 6.9 : 0.6,
          1.15,
          5.8,
          ch.browseBudgetSplit!,
          face,
          isKo,
        ),
      );
    }

    const dualBudget = hasTypeBudget && hasBrowseBudget;
    const barX = dualBudget ? 0.6 : 7.0;
    const barW = dualBudget ? 12.1 : 5.9;
    let rightY = dualBudget ? budgetBlockBottom + 0.15 : 1.15;
    if (ch.reachSummary?.length) {
      rightY = addShapeBarChart(sc, pptx, {
        title: isKo ? "노출 요약" : "Impressions",
        x: barX,
        y: rightY,
        w: barW,
        rows: ch.reachSummary,
        color: INK_DEEP_BAR,
        face,
        fmt: (n) => fmtImp(n, isKo),
      });
    }
    if (ch.cpmBars?.length) {
      addShapeBarChart(sc, pptx, {
        title: p.cpmExcludesQuoteOnly
          ? isKo
            ? "CPM 비교 (원) (문의 매체 제외)"
            : "CPM (KRW, excl. inquiry)"
          : isKo
            ? "CPM 비교 (원)"
            : "CPM (KRW)",
        x: barX,
        y: ch.reachSummary?.length ? rightY + 0.15 : rightY,
        w: barW,
        rows: ch.cpmBars,
        color: ACCENT,
        face,
        fmt: (n) => `₩${fmtImp(n, isKo)}`,
        colorByRow: true,
      });
    }
  }

  if (sectionVisible(vis, "performance") && ch?.performanceGuide) {
    const g = ch.performanceGuide;
    const gSlide = pptx.addSlide();
    header(gSlide, g.title);
    const colCount = g.table.headers.length;
    const colW = Array.from({ length: colCount }, (_, i) =>
      i === 0 ? 2.4 : (12.1 - 2.4) / Math.max(1, colCount - 1),
    );
    const tableBody = [
      g.table.headers.map((h, i) => ({
        text: h,
        options: {
          fill: { color: "F5F3FF" },
          color: ACCENT,
          bold: true,
          fontSize: 11,
          fontFace: face,
        },
      })),
      ...g.table.rows.map((row) => [
        {
          text: row.label,
          options: { color: GRAY, bold: true, fontSize: 10, fontFace: face },
        },
        ...row.cells.map((cell) => ({
          text: cell,
          options: { color: INK, bold: true, fontSize: 10, fontFace: face },
        })),
      ]),
    ];
    gSlide.addTable(tableBody, {
      x: 0.6,
      y: 1.15,
      w: 12.1,
      colW,
      border: { type: "solid", color: "E4E6EC", pt: 0.5 },
      rowH: 0.38,
      valign: "middle",
    });
    gSlide.addText(
      g.bullets.map((b) => `• ${b}`).join("\n\n"),
      {
        x: 0.6,
        y: 2.55,
        w: 12.1,
        h: 4.2,
        fontFace: face,
        fontSize: 10,
        color: INK,
        valign: "top",
      },
    );
  }

  if (sectionVisible(vis, "recommend") && p.recommendRationale) {
    const rSlide = pptx.addSlide();
    header(rSlide, isKo ? "추천 근거" : "Recommendation rationale");
    let ry = 1.2;
    for (const line of p.recommendRationale.summaryLines) {
      rSlide.addText(line, {
        x: 0.6,
        y: ry,
        w: 12.1,
        h: 0.55,
        fontFace: face,
        fontSize: 12,
        color: INK,
        valign: "top",
      });
      ry += 0.62;
    }
    if (p.recommendRationale.mediaReasons.length > 0) {
      ry += 0.15;
      for (const item of p.recommendRationale.mediaReasons.slice(0, 8)) {
        rSlide.addText(
          [
            {
              text: `${item.name}\n`,
              options: { bold: true, color: INK, fontSize: 11 },
            },
            {
              text: item.reason,
              options: { color: GRAY, fontSize: 10 },
            },
          ],
          {
            x: 0.6,
            y: ry,
            w: 12.1,
            h: 0.5,
            fontFace: face,
            valign: "top",
          },
        );
        ry += 0.55;
      }
    }
  }

  if (
    sectionVisible(vis, "subdivision") &&
    p.regionSubdivision &&
    p.regionSubdivision.breakdown.length >= 2
  ) {
    const subSlide = pptx.addSlide();
    header(subSlide, isKo ? "상권 · 권역 세분화" : "District & zone detail");
    subSlide.addText(
      `${isKo ? "기준" : "Source"}: ${p.regionSubdivision.sourceFieldLabel} (${p.regionSubdivision.classifiedCount}/${p.regionSubdivision.totalCount})`,
      {
        x: 0.6,
        y: 1.1,
        w: 12.1,
        h: 0.35,
        fontFace: face,
        fontSize: 11,
        color: GRAY,
      },
    );
    let sy = 1.45;
    if (p.regionSubdivision.coverageNote) {
      subSlide.addText(p.regionSubdivision.coverageNote, {
        x: 0.6,
        y: sy,
        w: 12.1,
        h: 0.4,
        fontFace: face,
        fontSize: 10,
        color: "B45309",
      });
      sy += 0.45;
    }
    const tableHead = isKo
      ? ["상권·권역", "매체", "월 예산", "월 노출"]
      : ["Sub-area", "Media", "Monthly", "Imp/mo"];
    const tableBody = [
      tableHead.map((h) => ({
        text: h,
        options: {
          fill: { color: LIGHT },
          color: GRAY,
          bold: true,
          fontSize: 10,
          fontFace: face,
        },
      })),
      ...p.regionSubdivision.breakdown.slice(0, 10).map((row) => [
        {
          text: row.label,
          options: { color: INK, bold: true, fontSize: 10, fontFace: face },
        },
        {
          text: String(row.mediaCount),
          options: { color: INK, fontSize: 10, fontFace: face },
        },
        {
          text: `${formatExportBudgetWonLabel(row.monthlyBudgetWon, isKo)}${row.monthlyBudgetWon > 0 ? ` (${row.budgetPct}%)` : ""}`,
          options: { color: INK, fontSize: 10, fontFace: face },
        },
        {
          text: row.monthlyImpressions.toLocaleString(isKo ? "ko-KR" : "en-US"),
          options: { color: INK, fontSize: 10, fontFace: face },
        },
      ]),
    ];
    subSlide.addTable(tableBody, {
      x: 0.6,
      y: sy,
      w: 12.1,
      colW: [3.2, 1.2, 4.2, 3.5],
      border: { type: "solid", color: "E4E6EC", pt: 0.5 },
      rowH: 0.36,
      valign: "middle",
    });
    if (ch?.regionSubdivisionBudgetSplit && ch.regionSubdivisionBudgetSplit.length > 1) {
      addBudgetSplitShapes(
        subSlide,
        pptx,
        0.6,
        sy + 0.36 * (tableBody.length + 0.5) + 0.2,
        5.5,
        ch.regionSubdivisionBudgetSplit,
        face,
        isKo,
      );
    }
  }

  // ── 3. 매체 구성 (썸네일 카드 — 화면 MediaDetailCard 근접) ──
  const thumbs = await loadExportThumbMap(p.portfolio);
  const thumbBox = PLANNER_EXPORT_THUMB_BOX_MM;
  const THUMB_W_IN = 2.35 * (thumbBox.w / EXPORT_THUMB_BOX_MM.w);
  const THUMB_H_IN = (THUMB_W_IN * thumbBox.h) / thumbBox.w;
  const CARD_X = 0.55;
  const CARD_W = 12.2;
  const CARD_GAP = 0.28;

  function drawPptMediaCard(
    slide: PptxSlide,
    row: PlannerExportMediaRow,
    cardY: number,
    cardH: number,
  ) {
    const isCustom = row.kind === "custom";
    slide.addShape(pptx.ShapeType.roundRect, {
      x: CARD_X,
      y: cardY,
      w: CARD_W,
      h: cardH,
      fill: { color: WHITE },
      rectRadius: 0.08,
      line: { color: isCustom ? "C4B5FD" : "E5E7EB", width: 0.75 },
    });
    const hasThumb = !isCustom && Boolean(row.thumbUrl?.trim());
    const thumb = hasThumb && row.thumbUrl ? thumbs.get(row.thumbUrl) : undefined;
    const textX = hasThumb ? 0.75 + THUMB_W_IN + 0.25 : 0.75;
    const textW = CARD_X + CARD_W - textX - 0.25;
    const colW = (textW - 0.15) / 2;

    if (thumb) {
      try {
        slide.addImage({
          data: thumb,
          x: 0.75,
          y: cardY + 0.2,
          w: THUMB_W_IN,
          h: THUMB_H_IN,
        });
      } catch {
        /* broken thumb */
      }
    } else if (hasThumb && row.thumbUrl?.trim()) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.75,
        y: cardY + 0.2,
        w: THUMB_W_IN,
        h: THUMB_H_IN,
        fill: { color: "F8F9FC" },
        rectRadius: 0.06,
        line: { color: "E5E7EB", width: 0.5 },
      });
      slide.addText(isKo ? "이미지 없음" : "No image", {
        x: 0.75,
        y: cardY + 0.2 + THUMB_H_IN / 2 - 0.2,
        w: THUMB_W_IN,
        h: 0.4,
        fontFace: face,
        fontSize: 9,
        color: GRAY,
        align: "center",
      });
    }

    let ty = cardY + 0.28;
    slide.addText(row.name, {
      x: textX,
      y: ty,
      w: textW,
      h: 0.35,
      fontFace: face,
      fontSize: 12,
      color: INK,
      bold: true,
    });
    ty += 0.32;
    if (row.location) {
      slide.addText(row.location, {
        x: textX,
        y: ty,
        w: textW,
        h: 0.22,
        fontFace: face,
        fontSize: 10,
        color: GRAY,
      });
      ty += 0.22;
    }
    if (row.categoryLabel) {
      slide.addText(row.categoryLabel, {
        x: textX,
        y: ty,
        w: textW,
        h: 0.2,
        fontFace: face,
        fontSize: 10,
        color: GRAY,
      });
      ty += 0.22;
    }

    const specs = collectMediaCardSpecs(row, isKo);
    if (specs.length > 0) {
      ty += 0.08;
      for (let i = 0; i < specs.length; i += 2) {
        const drawSpec = (spec: { label: string; value: string }, sx: number) => {
          slide.addText(
            [
              { text: `${spec.label} `, options: { color: GRAY, fontSize: 9 } },
              { text: spec.value, options: { color: INK, fontSize: 9, bold: true } },
            ].map((p) => ({ ...p, options: { ...p.options, fontFace: face } })),
            { x: sx, y: ty, w: colW, h: 0.22 },
          );
        };
        drawSpec(specs[i]!, textX);
        if (specs[i + 1]) drawSpec(specs[i + 1]!, textX + colW + 0.15);
        ty += 0.24;
      }
    }

    if (row.monthlyPriceLabel || row.lineTotalLabel) {
      ty += 0.06;
      if (row.monthlyPriceLabel) {
        slide.addText(isKo ? "월 단가" : "Monthly", {
          x: textX,
          y: ty,
          w: colW,
          h: 0.16,
          fontFace: face,
          fontSize: 8,
          color: GRAY,
        });
        slide.addText(row.monthlyPriceLabel, {
          x: textX,
          y: ty + 0.16,
          w: colW,
          h: 0.2,
          fontFace: face,
          fontSize: 10,
          color: ACCENT,
          bold: true,
        });
      }
      if (row.lineTotalLabel) {
        slide.addText(isKo ? "집행 소계" : "Subtotal", {
          x: textX + colW + 0.15,
          y: ty,
          w: colW,
          h: 0.16,
          fontFace: face,
          fontSize: 8,
          color: GRAY,
        });
        slide.addText(row.lineTotalLabel, {
          x: textX + colW + 0.15,
          y: ty + 0.16,
          w: colW,
          h: 0.2,
          fontFace: face,
          fontSize: 10,
          color: ACCENT,
          bold: true,
        });
      }
      ty += 0.42;
    }

    if (row.recommendReason?.trim()) {
      slide.addText(
        [
          { text: isKo ? "추천 " : "Why ", options: { color: ACCENT, bold: true, fontSize: 10 } },
          { text: row.recommendReason.trim(), options: { color: GRAY, fontSize: 10 } },
        ].map((p) => ({ ...p, options: { ...p.options, fontFace: face } })),
        { x: textX, y: ty, w: textW, h: 0.35, valign: "top" },
      );
      ty += 0.36;
    }

    if (showMediaCardContributions(p.portfolio.length, row)) {
      const barY = ty + 0.04;
      if (row.exposureContributionPct != null && row.budgetContributionPct != null) {
        addPptContributionBar(
          slide,
          pptx,
          textX,
          barY,
          colW,
          isKo ? "실노출 기여(추정)" : "Reach share (est.)",
          row.exposureContributionPct,
          INK_DEEP_BAR,
          face,
        );
        addPptContributionBar(
          slide,
          pptx,
          textX + colW + 0.15,
          barY,
          colW,
          isKo ? "예산 비중" : "Budget share",
          row.budgetContributionPct,
          ACCENT,
          face,
        );
      } else if (row.exposureContributionPct != null) {
        addPptContributionBar(
          slide,
          pptx,
          textX,
          barY,
          textW,
          isKo ? "실노출 기여(추정)" : "Reach share (est.)",
          row.exposureContributionPct,
          INK_DEEP_BAR,
          face,
        );
      } else if (row.budgetContributionPct != null) {
        addPptContributionBar(
          slide,
          pptx,
          textX,
          barY,
          textW,
          isKo ? "예산 비중" : "Budget share",
          row.budgetContributionPct,
          ACCENT,
          face,
        );
      }
    }

    const mediaUrl = plannerMediaPageUrl(row.id, isKo);
    if (mediaUrl) {
      const btnW = 2.55;
      const btnH = 0.32;
      const btnX = CARD_X + CARD_W - btnW - 0.22;
      const btnY = cardY + cardH - btnH - 0.22;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: btnX,
        y: btnY,
        w: btnW,
        h: btnH,
        fill: { color: WHITE },
        line: { color: ACCENT, width: 1.25 },
        rectRadius: 0.06,
      });
      slide.addText(plannerMediaPageButtonLabel(isKo), {
        x: btnX,
        y: btnY,
        w: btnW,
        h: btnH,
        fontFace: face,
        fontSize: 9,
        color: ACCENT,
        bold: true,
        align: "center",
        valign: "middle",
        hyperlink: { url: mediaUrl },
      });
    }
  }

  function drawPptMediaTile(
    slide: PptxSlide,
    row: PlannerExportMediaRow,
    tx: number,
    ty: number,
    tw: number,
    th: number,
  ) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: tx,
      y: ty,
      w: tw,
      h: th,
      fill: { color: WHITE },
      rectRadius: 0.06,
      line: { color: "E5E7EB", width: 0.5 },
    });
    const pad = 0.12;
    const thumbSize = Math.min(tw - pad * 2, th * 0.42);
    const thumb = row.thumbUrl ? thumbs.get(row.thumbUrl) : undefined;
    if (thumb) {
      try {
        slide.addImage({
          data: thumb,
          x: tx + (tw - thumbSize) / 2,
          y: ty + pad,
          w: thumbSize,
          h: thumbSize,
        });
      } catch {
        /* broken thumb */
      }
    } else if (row.thumbUrl?.trim()) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: tx + (tw - thumbSize) / 2,
        y: ty + pad,
        w: thumbSize,
        h: thumbSize,
        fill: { color: "F8F9FC" },
        rectRadius: 0.04,
        line: { color: "E5E7EB", width: 0.5 },
      });
    }
    let textY = ty + pad + thumbSize + 0.12;
    const mediaUrl = plannerMediaPageUrl(row.id, isKo);
    slide.addText(row.name, {
      x: tx + pad,
      y: textY,
      w: tw - pad * 2,
      h: 0.38,
      fontFace: face,
      fontSize: 9,
      color: INK,
      bold: true,
      ...(mediaUrl ? { hyperlink: { url: mediaUrl } } : {}),
    });
    textY += 0.34;
    const meta = exportMediaLineMetaParts(row).join(" · ");
    if (meta) {
      slide.addText(meta, {
        x: tx + pad,
        y: textY,
        w: tw - pad * 2,
        h: 0.2,
        fontFace: face,
        fontSize: 8,
        color: GRAY,
      });
      textY += 0.2;
    }
    const price = row.monthlyPriceLabel ?? row.priceLabel;
    if (price) {
      slide.addText(price, {
        x: tx + pad,
        y: textY,
        w: tw - pad * 2,
        h: 0.22,
        fontFace: face,
        fontSize: 9,
        color: ACCENT,
        bold: true,
      });
    }
    if (mediaUrl) {
      slide.addText(isKo ? "상세 →" : "Details →", {
        x: tx + tw - pad - 0.55,
        y: ty + th - 0.28,
        w: 0.55,
        h: 0.2,
        fontFace: face,
        fontSize: 7.5,
        color: ACCENT,
        align: "right",
        hyperlink: { url: mediaUrl },
      });
    }
  }

  function drawPptMediaCompactTile(
    slide: PptxSlide,
    row: PlannerExportMediaRow,
    tx: number,
    ty: number,
    tw: number,
    th: number,
  ) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: tx,
      y: ty,
      w: tw,
      h: th,
      fill: { color: WHITE },
      rectRadius: 0.05,
      line: { color: "E5E7EB", width: 0.5 },
    });
    const thumbSize = 0.55;
    const thumb = row.thumbUrl ? thumbs.get(row.thumbUrl) : undefined;
    if (thumb) {
      try {
        slide.addImage({
          data: thumb,
          x: tx + 0.1,
          y: ty + (th - thumbSize) / 2,
          w: thumbSize,
          h: thumbSize,
        });
      } catch {
        /* broken thumb */
      }
    }
    const textX = tx + thumbSize + 0.22;
    const textW = tw - thumbSize - 0.32;
    const mediaUrl = plannerMediaPageUrl(row.id, isKo);
    slide.addText(row.name, {
      x: textX,
      y: ty + 0.14,
      w: textW,
      h: 0.28,
      fontFace: face,
      fontSize: 8.5,
      color: INK,
      bold: true,
      ...(mediaUrl ? { hyperlink: { url: mediaUrl } } : {}),
    });
    const meta = exportMediaLineMetaParts(row, { includePrice: true }).join(" · ");
    if (meta) {
      slide.addText(meta, {
        x: textX,
        y: ty + 0.44,
        w: textW,
        h: 0.24,
        fontFace: face,
        fontSize: 8,
        color: GRAY,
      });
    }
  }

  const { grouped, segments } = buildPortfolioLineupSegments(p);
  let lineupSlideIdx = 0;

  if (p.portfolio.length === 0) {
    const s3 = pptx.addSlide();
    header(s3, isKo ? "매체 구성" : "Media lineup");
    s3.addText(isKo ? "포트폴리오에 담긴 매체가 없습니다." : "No media selected.", {
      x: 0.7, y: 2.2, w: 12, h: 0.5, fontFace: face, fontSize: 14, color: GRAY, align: "center",
    });
  } else if (lineupViewMode === "card") {
    const COLS = 3;
    const MARGIN_X = 0.6;
    const GRID_W = W - MARGIN_X * 2;
    const GAP = 0.22;
    const cellW = (GRID_W - GAP * (COLS - 1)) / COLS;
    const cellH = 2.5;
    const bottomY = 7.15;
    const rowSpan = cellH + GAP;

    for (const seg of segments) {
      let idx = 0;
      while (idx < seg.items.length) {
        const slide = pptx.addSlide();
        header(slide, lineupSlideTitle(lineupSlideIdx));
        let startY = 1.15;
        if (grouped) {
          startY = addPptRegionHeader(slide, seg.regionLabel, startY);
          startY = addPptCategoryHeader(slide, seg.categoryLabel, startY);
        }
        const rowsFit = Math.max(1, Math.floor((bottomY - startY + GAP) / rowSpan));
        const perSlide = rowsFit * COLS;
        const chunk = seg.items.slice(idx, idx + perSlide);
        chunk.forEach((row, j) => {
          const col = j % COLS;
          const rowIdx = Math.floor(j / COLS);
          const tx = MARGIN_X + col * (cellW + GAP);
          const ty = startY + rowIdx * rowSpan;
          drawPptMediaTile(slide, row, tx, ty, cellW, cellH);
        });
        idx += chunk.length;
        lineupSlideIdx += 1;
      }
    }
  } else if (lineupViewMode === "compact") {
    const COLS = 4;
    const MARGIN_X = 0.55;
    const GRID_W = W - MARGIN_X * 2;
    const GAP = 0.18;
    const cellW = (GRID_W - GAP * (COLS - 1)) / COLS;
    const cellH = 0.95;
    const bottomY = 7.1;
    const rowSpan = cellH + GAP;

    for (const seg of segments) {
      let idx = 0;
      while (idx < seg.items.length) {
        const slide = pptx.addSlide();
        header(slide, lineupSlideTitle(lineupSlideIdx));
        let startY = 1.15;
        if (grouped) {
          startY = addPptRegionHeader(slide, seg.regionLabel, startY);
          startY = addPptCategoryHeader(slide, seg.categoryLabel, startY);
        }
        const rowsFit = Math.max(1, Math.floor((bottomY - startY + GAP) / rowSpan));
        const perSlide = rowsFit * COLS;
        const chunk = seg.items.slice(idx, idx + perSlide);
        chunk.forEach((row, j) => {
          const col = j % COLS;
          const rowIdx = Math.floor(j / COLS);
          const tx = MARGIN_X + col * (cellW + GAP);
          const ty = startY + rowIdx * rowSpan;
          drawPptMediaCompactTile(slide, row, tx, ty, cellW, cellH);
        });
        idx += chunk.length;
        lineupSlideIdx += 1;
      }
    }
  } else {
    let slide: PptxSlide | null = null;
    let cardY = 1.2;
    const maxY = 6.85;
    let rendered = 0;
    let prevRegion = "";
    let prevCategory = "";

    const beginLineupSlide = () => {
      slide = pptx.addSlide();
      header(slide, lineupSlideTitle(lineupSlideIdx));
      cardY = 1.2;
      prevRegion = "";
      prevCategory = "";
      lineupSlideIdx += 1;
    };

    const paintSegmentHeaders = (seg: (typeof segments)[number]) => {
      if (!grouped || !slide) return;
      if (seg.regionLabel !== prevRegion) {
        cardY = addPptRegionHeader(slide, seg.regionLabel, cardY);
        prevRegion = seg.regionLabel;
        prevCategory = "";
      }
      if (seg.categoryLabel !== prevCategory) {
        cardY = addPptCategoryHeader(slide, seg.categoryLabel, cardY);
        prevCategory = seg.categoryLabel;
      }
    };

    for (const seg of segments) {
      for (const row of seg.items) {
        if (rendered >= 12) break;
        const cardH = estimatePptCardHeight(row, p.portfolio.length, isKo, THUMB_H_IN);
        const headerReserve = grouped ? 0.8 : 0;
        if (!slide || cardY + headerReserve + cardH > maxY) {
          beginLineupSlide();
        }
        paintSegmentHeaders(seg);
        if (cardY + cardH > maxY) {
          beginLineupSlide();
          paintSegmentHeaders(seg);
        }
        drawPptMediaCard(slide!, row, cardY, cardH);
        cardY += cardH + CARD_GAP;
        rendered += 1;
      }
      if (rendered >= 12) break;
    }
  }

  if (p.budgetHonesty?.mixVsBudgetFootnote && lineupSlideIdx > 0) {
    const slides = (
      pptx as unknown as { slides?: { addText: (t: string, o: object) => void }[] }
    ).slides;
    const lastLineup = slides?.[slides.length - 1];
    lastLineup?.addText(p.budgetHonesty.mixVsBudgetFootnote, {
      x: 0.6,
      y: 7.18,
      w: 12.1,
      h: 0.28,
      fontFace: face,
      fontSize: 11,
      bold: true,
      color: "B91C1C",
    });
  }

  if (p.partialRateNotice && lineupSlideIdx > 0) {
    const slides = (
      pptx as unknown as { slides?: { addText: (t: string, o: object) => void }[] }
    ).slides;
    const lastLineup = slides?.[slides.length - 1];
    lastLineup?.addText(p.partialRateNotice, {
      x: 0.6,
      y: 7.46,
      w: 12.1,
      h: 0.28,
      fontFace: face,
      fontSize: 9,
      color: "92400E",
    });
  }

  if (p.unpricedMediaNotice && lineupSlideIdx > 0) {
    const slides = (
      pptx as unknown as { slides?: { addText: (t: string, o: object) => void }[] }
    ).slides;
    const lastLineup = slides?.[slides.length - 1];
    lastLineup?.addText(p.unpricedMediaNotice, {
      x: 0.6,
      y: p.partialRateNotice ? 7.74 : 7.46,
      w: 12.1,
      h: 0.28,
      fontFace: face,
      fontSize: 9,
      color: "92400E",
    });
  }

  // ── 3b. 온라인 채널 (PR6-b) ──
  if (p.onlineSection && p.onlineSection.lines.length > 0) {
    const sec = p.onlineSection;
    const sOnline = pptx.addSlide();
    header(sOnline, sec.title);
    let oy = 1.2;
    sOnline.addText(sec.estimationNotice, {
      x: 0.6,
      y: oy,
      w: 12.1,
      h: 0.55,
      fontFace: face,
      fontSize: 11,
      color: GRAY,
    });
    oy += 0.55;
    if (sec.consultationNotice) {
      sOnline.addText(sec.consultationNotice, {
        x: 0.6,
        y: oy,
        w: 12.1,
        h: 0.35,
        fontFace: face,
        fontSize: 11,
        bold: true,
        color: "92400E",
      });
      oy += 0.4;
    }
    const consult = isKo ? "별도 협의" : "Consultation";
    const fmtWon = (n: number) =>
      `₩${n.toLocaleString(isKo ? "ko-KR" : "en-US")}`;
    const oHead = [
      isKo ? "매체" : "Media",
      isKo ? "플랫폼" : "Platform",
      isKo ? "과금" : "Pricing",
      isKo ? "월 예산" : "Monthly",
      isKo ? "예상 도달" : "Est. reach",
      isKo ? "예상 클릭" : "Est. clicks",
    ].map((t) => ({
      text: t,
      options: {
        fill: { color: INK_DEEP_BAR },
        color: WHITE,
        bold: true,
        fontFace: face,
        fontSize: 10,
      },
    }));
    const oBody = sec.lines.map((r, i) => {
      const fill = i % 2 ? { color: LIGHT } : { color: WHITE };
      return [
        { text: r.name, options: { fill, color: INK, fontFace: face, fontSize: 10 } },
        { text: r.platform ?? "—", options: { fill, color: GRAY, fontFace: face, fontSize: 10 } },
        { text: r.pricingLabel, options: { fill, color: GRAY, fontFace: face, fontSize: 9 } },
        { text: fmtWon(r.budgetWon), options: { fill, color: INK, fontFace: face, fontSize: 10 } },
        { text: r.reachLabel ?? consult, options: { fill, color: GRAY, fontFace: face, fontSize: 10 } },
        { text: r.clicksLabel ?? consult, options: { fill, color: GRAY, fontFace: face, fontSize: 10 } },
      ];
    });
    sOnline.addTable([oHead, ...oBody], {
      x: 0.6,
      y: oy + 0.15,
      w: 12.1,
      colW: [2.4, 1.8, 2.2, 2.0, 1.9, 1.8],
      border: { type: "solid", color: "E4E6EC", pt: 0.5 },
      rowH: 0.36,
      valign: "middle",
    });
  }

  // ── 4. 디지털 배분 (통합) ──
  if (p.digital && p.digital.length) {
    const s4 = pptx.addSlide();
    header(s4, isKo ? "디지털 예산 배분" : "Digital budget allocation");
    if (p.digitalSummary) {
      s4.addText(p.digitalSummary, { x: 0.6, y: 1.2, w: 12.1, h: 0.5, fontFace: face, fontSize: 12, color: GRAY });
    }
    const dHead = [isKo ? "플랫폼" : "Platform", isKo ? "비중" : "Share", isKo ? "예상 노출" : "Est. impressions"].map((t) => ({
      text: t, options: { fill: { color: INK_DEEP_BAR }, color: WHITE, bold: true, fontFace: face, fontSize: 12 },
    }));
    const dBody = p.digital.map((r, i) => {
      const fill = i % 2 ? { color: LIGHT } : { color: WHITE };
      return [
        { text: r.platform, options: { fill, color: INK, fontFace: face, fontSize: 11 } },
        { text: `${r.sharePct}%`, options: { fill, color: GRAY, fontFace: face, fontSize: 11 } },
        { text: fmtImp(r.impressions, isKo), options: { fill, color: INK, fontFace: face, fontSize: 11 } },
      ];
    });
    s4.addTable([dHead, ...dBody], {
      x: 0.6, y: p.digitalSummary ? 1.8 : 1.25, w: 12.1, colW: [6.5, 2.3, 3.3],
      border: { type: "solid", color: "E4E6EC", pt: 0.5 }, rowH: 0.38, valign: "middle",
    });
  }

  // ── 5+. 추가 섹션 (PRO 인사이트) ──
  for (const sec of exportSections ?? []) {
    if (!sec.lines.length) continue;
    const s = pptx.addSlide();
    header(s, sec.title);
    s.addText(
      sec.lines.map((line) => ({ text: line, options: { bullet: { code: "2022" }, color: INK, fontFace: face, fontSize: 14, paraSpaceAfter: 8 } })),
      { x: 0.7, y: 1.4, w: 12, h: 5.3, valign: "top" },
    );
  }

  // ── 면책 ──
  const last = pptx.addSlide();
  last.background = { color: WHITE };
  const footerText = [p.currencyFootnote, p.pricingFootnote, p.disclaimer]
    .filter(Boolean)
    .join("\n\n");
  last.addText(footerText, {
    x: 0.8, y: 3.2, w: 11.7, h: 1.2, fontFace: face, fontSize: 11, color: GRAY, align: "center", valign: "middle",
  });

  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return new Uint8Array(buf);
}
