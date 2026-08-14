import type {
  MediaComputedMetric,
  MediaExternalSignal,
  MediaFactSheet,
} from "@prisma/client";
import type { EngineInput } from "./types";

type MediaWithLayers = {
  id: string;
  factSheet: MediaFactSheet | null;
  externalSignals: MediaExternalSignal[];
  computedMetric: MediaComputedMetric | null;
};

export function buildEngineInput(media: MediaWithLayers): EngineInput {
  const cm = media.computedMetric;
  return {
    mediaId: media.id,
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
        }
      : undefined,
  };
}
