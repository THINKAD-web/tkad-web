/**
 * 플래너·차트 공용 색상 팔레트 — 웹·PDF·PPTX 동일 매핑.
 * 딥 틸 브랜드(#0D9488 + #0D1B2E) 기준. 앰버(#F59E0B) 제거 — 구 브랜드 오렌지와 혼동.
 *
 * 색맹 접근성: teal / ink / slate / indigo / rose — luminance·hue 모두 구분.
 */

import { getMainCategory } from "@/lib/media-browse-categories";

/** 차트 시리즈 SSOT — 5색 */
export const CHART_SERIES_HEX = {
  primary: "#0D9488",
  ink: "#0D1B2E",
  slate: "#64748B",
  indigo: "#6366F1",
  rose: "#E11D48",
} as const;

/** 발견하기 메인 카테고리 칩 색 — 틸·잉크 위주 */
const BROWSE_CHIP_HEX: Record<string, string> = {
  violet: CHART_SERIES_HEX.primary,
  blue: CHART_SERIES_HEX.indigo,
  cyan: CHART_SERIES_HEX.ink,
  pink: CHART_SERIES_HEX.rose,
  rose: CHART_SERIES_HEX.rose,
  amber: CHART_SERIES_HEX.indigo,
  emerald: CHART_SERIES_HEX.primary,
  orange: CHART_SERIES_HEX.primary,
  teal: CHART_SERIES_HEX.primary,
  indigo: CHART_SERIES_HEX.ink,
  purple: CHART_SERIES_HEX.indigo,
  gray: CHART_SERIES_HEX.slate,
};

export const PLANNER_CHART_COLOR_BY_KEY: Record<string, string> = {
  static: CHART_SERIES_HEX.primary,
  digital: CHART_SERIES_HEX.ink,
  mobile: CHART_SERIES_HEX.slate,
  network: CHART_SERIES_HEX.indigo,
  /** 통합 플랜 OOH vs 디지털 */
  ooh: CHART_SERIES_HEX.primary,
  other: CHART_SERIES_HEX.slate,
};

export const PLANNER_CHART_PALETTE = [
  CHART_SERIES_HEX.primary,
  CHART_SERIES_HEX.ink,
  CHART_SERIES_HEX.indigo,
  CHART_SERIES_HEX.slate,
  CHART_SERIES_HEX.rose,
] as const;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function browseCategoryHex(categoryId: string): string | undefined {
  const main = getMainCategory(categoryId);
  if (!main?.color) return undefined;
  return BROWSE_CHIP_HEX[main.color];
}

export function plannerChartColor(
  colorKey: string | undefined,
  fallbackIndex = 0,
): string {
  if (colorKey && PLANNER_CHART_COLOR_BY_KEY[colorKey]) {
    return PLANNER_CHART_COLOR_BY_KEY[colorKey]!;
  }
  if (colorKey) {
    const browseHex = browseCategoryHex(colorKey);
    if (browseHex) return browseHex;
  }
  return PLANNER_CHART_PALETTE[fallbackIndex % PLANNER_CHART_PALETTE.length]!;
}

export function plannerChartColorRgb(
  colorKey: string | undefined,
  fallbackIndex = 0,
): readonly [number, number, number] {
  return hexToRgb(plannerChartColor(colorKey, fallbackIndex));
}

/** PPTX hex (no #) */
export function plannerChartColorPptx(
  colorKey: string | undefined,
  fallbackIndex = 0,
): string {
  return plannerChartColor(colorKey, fallbackIndex).replace("#", "");
}
