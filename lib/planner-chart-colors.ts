/**
 * 플래너 보고서 차트 색상 — 웹·PDF·PPTX 동일 매핑.
 * 브랜드=qp accent, 보조=중립·에메랄드 등 (보라/시안 네온 없음).
 */

import { getMainCategory } from "@/lib/media-browse-categories";
import { BRAND_ACCENT } from "@/lib/brand-palette";

/** 발견하기 메인 카테고리 칩 색 — qp·중립 위주 */
const BROWSE_CHIP_HEX: Record<string, string> = {
  violet: BRAND_ACCENT,
  blue: "#3B82F6",
  cyan: "#1c1c1f",
  pink: "#5a5a5e",
  rose: "#F43F5E",
  amber: "#F59E0B",
  emerald: "#10B981",
  orange: BRAND_ACCENT,
  teal: "#14B8A6",
  indigo: "#08080a",
  purple: BRAND_ACCENT,
  gray: "#6B7280",
};

export const PLANNER_CHART_COLOR_BY_KEY: Record<string, string> = {
  static: BRAND_ACCENT,
  digital: "#1c1c1f",
  mobile: "#5a5a5e",
  network: "#10B981",
  /** 통합 플랜 OOH vs 디지털 */
  ooh: BRAND_ACCENT,
  other: "#6B7280",
};

export const PLANNER_CHART_PALETTE = [
  BRAND_ACCENT,
  "#1c1c1f",
  "#10B981",
  "#6B7280",
  "#F59E0B",
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
