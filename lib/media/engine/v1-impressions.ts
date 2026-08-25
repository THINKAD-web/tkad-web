import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { classifyMedia } from "@/lib/metrics/classify";
import {
  DAYS_PER_MONTH,
  MIN_IMPRESSIONS_FOR_CPM,
} from "@/lib/metrics/constants";
import {
  resolveContactRateWithBasis,
  resolveSovShareWithBasis,
} from "@/lib/metrics/defaults";
import { calcImpressions } from "@/lib/metrics/impressions";
import { MODEL_VERSIONS } from "./constants";
import type { EngineInput, EngineOutput, MetricEngine } from "./types";

function mediaSovSource(input: EngineInput) {
  const m = input.media;
  const fs = input.fact;
  return {
    type: m.type,
    subCategory: m.subCategory ?? m.mediaSubCategory ?? undefined,
    mainCategory: m.mediaMainCategory ?? undefined,
    name: m.name,
    forceLoopSov: fs?.forceLoopSov ?? undefined,
    spotDuration: fs?.spotDurationSec ?? undefined,
    loopDuration: fs?.loopDurationSec ?? undefined,
    playsPerHour: fs?.playsPerHour ?? undefined,
  };
}

function mediaContactSource(input: EngineInput) {
  const m = input.media;
  return {
    type: m.type,
    subCategory: m.subCategory ?? m.mediaSubCategory ?? undefined,
    mainCategory: m.mediaMainCategory ?? undefined,
    name: m.name,
    contactRate: input.current?.contactRate,
  };
}

export const v1ImpressionsEngine: MetricEngine = {
  version: MODEL_VERSIONS.V1_IMPRESSIONS,

  canProcess(input: EngineInput): boolean {
    if ((input.media.dailyFootfall ?? 0) <= 0) return false;
    return resolveSovShareWithBasis(mediaSovSource(input)).value > 0;
  },

  compute(input: EngineInput): EngineOutput {
    const m = input.media;
    const mediaClass = classifyMedia({
      type: m.type,
      subCategory: m.subCategory ?? m.mediaSubCategory,
      mainCategory: m.mediaMainCategory,
      name: m.name,
    });
    const contact = resolveContactRateWithBasis(mediaContactSource(input));
    const sov = resolveSovShareWithBasis(mediaSovSource(input));
    const { dailyImpressions, totalImpressions } = calcImpressions({
      dailyTraffic: m.dailyFootfall ?? 0,
      contactRate: contact.value,
      sovShare: sov.value,
      units: 1,
      days: DAYS_PER_MONTH,
    });

    const priceWon = catalogPriceFieldToWon(m.price);
    let cpm = 0;
    if (
      priceWon > 0 &&
      totalImpressions >= MIN_IMPRESSIONS_FOR_CPM
    ) {
      cpm = Math.round((priceWon / totalImpressions) * 1000);
    }

    const reliabilityGrade =
      contact.basis === "measured" && sov.basis === "derived"
        ? "A"
        : contact.basis === "default" || sov.basis === "default"
          ? "B"
          : "B";

    return {
      dailyImpressions,
      monthlyImpressions: totalImpressions,
      hourlyImpressions: null,
      cpm,
      visibilityScore: m.visibilityScore > 0 ? m.visibilityScore : null,
      reliabilityGrade,
      sourceSignalIds: [],
      computedAt: new Date(),
      contactRate: contact.value,
      contactRateBasis: contact.basis,
      contactRateInputVisibility: m.visibilityScore,
      contactRateInputClass: mediaClass,
      sovShare: sov.value,
      sovShareBasis: sov.basis,
    };
  },
};
