import type {
  MediaComputedMetric,
  MediaExternalSignal,
  MediaFactSheet,
} from "@prisma/client";
import type { EngineInput } from "./types";

type MediaWithLayers = {
  id: string;
  name: string;
  type: string;
  subCategory: string | null;
  mediaMainCategory: string | null;
  mediaSubCategory: string | null;
  dailyFootfall: number | null;
  price: number;
  visibilityScore: number;
  impressions: number | null;
  cpm: number | null;
  factSheet: MediaFactSheet | null;
  externalSignals: MediaExternalSignal[];
  computedMetric: MediaComputedMetric | null;
};

export function buildEngineInput(media: MediaWithLayers): EngineInput {
  const cm = media.computedMetric;
  return {
    mediaId: media.id,
    media: {
      name: media.name,
      type: media.type,
      subCategory: media.subCategory,
      mediaMainCategory: media.mediaMainCategory,
      mediaSubCategory: media.mediaSubCategory,
      dailyFootfall: media.dailyFootfall,
      price: media.price,
      visibilityScore: media.visibilityScore,
      impressions: media.impressions,
      cpm: media.cpm,
    },
    fact: media.factSheet,
    signals: media.externalSignals,
    legacy: {
      dailyImpressions: cm?.legacyDailyImpressions ?? null,
      cpm: cm?.legacyCpm ?? null,
    },
    current: cm
      ? {
          dailyImpressions: cm.dailyImpressions,
          cpm: cm.cpm,
          contactRate: cm.contactRate ?? undefined,
        }
      : undefined,
  };
}
