/**
 * 플래너 보고서 차트 색상 — 웹·PDF·PPTX 동일 매핑.
 * 고정형=보라, 디지털=시안 등 유형 키 기준으로 일관되게 적용한다.
 */

import { getMainCategory } from "@/lib/media-browse-categories";

/** 발견하기 메인 카테고리 칩 색 — Tailwind 500 계열 */
const BROWSE_CHIP_HEX: Record<string, string> = {
  violet: "#8B5CF6",
  blue: "#3B82F6",
  cyan: "#06B6D4",
  pink: "#EC4899",
  rose: "#F43F5E",
  amber: "#F59E0B",
  emerald: "#10B981",
  orange: "#F97316",
  teal: "#14B8A6",
  indigo: "#6366F1",
  purple: "#A855F7",
  gray: "#6B7280",
};

export const PLANNER_CHART_COLOR_BY_KEY: Record<string, string> = {
  static: "#7C3AED",
  digital: "#0891B2",
  mobile: "#EC4899",
  network: "#10B981",
  /** 통합 플랜 OOH vs 디지털 */
  ooh: "#7C3AED",
  other: "#6B7280",
};

export const PLANNER_CHART_PALETTE = [
  "#7C3AED",
  "#0891B2",
  "#EC4899",
  "#10B981",
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
