import type { VisibilityPinTierDef } from "@/lib/map-pin-visibility-colors";

export type VisibilityLegendGroup = {
  id: "basic" | "good" | "top";
  tierSample: number;
  labelKo: string;
  labelEn: string;
  rangeLabelKo: string;
  rangeLabelEn: string;
};

export const VISIBILITY_LEGEND_GROUPS: readonly VisibilityLegendGroup[] = [
  {
    id: "basic",
    tierSample: 2,
    labelKo: "기본",
    labelEn: "Basic",
    rangeLabelKo: "1–2",
    rangeLabelEn: "1–2",
  },
  {
    id: "good",
    tierSample: 3,
    labelKo: "양호",
    labelEn: "Good",
    rangeLabelKo: "3",
    rangeLabelEn: "3",
  },
  {
    id: "top",
    tierSample: 5,
    labelKo: "높음",
    labelEn: "High",
    rangeLabelKo: "4–5",
    rangeLabelEn: "4–5",
  },
] as const;

export function visibilityLegendGroupTierDef(
  group: VisibilityLegendGroup,
  table: readonly VisibilityPinTierDef[],
): VisibilityPinTierDef {
  return table.find((t) => t.tier === group.tierSample) ?? table[0]!;
}
