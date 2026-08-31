import { BRAND_ACCENT, BRAND_ACCENT_STROKE, BRAND_ACCENT_STROKE_ALT } from "@/lib/brand-palette";
/** `/media/map` 가시성 점수 핀 — Quiet Professional orange 명도 그라데이션 */

export const VISIBILITY_PIN_BRAND_NEON = BRAND_ACCENT;

export type VisibilityPinTier = 0 | 1 | 2 | 3 | 4 | 5;

export type VisibilityPinTierDef = {
  tier: VisibilityPinTier;
  min: number;
  max: number;
  fill: string;
  stroke: string;
  text: string;
  labelKo: string;
  labelEn: string;
  rangeLabelKo: string;
  rangeLabelEn: string;
};

/** 라이트/voyager 타일용 — 연함(낮은 점수) → 진함(높은 점수) */
export const VISIBILITY_PIN_TIERS: readonly VisibilityPinTierDef[] = [
  {
    tier: 0,
    min: Number.NEGATIVE_INFINITY,
    max: 0,
    fill: "#94a3b8",
    stroke: "#cbd5e1",
    text: "#334155",
    labelKo: "미입력",
    labelEn: "No score",
    rangeLabelKo: "—",
    rangeLabelEn: "—",
  },
  {
    tier: 1,
    min: 1,
    max: 84,
    fill: "#FFEDD5",
    stroke: "#FDBA74",
    text: "#9A3412",
    labelKo: "기본",
    labelEn: "Basic",
    rangeLabelKo: "1–84",
    rangeLabelEn: "1–84",
  },
  {
    tier: 2,
    min: 85,
    max: 88,
    fill: "#FDBA74",
    stroke: "#FB923C",
    text: "#9A3412",
    labelKo: "표준",
    labelEn: "Standard",
    rangeLabelKo: "85–88",
    rangeLabelEn: "85–88",
  },
  {
    tier: 3,
    min: 89,
    max: 91,
    fill: "#FB923C",
    stroke: "#F97316",
    text: "#7C2D12",
    labelKo: "양호",
    labelEn: "Good",
    rangeLabelKo: "89–91",
    rangeLabelEn: "89–91",
  },
  {
    tier: 4,
    min: 92,
    max: 94,
    fill: "#F97316",
    stroke: BRAND_ACCENT_STROKE_ALT,
    text: "#0f172a",
    labelKo: "높음",
    labelEn: "High",
    rangeLabelKo: "92–94",
    rangeLabelEn: "92–94",
  },
  {
    tier: 5,
    min: 95,
    max: 100,
    fill: BRAND_ACCENT,
    stroke: BRAND_ACCENT_STROKE,
    text: "#ffffff",
    labelKo: "최상",
    labelEn: "Top",
    rangeLabelKo: "95+",
    rangeLabelEn: "95+",
  },
] as const;

/**
 * Carto dark_all 타일용 — tier1 크림(#FFEDD5) 대신 muted orange.
 * 순위(연함→진함)는 라이트와 동일, 다크 배경에서 흰 점처럼 튀지 않게.
 */
export const VISIBILITY_PIN_TIERS_DARK: readonly VisibilityPinTierDef[] = [
  {
    tier: 0,
    min: Number.NEGATIVE_INFINITY,
    max: 0,
    fill: "#64748b",
    stroke: "#94a3b8",
    text: "#f1f5f9",
    labelKo: "미입력",
    labelEn: "No score",
    rangeLabelKo: "—",
    rangeLabelEn: "—",
  },
  {
    tier: 1,
    min: 1,
    max: 84,
    fill: "#9A3412",
    stroke: "#C2410C",
    text: "#FFEDD5",
    labelKo: "기본",
    labelEn: "Basic",
    rangeLabelKo: "1–84",
    rangeLabelEn: "1–84",
  },
  {
    tier: 2,
    min: 85,
    max: 88,
    fill: "#C2410C",
    stroke: BRAND_ACCENT_STROKE_ALT,
    text: "#FFEDD5",
    labelKo: "표준",
    labelEn: "Standard",
    rangeLabelKo: "85–88",
    rangeLabelEn: "85–88",
  },
  {
    tier: 3,
    min: 89,
    max: 91,
    fill: BRAND_ACCENT_STROKE_ALT,
    stroke: "#FB923C",
    text: "#FFF7ED",
    labelKo: "양호",
    labelEn: "Good",
    rangeLabelKo: "89–91",
    rangeLabelEn: "89–91",
  },
  {
    tier: 4,
    min: 92,
    max: 94,
    fill: "#F97316",
    stroke: "#FDBA74",
    text: "#0f172a",
    labelKo: "높음",
    labelEn: "High",
    rangeLabelKo: "92–94",
    rangeLabelEn: "92–94",
  },
  {
    tier: 5,
    min: 95,
    max: 100,
    fill: BRAND_ACCENT,
    stroke: "#FDBA74",
    text: "#ffffff",
    labelKo: "최상",
    labelEn: "Top",
    rangeLabelKo: "95+",
    rangeLabelEn: "95+",
  },
] as const;

export function visibilityPinTiersForTiles(
  forLightBackground: boolean,
): readonly VisibilityPinTierDef[] {
  return forLightBackground ? VISIBILITY_PIN_TIERS : VISIBILITY_PIN_TIERS_DARK;
}

export function visibilityPinTierForScore(
  score: number | null | undefined,
): VisibilityPinTier {
  const s = typeof score === "number" && Number.isFinite(score) ? score : 0;
  for (const tier of VISIBILITY_PIN_TIERS) {
    if (s >= tier.min && s <= tier.max) return tier.tier;
  }
  return 5;
}

export function visibilityPinTierDefForScore(
  score: number | null | undefined,
  forLightBackground = true,
): VisibilityPinTierDef {
  const tier = visibilityPinTierForScore(score);
  const table = visibilityPinTiersForTiles(forLightBackground);
  return table.find((t) => t.tier === tier) ?? table[0]!;
}

/**
 * @param forLightBackground true = voyager/light tiles (기본, 기존 크림 tier1).
 *   false = dark_all — muted orange palette.
 */
export function pinColorForVisibilityScore(
  score: number | null | undefined,
  forLightBackground = true,
): {
  fill: string;
  stroke: string;
  text: string;
} {
  const { fill, stroke, text } = visibilityPinTierDefForScore(
    score,
    forLightBackground,
  );
  return { fill, stroke, text };
}

/** 범례용 — tier 0(미입력) 포함 전체 */
export function visibilityPinLegendEntries(
  forLightBackground = true,
): VisibilityPinTierDef[] {
  return [...visibilityPinTiersForTiles(forLightBackground)];
}

/** @deprecated Use VISIBILITY_PIN_BRAND_NEON */
export const VISIBILITY_PIN_BRAND_VIOLET = VISIBILITY_PIN_BRAND_NEON;

/** @deprecated Use VISIBILITY_PIN_BRAND_NEON */
export const VISIBILITY_PIN_BRAND_ORANGE = VISIBILITY_PIN_BRAND_NEON;
