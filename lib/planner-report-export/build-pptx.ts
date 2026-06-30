import { EXPORT_THUMB_BOX_MM, PLANNER_EXPORT_THUMB_BOX_MM, loadExportThumbMap } from "@/lib/export-media-images";
import type {
  PlannerExportMediaRow,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import { plannerChartColorPptx } from "@/lib/planner-chart-colors";
import { formatPlannerSharePct } from "@/lib/planner-logic";
import type { PlannerPerformanceGuide } from "@/lib/planner-report-performance-guide";
import {
  plannerMediaPageButtonLabel,
  plannerMediaPageUrl,
} from "@/lib/planner-report-export/media-page-url";
import { shortMediaUrl } from "@/lib/planner-report-export/draw-media-link";

/**
 * 플래너 보고서 PPTX — pptxgenjs 로 편집 가능한 제안서 슬라이드를 생성한다.
 * 텍스트/표/도형 네이티브 요소라 영업팀이 PowerPoint 에서 바로 수정 가능.
 */

const VIOLET = "7C3AED";
const CYAN = "0891B2";
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

export async function buildPlannerReportPptx(
  p: PlannerReportExportPayload,
): Promise<Uint8Array> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.author = "THINKAD";
  pptx.company = "THINKAD";
  pptx.title = p.documentTitle;

  const isKo = p.isKo;
  const face = isKo ? "Malgun Gothic" : "Arial";
  const W = 13.33;

  const CYAN_LT = "7CDCEB";
  const wordmark = (size: number) => [
    { text: "THINK", options: { color: WHITE, bold: true } },
    { text: "AD", options: { color: CYAN_LT, bold: true } },
  ].map((r) => ({ ...r, options: { ...r.options, fontFace: face, fontSize: size } }));

  // ── 1. 표지 ──
  const cover = pptx.addSlide();
  cover.background = { color: VIOLET };
  cover.addText(wordmark(30), { x: 0.7, y: 1.35, w: 6, h: 0.7 });
  cover.addText("CAMPAIGN PLANNER", {
    x: 0.72, y: 2.05, w: 9, h: 0.4, fontFace: face,
    fontSize: 12, color: "D6C7FF", charSpacing: 3,
  });
  cover.addText(p.documentTitle, {
    x: 0.7, y: 2.7, w: 12, h: 1.4, fontFace: face,
    fontSize: 38, bold: true, color: WHITE,
  });
  cover.addShape(pptx.ShapeType.rect, { x: 0.72, y: 4.0, w: 2.2, h: 0.06, fill: { color: CYAN } });
  cover.addText(
    p.kind === "integrated"
      ? isKo ? "OOH + 디지털 통합 캠페인 제안" : "OOH + Digital integrated campaign"
      : isKo ? "OOH 미디어 캠페인 플랜" : "OOH media campaign plan",
    { x: 0.7, y: 4.25, w: 12, h: 0.5, fontFace: face, fontSize: 17, color: "E1DCF5" },
  );
  if (p.clientName) {
    cover.addText(`${p.clientName} ${isKo ? "귀중" : ""}`.trim(), {
      x: 0.7, y: 6.0, w: 12, h: 0.4, fontFace: face, fontSize: 14, color: WHITE,
    });
  }
  cover.addText(p.generatedAt, {
    x: 0.7, y: 6.6, w: 12, h: 0.4, fontFace: face, fontSize: 12, color: "CFC8EC",
  });

  // 공통 헤더 그리기
  function header(slide: ReturnType<typeof pptx.addSlide>, label: string) {
    slide.background = { color: WHITE };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.9, fill: { color: VIOLET } });
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

  // ── 2. 캠페인 요약 + KPI ──
  const s2 = pptx.addSlide();
  header(s2, isKo ? "캠페인 개요" : "Campaign overview");
  const summaryRows: Array<[string, string]> = [
    [isKo ? "캠페인 목표" : "Goal", p.goalTitle || "—"],
    [isKo ? "총 예산" : "Total budget", isKo ? `${p.budgetMan.toLocaleString()}만원` : `${p.budgetMan.toLocaleString()}M KRW`],
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
    s2.addText(k.value, { x: 8.4, y: ky + 0.42, w: 4.1, h: 0.55, fontFace: face, fontSize: 20, bold: true, color: VIOLET });
  });

  // ── 2.5 성과 요약 (도형 차트 — Keynote·Google Slides 호환) ──
  const ch = p.charts;
  if (
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
        color: CYAN,
        face,
        fmt: (n) => fmtImp(n, isKo),
      });
    }
    if (ch.cpmBars?.length) {
      addShapeBarChart(sc, pptx, {
        title: isKo ? "CPM 비교 (원)" : "CPM (KRW)",
        x: barX,
        y: ch.reachSummary?.length ? rightY + 0.15 : rightY,
        w: barW,
        rows: ch.cpmBars,
        color: VIOLET,
        face,
        fmt: (n) => `₩${fmtImp(n, isKo)}`,
        colorByRow: true,
      });
    }
  }

  if (ch?.performanceGuide) {
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
          color: VIOLET,
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

  if (p.recommendRationale) {
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

  // ── 3. 매체 구성 (썸네일 카드 — 화면 미리보기와 동일) ──
  const thumbs = await loadExportThumbMap(p.portfolio);
  const thumbBox = PLANNER_EXPORT_THUMB_BOX_MM;
  /** 20mm 기준 2.35in — 플래너 확대 썸네일에 비례 스케일 */
  const THUMB_W_IN = 2.35 * (thumbBox.w / EXPORT_THUMB_BOX_MM.w);
  const THUMB_H_IN = (THUMB_W_IN * thumbBox.h) / thumbBox.w;
  const PPT_CARD_H = 2.95;
  const PPT_CARD_STEP = 3.2;

  function mediaRichLines(row: PlannerExportMediaRow) {
    type Part = { text: string; options: Record<string, unknown> };
    const parts: Part[] = [
      { text: `${row.name}\n`, options: { bold: true, color: INK, fontSize: 12 } },
    ];
    for (const line of [row.location, row.categoryLabel].filter(Boolean) as string[]) {
      parts.push({ text: `${line}\n`, options: { color: GRAY, fontSize: 10 } });
    }
    if (row.dailyTraffic) {
      parts.push({
        text: `${isKo ? "일일 노출" : "Daily"} ${row.dailyTraffic.toLocaleString(isKo ? "ko-KR" : "en-US")}\n`,
        options: { color: CYAN, bold: true, fontSize: 10 },
      });
    }
    if (row.monthlyPriceLabel) {
      parts.push({
        text: `${isKo ? "월 단가" : "Monthly"} ${row.monthlyPriceLabel}\n`,
        options: { color: VIOLET, bold: true, fontSize: 10 },
      });
    }
    if (row.lineTotalLabel) {
      parts.push({
        text: `${isKo ? "집행 소계" : "Subtotal"} ${row.lineTotalLabel}\n`,
        options: { color: VIOLET, bold: true, fontSize: 10 },
      });
    }
    if (row.recommendReason?.trim()) {
      parts.push({
        text: `${isKo ? "추천" : "Why"} ${row.recommendReason.trim()}\n`,
        options: { color: GRAY, fontSize: 10 },
      });
    }
    if (p.portfolio.length > 1) {
      const contrib = [
        row.exposureContributionPct != null
          ? `${isKo ? "노출 기여" : "Exposure"} ${row.exposureContributionPct}%`
          : null,
        row.budgetContributionPct != null
          ? `${isKo ? "예산 비중" : "Budget"} ${row.budgetContributionPct}%`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
      if (contrib) {
        parts.push({ text: contrib, options: { color: CYAN, bold: true, fontSize: 10 } });
      }
    }
    return parts.map((p) => ({
      ...p,
      options: { ...p.options, fontFace: face },
    }));
  }

  const portfolio = p.portfolio.slice(0, 12);
  if (portfolio.length === 0) {
    const s3 = pptx.addSlide();
    header(s3, isKo ? "매체 구성" : "Media lineup");
    s3.addText(isKo ? "포트폴리오에 담긴 매체가 없습니다." : "No media selected.", {
      x: 0.7, y: 2.2, w: 12, h: 0.5, fontFace: face, fontSize: 14, color: GRAY, align: "center",
    });
  } else {
    const perSlide = 2;
    for (let i = 0; i < portfolio.length; i += perSlide) {
      const chunk = portfolio.slice(i, i + perSlide);
      const slide = pptx.addSlide();
      header(
        slide,
        i === 0
          ? isKo
            ? "매체 구성"
            : "Media lineup"
          : isKo
            ? "매체 구성 (계속)"
            : "Media lineup (cont.)",
      );
      chunk.forEach((row, idx) => {
        const cardY = 1.2 + idx * PPT_CARD_STEP;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.55,
          y: cardY,
          w: 12.2,
          h: PPT_CARD_H,
          fill: { color: LIGHT },
          rectRadius: 0.08,
          line: { color: "E4E6EC", width: 0.75 },
        });
        const thumb = row.thumbUrl ? thumbs.get(row.thumbUrl) : undefined;
        const textX = 0.75 + THUMB_W_IN + 0.25;
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
            /* broken thumb — skip */
          }
        } else {
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.75,
            y: cardY + 0.2,
            w: THUMB_W_IN,
            h: THUMB_H_IN,
            fill: { color: WHITE },
            rectRadius: 0.06,
            line: { color: "E4E6EC", width: 0.5 },
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
        slide.addText(mediaRichLines(row), {
          x: textX,
          y: cardY + 0.25,
          w: 0.55 + 12.2 - (textX - 0.55) - 0.2,
          h: PPT_CARD_H - 0.5,
          valign: "top",
        });
        const mediaUrl = plannerMediaPageUrl(row.id, isKo);
        if (mediaUrl) {
          const btnLabel = plannerMediaPageButtonLabel(isKo);
          const btnW = 2.55;
          const btnH = 0.32;
          const btnX = 0.55 + 12.2 - btnW - 0.22;
          const btnY = cardY + PPT_CARD_H - btnH - 0.22;
          slide.addShape(pptx.ShapeType.roundRect, {
            x: btnX,
            y: btnY,
            w: btnW,
            h: btnH,
            fill: { color: WHITE },
            line: { color: VIOLET, width: 1.25 },
            rectRadius: 0.06,
          });
          slide.addText(btnLabel, {
            x: btnX,
            y: btnY,
            w: btnW,
            h: btnH,
            fontFace: face,
            fontSize: 9,
            color: VIOLET,
            bold: true,
            align: "center",
            valign: "middle",
            hyperlink: { url: mediaUrl },
          });
          slide.addText(shortMediaUrl(mediaUrl), {
            x: btnX - 0.15,
            y: btnY + btnH + 0.04,
            w: btnW + 0.3,
            h: 0.22,
            fontFace: face,
            fontSize: 7,
            color: CYAN,
            align: "right",
            hyperlink: { url: mediaUrl },
          });
        }
      });
    }
  }

  // ── 4. 디지털 배분 (통합) ──
  if (p.digital && p.digital.length) {
    const s4 = pptx.addSlide();
    header(s4, isKo ? "디지털 예산 배분" : "Digital budget allocation");
    if (p.digitalSummary) {
      s4.addText(p.digitalSummary, { x: 0.6, y: 1.2, w: 12.1, h: 0.5, fontFace: face, fontSize: 12, color: GRAY });
    }
    const dHead = [isKo ? "플랫폼" : "Platform", isKo ? "비중" : "Share", isKo ? "예상 노출" : "Est. impressions"].map((t) => ({
      text: t, options: { fill: { color: CYAN }, color: WHITE, bold: true, fontFace: face, fontSize: 12 },
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
  for (const sec of p.sections ?? []) {
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
  last.addText(p.disclaimer, {
    x: 0.8, y: 3.2, w: 11.7, h: 1.2, fontFace: face, fontSize: 11, color: GRAY, align: "center", valign: "middle",
  });

  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return new Uint8Array(buf);
}
