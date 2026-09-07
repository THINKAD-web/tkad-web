/**
 * 온라인 플랫폼 배지 — 문서(PDF/PPTX) export용 단색 fallback.
 * 화면은 CSS gradient(`OnlinePlatformBadge`), export는 jsPDF/pptx 제약으로
 * gradient 첫 색 또는 solid spec 을 사용한다.
 */

import { resolveOnlinePlatformBadgeSpec } from "@/lib/online/online-platform-badge-spec";

export type OnlinePlatformBadgeExportSpec = {
  initial: string;
  /** `#RRGGBB` */
  backgroundHex: string;
  /** `#RRGGBB` */
  colorHex: string;
};

function hexToRgb(hex: string): readonly [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ] as const;
}

function firstHexFromCssBackground(bg: string): string {
  const m = bg.match(/#[0-9A-Fa-f]{6}/);
  return m?.[0] ?? "#64748B";
}

export function resolveOnlinePlatformBadgeExportSpec(
  platform: string | null | undefined,
): OnlinePlatformBadgeExportSpec {
  const spec = resolveOnlinePlatformBadgeSpec(platform);
  return {
    initial: spec.initial,
    backgroundHex: firstHexFromCssBackground(spec.background),
    colorHex: spec.color.startsWith("#") ? spec.color : "#FFFFFF",
  };
}

export function onlinePlatformBadgePdfColors(platform: string | null | undefined): {
  bg: readonly [number, number, number];
  text: readonly [number, number, number];
  initial: string;
} {
  const spec = resolveOnlinePlatformBadgeExportSpec(platform);
  return {
    bg: hexToRgb(spec.backgroundHex),
    text: hexToRgb(spec.colorHex),
    initial: spec.initial,
  };
}

export function onlinePlatformBadgePptxColors(platform: string | null | undefined): {
  bg: string;
  text: string;
  initial: string;
} {
  const spec = resolveOnlinePlatformBadgeExportSpec(platform);
  return {
    bg: spec.backgroundHex.replace("#", "").toUpperCase(),
    text: spec.colorHex.replace("#", "").toUpperCase(),
    initial: spec.initial,
  };
}
