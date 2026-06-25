/** `/media/map` 가시성 점수 핀 — 브랜드 주황(#FF6600) 단일 계열 명도 그라데이션 */

export const VISIBILITY_PIN_BRAND_ORANGE = "#FF6600";

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

/** 연함(낮은 점수) → 진함(높은 점수). voyager 밝은 타일 대비용 stroke 포함. */
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
    fill: "#FFD4B8",
    stroke: "#FFAA66",
    text: "#9a3412",
    labelKo: "기본",
    labelEn: "Basic",
    rangeLabelKo: "1–84",
    rangeLabelEn: "1–84",
  },
  {
    tier: 2,
    min: 85,
    max: 88,
    fill: "#FFB380",
    stroke: "#FF8833",
    text: "#9a3412",
    labelKo: "표준",
    labelEn: "Standard",
    rangeLabelKo: "85–88",
    rangeLabelEn: "85–88",
  },
  {
    tier: 3,
    min: 89,
    max: 91,
    fill: "#FF9933",
    stroke: "#FF7711",
    text: "#ffffff",
    labelKo: "양호",
    labelEn: "Good",
    rangeLabelKo: "89–91",
    rangeLabelEn: "89–91",
  },
  {
    tier: 4,
    min: 92,
    max: 94,
    fill: "#FF6600",
    stroke: "#E55A00",
    text: "#ffffff",
    labelKo: "높음",
    labelEn: "High",
    rangeLabelKo: "92–94",
    rangeLabelEn: "92–94",
  },
  {
    tier: 5,
    min: 95,
    max: 100,
    fill: "#CC5200",
    stroke: "#993D00",
    text: "#ffffff",
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
