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

  doc.setFont(FONT, "normal");
  doc.setTextColor(214, 199, 255);
  doc.setFontSize(11);
  doc.text("THINKAD CAMPAIGN PLANNER", M, 70);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(30);
  const titleLines = doc.splitTextToSize(p.documentTitle, contentW) as string[];
  doc.text(titleLines, M, 88);

  setFill(CYAN);
  doc.rect(M, 92 + titleLines.length * 11, 28, 1.6, "F");

  doc.setFontSize(13);
  doc.setTextColor(225, 220, 245);
  doc.text(subtitle, M, 104 + titleLines.length * 11);

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

  // ── 본문 헤더 배너 ──
  setFill(VIOLET);
  doc.rect(0, 0, pageW, 26, "F");
  setFill(CYAN);
  doc.rect(0, 26, pageW, 1.4, "F");

  doc.setFont(FONT, "normal");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(p.documentTitle, M, 13);
  doc.setFontSize(8);
  doc.setTextColor(225, 220, 245);
  doc.text(p.generatedAt, pageW - M, 13, { align: "right" });

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

  // ── 매체 포트폴리오 테이블 ──
  sectionTitle(isKo ? "선택 매체 구성" : "Selected media");
  {
    const cols = [
      { key: "name", label: isKo ? "매체" : "Media", w: contentW * 0.46 },
      { key: "region", label: isKo ? "지역" : "Region", w: contentW * 0.18 },
      { key: "type", label: isKo ? "유형" : "Type", w: contentW * 0.18 },
      { key: "priceLabel", label: isKo ? "비용" : "Price", w: contentW * 0.18 },
    ] as const;

    const drawHeader = () => {
      setFill(VIOLET);
      doc.rect(M, y, contentW, 7, "F");
      doc.setFont(FONT, "normal");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      let cx = M + 2;
      for (const c of cols) {
        doc.text(c.label, cx, y + 4.8);
        cx += c.w;
      }
      y += 7;
    };
    drawHeader();

    doc.setFontSize(8.5);
    if (p.portfolio.length === 0) {
      setText(GRAY_500);
      doc.text(
        isKo ? "포트폴리오에 담긴 매체가 없습니다." : "No media selected.",
        M + 2,
        y + 5,
      );
      y += 9;
    } else {
      p.portfolio.forEach((row, idx) => {
        const nameLines = doc.splitTextToSize(
          row.name || "—",
          cols[0].w - 3,
        ) as string[];
        const rh = Math.max(7, nameLines.length * 4 + 3);
        ensure(rh);
        if (idx % 2 === 1) {
          setFill(GRAY_50);
          doc.rect(M, y, contentW, rh, "F");
        }
        setText(INK);
        let cx = M + 2;
        doc.text(nameLines.slice(0, 2), cx, y + 4.6);
        cx += cols[0].w;
        setText(GRAY_600);
        doc.text(
          (doc.splitTextToSize(row.region || "—", cols[1].w - 3) as string[]).slice(0, 1),
          cx,
          y + 4.6,
        );
        cx += cols[1].w;
        doc.text(
          (doc.splitTextToSize(row.type || "—", cols[2].w - 3) as string[]).slice(0, 1),
          cx,
          y + 4.6,
        );
        cx += cols[2].w;
        setText(INK);
        doc.text(
          (doc.splitTextToSize(row.priceLabel || "—", cols[3].w - 3) as string[]).slice(0, 1),
          cx,
          y + 4.6,
        );
        y += rh;
        setDraw(GRAY_200);
        doc.setLineWidth(0.1);
        doc.line(M, y, pageW - M, y);
      });
    }
    y += 6;
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
