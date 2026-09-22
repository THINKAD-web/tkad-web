/**
 * 계약서 PDF 레이아웃 SSOT.
 * 플래너 보고서(`pdf-draw-primitives.ts`)와 같이 여백·타이포·간격을 한곳에서 바꾼다.
 */
export const CONTRACT_LAYOUT = {
  margin: 25,
  footerH: 8,
  pageTop: 22,
  pageBottom: 286,
  bodyPt: 8,
  bodyLineH: 4.4,
  articleTitlePt: 10,
  preambleLineH: 4.9,
  articleGapBefore: 2.5,
  articleGapAfter: 1,
  paragraphGap: 1,
  titlePt: 22,
  titleGapAfter: 8,
  tableLabelW: 38,
  tableRowH: 6,
  tableValueLineH: 3.8,
  tablePad: 2,
  tableBorderPt: 0.35,
  /** 제1조 요약표 */
  tableFontPt: 8.5,
  /** ※ 매체별 내역 표 */
  mediaTableFontPt: 8,
  tableTotalPt: 9.5,
  articleMidGap: 2,
  sigColGap: 6,
  sigBoxH: 56,
  sigFieldH: 5,
  /** 갑·을 대표자란 도장 크기 (mm) */
  sigStampMm: 17,
  sigStampInsetMm: 7,
  sigDateGap: 4,
  sigBlockTopGap: 1.5,
  clauseIndentMm: 4,
  clauseNestedIndentMm: 8,
} as const;

export const CONTRACT_ACCENT: [number, number, number] = [91, 33, 182];
export const CONTRACT_LABEL_BG: [number, number, number] = [245, 245, 245];
