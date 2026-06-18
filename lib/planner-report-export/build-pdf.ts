import { registerNotoSansKrIfAvailable } from "@/lib/jspdf-register-noto-kr";
import { krFontFamily } from "@/lib/jspdf-kr-font-constants";
import { CONTACT_EMAIL } from "@/lib/constants";
import {
  addPdfThumbImage,
  EXPORT_THUMB_BOX_MM,
  loadExportThumbMap,
} from "@/lib/export-media-images";
import type {
  PlannerExportMediaRow,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import {
  plannerMediaPageButtonLabel,
  plannerMediaPageUrl,
} from "@/lib/planner-report-export/media-page-url";
import { addPdfMediaDetailLink } from "@/lib/planner-report-export/draw-media-link";
import { plannerChartColorRgb } from "@/lib/planner-chart-colors";
import { formatPlannerSharePct } from "@/lib/planner-logic";
import type { PlannerPerformanceGuide } from "@/lib/planner-report-performance-guide";
import type { PlannerExportChartDatum } from "@/lib/planner-report-export/types";

/**
 * 플래너 보고서 PDF — 서버에서 jsPDF 로 직접 그린다 (벡터 텍스트, 한글 폰트 내장).
 * 견적서 PDF(`build-korean-quote-pdf.ts`)와 동일한 서버 생성 패턴.
 */

const VIOLET = [124, 58, 237] as const; // #7C3AED
const CYAN = [8, 145, 178] as const; // cyan-600 (print-safe)
const INK = [17, 24, 39] as const;
const GRAY_600 = [75, 85, 99] as const;
const GRAY_500 = [107, 114, 128] as const;
const GRAY_200 = [228, 230, 236] as const;
const GRAY_50 = [248, 249, 251] as const;
const GRAY_100 = [238, 240, 244] as const;
const CYAN_LIGHT = [120, 220, 235] as const;

const M = 15;

function fmtImp(n: number, isKo: boolean): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

export async function buildPlannerReportPdf(
  p: PlannerReportExportPayload,
): Promise<Uint8Array> {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const hasKr = registerNotoSansKrIfAvailable(doc);
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
    if (y + need > pageH - 16) {
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
      doc.text("THINKAD CAMPAIGN PLANNER", M, pageH - 8);
      doc.text(`${i - 1} / ${pages - 1}`, pageW - M, pageH - 8, {
        align: "right",
      });
    }
  }

  function sectionTitle(label: string) {
    ensure(14);
    doc.setFont(FONT, "normal");
    doc.setFontSize(11);
    setFill(VIOLET);
    doc.rect(M, y, 1.6, 5.2, "F");
    setText(INK);
    doc.text(label, M + 4, y + 4.6);
    y += 9;
  }

  /** THINKAD 워드마크 (THINK 흰색 + AD 시안) */
  function drawWordmark(x: number, baseY: number, size: number) {
    doc.setFont(FONT, "normal");
    doc.setFontSize(size);
    doc.setTextColor(255, 255, 255);
    doc.text("THINK", x, baseY);
    const w = doc.getTextWidth("THINK");
    setText(CYAN_LIGHT);
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
      doc.roundedRect(barX, y, barW, 3.2, 1, 1, "F");
      const barRgb = plannerChartColorRgb(row.colorKey, i);
      doc.setFillColor(barRgb[0]!, barRgb[1]!, barRgb[2]!);
      doc.roundedRect(barX, y, Math.max(2, (barW * pct) / 100), 3.2, 1, 1, "F");
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
      doc.roundedRect(barX, y, barW, 3.2, 1, 1, "F");
      const barRgb = perRowColor ? plannerChartColorRgb(row.colorKey, i) : color;
      doc.setFillColor(barRgb[0]!, barRgb[1]!, barRgb[2]!);
      doc.roundedRect(barX, y, Math.max(2, (barW * row.value) / max), 3.2, 1, 1, "F");
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
    setText(VIOLET);
    doc.text(guide.title, M, y + 3);
    y += 7;

    doc.setFillColor(248, 245, 255);
    doc.roundedRect(M, y, contentW, rowH + guide.table.rows.length * rowH + 2, 2, 2, "F");

    doc.setFont(FONT, "bold");
    doc.setFontSize(7.5);
    setText(VIOLET);
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

  // ── 표지 페이지 ──
  setFill(VIOLET);
  doc.rect(0, 0, pageW, pageH, "F");
  setFill(CYAN);
  doc.rect(0, 0, pageW, 3, "F");

  drawWordmark(M, 50, 26);
  doc.setFont(FONT, "normal");
  doc.setTextColor(214, 199, 255);
  doc.setFontSize(10);
  doc.text("CAMPAIGN PLANNER", M, 58);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  const titleLines = doc.splitTextToSize(p.documentTitle, contentW) as string[];
  doc.text(titleLines, M, 92);

  setFill(CYAN);
  doc.rect(M, 92 + titleLines.length * 11, 28, 1.6, "F");

  doc.setFontSize(13);
  doc.setTextColor(225, 220, 245);
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
  doc.setTextColor(200, 188, 240);
  doc.text(p.generatedAt, M, pageH - 28);
  doc.text(
    `THINKAD (싱커드)   ·   ${CONTACT_EMAIL}   ·   02-515-2772`,
    M,
    pageH - 21,
  );

  doc.addPage();
  y = 0;

  // ── 본문 헤더 배너 (slim) ──
  setFill(VIOLET);
  doc.rect(0, 0, pageW, 26, "F");
  setFill(CYAN);
  doc.rect(0, 26, pageW, 1.4, "F");

  drawWordmark(M, 11, 12);
  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  doc.setTextColor(225, 220, 245);
  const headSub = [p.clientName, p.campaignName].filter(Boolean).join("  ·  ");
  if (headSub) doc.text(headSub, M, 19);
  doc.setTextColor(214, 199, 255);
  doc.text(p.generatedAt, pageW - M, 11, { align: "right" });
  doc.setTextColor(225, 220, 245);
  doc.text(p.documentTitle, pageW - M, 19, { align: "right" });

  y = 38;

  // ── 캠페인 요약 (라벨/값 2열) ──
  const summary: Array<[string, string]> = [
    [isKo ? "캠페인 목표" : "Goal", p.goalTitle || "—"],
    [
      isKo ? "총 예산" : "Total budget",
      isKo
        ? `${p.budgetMan.toLocaleString()}만원`
        : `${p.budgetMan.toLocaleString()}M KRW`,
    ],
    [isKo ? "집행 기간" : "Flight", p.periodDisplay || "—"],
    [isKo ? "지역" : "Regions", p.regionsText || "—"],
    [isKo ? "매체 유형" : "Media types", p.categoriesText || "—"],
    [isKo ? "타깃 연령" : "Target age", p.ageText || "—"],
    [isKo ? "업종" : "Industry", p.industryText || "—"],
  ];
  const colW = contentW / 2;
  const rowH = 12;
  summary.forEach(([label, value], i) => {
    const col = i % 2;
    const x = M + col * colW;
    if (col === 0) ensure(rowH);
    doc.setFont(FONT, "normal");
    doc.setFontSize(7.5);
    setText(GRAY_500);
    doc.text(label, x, y + 4);
    setText(INK);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(value, colW - 4) as string[];
    doc.text(lines.slice(0, 2), x, y + 9);
    if (col === 1 || i === summary.length - 1) y += rowH;
  });

  y += 2;
  setDraw(GRAY_200);
  doc.setLineWidth(0.3);
  doc.line(M, y, pageW - M, y);
  y += 8;

  // ── KPI 카드 행 ──
  if (p.kpis.length) {
    ensure(20);
    const kpis = p.kpis.slice(0, 4);
    const kW = contentW / kpis.length;
    kpis.forEach((k, i) => {
      const x = M + kW * i;
      setFill(GRAY_50);
      doc.roundedRect(x + 1, y, kW - 2, 16, 1.5, 1.5, "F");
      doc.setFont(FONT, "normal");
      doc.setFontSize(7);
      setText(GRAY_500);
      doc.text(k.label, x + 4, y + 5.5);
      setText(VIOLET);
      doc.setFontSize(12);
      const vLines = doc.splitTextToSize(k.value, kW - 7) as string[];
      doc.text(vLines.slice(0, 1), x + 4, y + 12);
    });
    y += 22;
  }

  // ── 성과 요약 차트 ──
  const ch = p.charts;
  if (
    ch &&
    ((ch.budgetSplit?.length ?? 0) > 0 ||
      (ch.cpmBars?.length ?? 0) > 0 ||
      (ch.reachSummary?.length ?? 0) > 0)
  ) {
    sectionTitle(isKo ? "성과 요약" : "Performance summary");

    if (ch.budgetSplit && ch.budgetSplit.length) {
      ensure(46);
      doc.setFontSize(8);
      setText(GRAY_500);
      doc.text(isKo ? "예산 배분" : "Budget allocation", M, y + 2);
      const cx = M + 22;
      const cy = y + 26;
      drawDonut(cx, cy, 18, 10, ch.budgetSplit);
      const total = ch.budgetSplit.reduce((s, d) => s + d.value, 0) || 1;
      let ly = y + 12;
      ch.budgetSplit.forEach((d, i) => {
        const c = plannerChartColorRgb(d.colorKey, i);
        doc.setFillColor(c[0]!, c[1]!, c[2]!);
        doc.rect(M + 50, ly - 2.6, 3, 3, "F");
        setText(GRAY_600);
        doc.setFontSize(8.5);
        const label = (doc.splitTextToSize(d.label, contentW - 75) as string[])[0] ?? d.label;
        doc.text(
          `${label}   ${formatPlannerSharePct(d.pct ?? (d.value / total) * 100)}`,
          M + 55,
          ly,
        );
        ly += 6.5;
      });
      y += 50;
    }

    if (ch.reachSummary && ch.reachSummary.length) {
      ensure(6 + ch.reachSummary.length * 7);
      doc.setFontSize(8);
      setText(GRAY_500);
      doc.text(isKo ? "노출 요약" : "Impressions", M, y + 2);
      y += 5;
      drawBars(M, contentW, ch.reachSummary, CYAN);
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
      doc.text(isKo ? "CPM 비교 (원)" : "CPM comparison (KRW)", M, y + 2);
      y += 5;
      drawBars(M, contentW, ch.cpmBars, VIOLET, true);
      y += 3;
    }
    if (ch.performanceGuide) {
      drawPerformanceGuide(ch.performanceGuide);
    }
    y += 4;
  }

  // ── 매체 구성 (디테일 카드) ──
  const thumbs = await loadExportThumbMap(p.portfolio);

  function drawMediaCard(row: PlannerExportMediaRow, thumb?: string) {
    const thumbW = thumb ? EXPORT_THUMB_BOX_MM.w + 2 : 0;
    const textX = M + 3 + thumbW;
    const textW = contentW - 6 - thumbW;
    const lines: Array<{ text: string; color: readonly number[]; bold?: boolean }> =
      [{ text: row.name, color: INK, bold: true }];

    for (const part of [
      row.location,
      row.categoryLabel,
      row.size ? `${isKo ? "규격" : "Size"} ${row.size}` : null,
      row.operatingHours
        ? `${isKo ? "운영" : "Hours"} ${row.operatingHours}`
        : null,
    ].filter(Boolean) as string[]) {
      lines.push({ text: part, color: GRAY_600 });
    }
    if (row.dailyTraffic) {
      lines.push({
        text: `${isKo ? "일일 노출" : "Daily"} ${row.dailyTraffic.toLocaleString(isKo ? "ko-KR" : "en-US")}`,
        color: CYAN,
        bold: true,
      });
    }
    if (row.broadcastLabel) lines.push({ text: row.broadcastLabel, color: GRAY_600 });
    if (row.monthlyPriceLabel) {
      lines.push({
        text: `${isKo ? "월 단가" : "Monthly"} ${row.monthlyPriceLabel}`,
        color: VIOLET,
        bold: true,
      });
    }
    if (row.lineTotalLabel) {
      lines.push({
        text: `${isKo ? "집행 소계" : "Subtotal"} ${row.lineTotalLabel}`,
        color: VIOLET,
        bold: true,
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
      if (contrib) lines.push({ text: contrib, color: CYAN, bold: true });
    }

    const mediaUrl = plannerMediaPageUrl(row.id, isKo);
    const linkBlockH = mediaUrl ? 11 : 0;

    const rh = Math.max(
      thumb ? EXPORT_THUMB_BOX_MM.h + 4 : 16,
      lines.length * 4.4 + 8 + linkBlockH,
    );
    ensure(rh + 4);
    setFill(GRAY_50);
    setDraw(GRAY_200);
    doc.setLineWidth(0.2);
    doc.roundedRect(M, y, contentW, rh, 2, 2, "FD");
    if (thumb) {
      addPdfThumbImage(doc, thumb, M + 2, y + 2);
    }
    let ty = y + 5.5;
    for (const line of lines) {
      doc.setFont(FONT, "normal");
      doc.setFontSize(line.bold ? 9.5 : 8.5);
      setText(line.color);
      const wrapped = doc.splitTextToSize(line.text, textW) as string[];
      doc.text(wrapped.slice(0, 2), textX, ty);
      ty += wrapped.length * 4.2 + 0.8;
    }
    if (mediaUrl) {
      const btnW = 48;
      const btnX = M + contentW - btnW - 3;
      const btnY = y + rh - linkBlockH + 1;
      addPdfMediaDetailLink(doc, {
        x: btnX,
        y: btnY,
        w: btnW,
        label: plannerMediaPageButtonLabel(isKo),
        url: mediaUrl,
        font: FONT,
        violet: VIOLET,
        cyan: CYAN,
      });
    }
    y += rh + 4;
  }

  sectionTitle(isKo ? "매체 구성" : "Media lineup");
  {
    doc.setFont(FONT, "normal");
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
    } else {
      for (const row of p.portfolio) {
        const thumb = row.thumbUrl ? thumbs.get(row.thumbUrl) : undefined;
        drawMediaCard(row, thumb);
      }
    }
    y += 4;
  }

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
    setFill(CYAN);
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
  for (const sec of p.sections ?? []) {
    if (!sec.lines.length) continue;
    sectionTitle(sec.title);
    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    for (const line of sec.lines) {
      const wrapped = doc.splitTextToSize(line, contentW - 5) as string[];
      ensure(wrapped.length * 4.6 + 1.5);
      setFill(VIOLET);
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
  const disc = doc.splitTextToSize(p.disclaimer, contentW) as string[];
  doc.text(disc, M, y + 2);

  footer();

  const ab = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(ab);
}
