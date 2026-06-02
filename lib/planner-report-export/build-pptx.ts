import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";

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

  // ── 1. 표지 ──
  const cover = pptx.addSlide();
  cover.background = { color: VIOLET };
  cover.addText("THINKAD CAMPAIGN PLANNER", {
    x: 0.7, y: 1.6, w: 12, h: 0.4, fontFace: face,
    fontSize: 12, color: "D6C7FF", charSpacing: 2,
  });
  cover.addText(p.documentTitle, {
    x: 0.7, y: 2.1, w: 12, h: 1.4, fontFace: face,
    fontSize: 40, bold: true, color: WHITE,
  });
  cover.addText(
    p.kind === "integrated"
      ? isKo ? "OOH + 디지털 통합 캠페인 제안" : "OOH + Digital integrated campaign"
      : isKo ? "OOH 미디어 캠페인 플랜" : "OOH media campaign plan",
    { x: 0.7, y: 3.5, w: 12, h: 0.5, fontFace: face, fontSize: 18, color: "E1DCF5" },
  );
  cover.addShape(pptx.ShapeType.rect, { x: 0.72, y: 4.3, w: 2.2, h: 0.06, fill: { color: CYAN } });
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
    slide.addText("THINKAD", {
      x: W - 3.1, y: 0.28, w: 2.5, h: 0.4, fontFace: face, fontSize: 12,
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

  // ── 3. 매체 구성 ──
  const s3 = pptx.addSlide();
  header(s3, isKo ? "선택 매체 구성" : "Selected media");
  const mediaHead = [
    { text: isKo ? "매체" : "Media", options: { fill: { color: VIOLET }, color: WHITE, bold: true, fontFace: face, fontSize: 12 } },
    { text: isKo ? "지역" : "Region", options: { fill: { color: VIOLET }, color: WHITE, bold: true, fontFace: face, fontSize: 12 } },
    { text: isKo ? "유형" : "Type", options: { fill: { color: VIOLET }, color: WHITE, bold: true, fontFace: face, fontSize: 12 } },
    { text: isKo ? "비용" : "Price", options: { fill: { color: VIOLET }, color: WHITE, bold: true, fontFace: face, fontSize: 12 } },
  ];
  const mediaBody =
    p.portfolio.length === 0
      ? [[{ text: isKo ? "포트폴리오에 담긴 매체가 없습니다." : "No media selected.", options: { colspan: 4, color: GRAY, fontFace: face, fontSize: 12, align: "center" as const } }]]
      : p.portfolio.slice(0, 16).map((r, i) => {
          const fill = i % 2 ? { color: LIGHT } : { color: WHITE };
          return [
            { text: r.name || "—", options: { fill, color: INK, fontFace: face, fontSize: 11 } },
            { text: r.region || "—", options: { fill, color: GRAY, fontFace: face, fontSize: 11 } },
            { text: r.type || "—", options: { fill, color: GRAY, fontFace: face, fontSize: 11 } },
            { text: r.priceLabel || "—", options: { fill, color: INK, fontFace: face, fontSize: 11 } },
          ];
        });
  s3.addTable([mediaHead, ...mediaBody], {
    x: 0.6, y: 1.25, w: 12.1, colW: [6.0, 2.2, 2.2, 1.7],
    border: { type: "solid", color: "E4E6EC", pt: 0.5 }, rowH: 0.34, valign: "middle",
  });

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
