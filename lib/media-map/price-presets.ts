export type MediaMapPricePresetId =
  | "all"
  | "under50"
  | "50-200"
  | "200-500"
  | "over500";

export type MediaMapPricePreset = {
  id: MediaMapPricePresetId;
  labelKo: string;
  labelEn: string;
  minPrice: number | null;
  maxPrice: number | null;
};

export const MEDIA_MAP_PRICE_PRESETS: readonly MediaMapPricePreset[] = [
  { id: "all", labelKo: "전체", labelEn: "All", minPrice: null, maxPrice: null },
  {
    id: "under50",
    labelKo: "~50만",
    labelEn: "Under ₩500K",
    minPrice: null,
    maxPrice: 500_000,
  },
  {
    id: "50-200",
    labelKo: "50~200만",
    labelEn: "₩500K–2M",
    minPrice: 500_000,
    maxPrice: 2_000_000,
  },
  {
    id: "200-500",
    labelKo: "200~500만",
    labelEn: "₩2M–5M",
    minPrice: 2_000_000,
    maxPrice: 5_000_000,
  },
  {
    id: "over500",
    labelKo: "500만~",
    labelEn: "₩5M+",
    minPrice: 5_000_000,
    maxPrice: null,
  },
] as const;

export function matchMediaMapPricePreset(
  minPrice: number | null,
  maxPrice: number | null,
): MediaMapPricePresetId | null {
  if (minPrice == null && maxPrice == null) return "all";
  for (const preset of MEDIA_MAP_PRICE_PRESETS) {
    if (preset.id === "all") continue;
    if (preset.minPrice === minPrice && preset.maxPrice === maxPrice) {
      return preset.id;
    }
  }
  return null;
}

export function mediaMapPricePresetToRange(
  id: MediaMapPricePresetId,
): { minPrice: number | null; maxPrice: number | null } {
  const preset = MEDIA_MAP_PRICE_PRESETS.find((p) => p.id === id);
  if (!preset || preset.id === "all") {
    return { minPrice: null, maxPrice: null };
  }
  return { minPrice: preset.minPrice, maxPrice: preset.maxPrice };
}
