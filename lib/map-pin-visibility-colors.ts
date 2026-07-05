/** `/media/map` 가시성 점수 핀 — 네온 시안(플래너 accent) 단일 계열 명도 그라데이션. 5호선 보라(#996CAC)와 구분 */

export const VISIBILITY_PIN_BRAND_NEON = "#00E5FF";

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

/** 연함(낮은 점수) → 진함(높은 점수). 다크 타일·지하철 노선 대비용 밝은 네온 stroke */
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
    fill: "#CFFAFE",
    stroke: "#A5F3FC",
    text: "#0E7490",
    labelKo: "기본",
    labelEn: "Basic",
    rangeLabelKo: "1–84",
    rangeLabelEn: "1–84",
  },
  {
    tier: 2,
    min: 85,
    max: 88,
    fill: "#A5F3FC",
    stroke: "#67E8F9",
    text: "#0E7490",
    labelKo: "표준",
    labelEn: "Standard",
    rangeLabelKo: "85–88",
    rangeLabelEn: "85–88",
  },
  {
    tier: 3,
    min: 89,
    max: 91,
    fill: "#67E8F9",
    stroke: "#22D3EE",
    text: "#0C4A6E",
    labelKo: "양호",
    labelEn: "Good",
    rangeLabelKo: "89–91",
    rangeLabelEn: "89–91",
  },
  {
    tier: 4,
    min: 92,
    max: 94,
    fill: "#22D3EE",
    stroke: "#06B6D4",
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
    fill: "#00E5FF",
    stroke: "#06B6D4",
    text: "#0f172a",
    labelKo: "최상",
    labelEn: "Top",
    rangeLabelKo: "95+",
    rangeLabelEn: "95+",
  },
] as const;

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
): VisibilityPinTierDef {
  const tier = visibilityPinTierForScore(score);
  return VISIBILITY_PIN_TIERS.find((t) => t.tier === tier) ?? VISIBILITY_PIN_TIERS[0]!;
}

export function pinColorForVisibilityScore(score: number | null | undefined): {
  fill: string;
  stroke: string;
  text: string;
} {
  const { fill, stroke, text } = visibilityPinTierDefForScore(score);
  return { fill, stroke, text };
}

/** 범례용 — tier 0(미입력) 포함 전체 */
export function visibilityPinLegendEntries(): VisibilityPinTierDef[] {
  return [...VISIBILITY_PIN_TIERS];
}

/** @deprecated Use VISIBILITY_PIN_BRAND_NEON */
export const VISIBILITY_PIN_BRAND_VIOLET = VISIBILITY_PIN_BRAND_NEON;

/** @deprecated Use VISIBILITY_PIN_BRAND_NEON */
export const VISIBILITY_PIN_BRAND_ORANGE = VISIBILITY_PIN_BRAND_NEON;
