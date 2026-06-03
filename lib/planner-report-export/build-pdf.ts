import { registerNotoSansKrIfAvailable } from "@/lib/jspdf-register-noto-kr";
import { krFontFamily } from "@/lib/jspdf-kr-font-constants";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";

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

/** 차트 팔레트 (웹 CHART_COLORS 와 동일) */
const PALETTE = [
  [124, 58, 237],
  [8, 145, 178],
  [236, 72, 153],
  [16, 185, 129],
  [245, 158, 11],
] as const;

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
    segs: { label: string; value: number }[],
  ) {
    const total = segs.reduce((s, d) => s + d.value, 0);
    if (total <= 0) return;
    let a0 = -Math.PI / 2;
    segs.forEach((seg, i) => {
      const a1 = a0 + (seg.value / total) * 2 * Math.PI;
      const c = PALETTE[i % PALETTE.length]!;
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

  /** 가로 막대 차트 */
  function drawBars(
    x: number,
    w: number,
    rows: { label: string; value: number }[],
    color: readonly number[],
  ) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    const labelW = 30;
    const valW = 26;
    const barX = x + labelW;
    const barW = w - labelW - valW;
    for (const row of rows) {
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
      doc.setFillColor(color[0]!, color[1]!, color[2]!);
      doc.roundedRect(barX, y, Math.max(2, (barW * row.value) / max), 3.2, 1, 1, "F");
      setText(INK);
      doc.text(fmtImp(row.value, isKo), x + w, y + 3, { align: "right" });
      y += 7;
    }
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
        const c = PALETTE[i % PALETTE.length]!;
        doc.setFillColor(c[0]!, c[1]!, c[2]!);
        doc.rect(M + 50, ly - 2.6, 3, 3, "F");
        setText(GRAY_600);
        doc.setFontSize(8.5);
        const label = (doc.splitTextToSize(d.label, contentW - 75) as string[])[0] ?? d.label;
        doc.text(
          `${label}   ${Math.round((d.value / total) * 100)}%`,
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
    }

    if (ch.cpmBars && ch.cpmBars.length) {
      ensure(6 + ch.cpmBars.length * 7);
      doc.setFontSize(8);
      setText(GRAY_500);
      doc.text(isKo ? "CPM 비교 (원)" : "CPM comparison (KRW)", M, y + 2);
      y += 5;
      drawBars(M, contentW, ch.cpmBars, VIOLET);
      y += 3;
    }
    y += 4;
  }

  // ── 매체 구성 (디테일 카드) ──
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
      p.portfolio.forEach((row) => {
        const specLines = [
          row.location,
          row.categoryLabel,
          row.size ? `${isKo ? "규격" : "Size"} ${row.size}` : null,
          row.operatingHours
            ? `${isKo ? "운영" : "Hours"} ${row.operatingHours}`
            : null,
          row.dailyTraffic
            ? `${isKo ? "일일 노출" : "Daily"} ${row.dailyTraffic.toLocaleString(isKo ? "ko-KR" : "en-US")}`
            : null,
          row.broadcastLabel,
          row.monthlyPriceLabel
            ? `${isKo ? "월 단가" : "Monthly"} ${row.monthlyPriceLabel}`
            : null,
          row.lineTotalLabel
            ? `${isKo ? "집행 소계" : "Subtotal"} ${row.lineTotalLabel}`
            : null,
        ].filter(Boolean) as string[];
        if (p.portfolio.length > 1) {
          const contrib =
            row.exposureContributionPct != null || row.budgetContributionPct != null
              ? [
                  row.exposureContributionPct != null
                    ? `${isKo ? "노출 기여" : "Exposure"} ${row.exposureContributionPct}%`
                    : null,
                  row.budgetContributionPct != null
                    ? `${isKo ? "예산 비중" : "Budget"} ${row.budgetContributionPct}%`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "";
          if (contrib) specLines.push(contrib);
        }

        const block = [row.name, ...specLines].join("\n");
        const lines = doc.splitTextToSize(block, contentW - 6) as string[];
        const rh = Math.max(14, lines.length * 4.2 + 6);
        ensure(rh + 4);
        setFill(GRAY_50);
        setDraw(GRAY_200);
        doc.setLineWidth(0.2);
        doc.roundedRect(M, y, contentW, rh, 2, 2, "FD");
        setText(INK);
        doc.setFontSize(9);
        doc.text(lines.slice(0, 8), M + 3, y + 5.5);
        y += rh + 4;
      });
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
