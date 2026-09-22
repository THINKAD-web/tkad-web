/**
 * 계약서 PDF 레이아웃 SSOT.
 * 플래너 보고서(`pdf-draw-primitives.ts`)와 같이 여백·타이포·간격을 한곳에서 바꾼다.
 */
export const CONTRACT_LAYOUT = {
  margin: 25,
  footerH: 8,
  pageTop: 22,
  pageBottom: 278,
  bodyPt: 9.5,
  /** 9.5pt × 1.6 ≈ 5.4mm */
  bodyLineH: 5.4,
  articleTitlePt: 11,
  preambleLineH: 5.4,
  articleGapBefore: 5,
  articleGapAfter: 2,
  paragraphGap: 2,
  titlePt: 22,
  titleGapAfter: 12,
  tableLabelW: 38,
  tableRowH: 7,
  tableValueLineH: 4.2,
  tablePad: 2.5,
  tableBorderPt: 0.35,
  tableFontPt: 9,
  tableTotalPt: 10,
  articleMidGap: 3,
  sigColGap: 6,
  sigBoxH: 62,
  sigFieldH: 6,
  sigDateGap: 7,
  sigBlockTopGap: 4,
  clauseIndentMm: 4,
  clauseNestedIndentMm: 8,
} as const;

export const CONTRACT_ACCENT: [number, number, number] = [91, 33, 182];
export const CONTRACT_LABEL_BG: [number, number, number] = [245, 245, 245];
