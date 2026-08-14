import type { PrismaClient } from "@prisma/client";
import { buildEngineInput } from "./build-input";
import { computeMetric } from "./compute";
import { upsertComputedMetricFromEngine } from "./persist";
import type { RecomputeResult } from "./types";

type Db = PrismaClient;

export async function recomputeOneMedia(
  db: Db,
  mediaId: string,
): Promise<RecomputeResult> {
  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: {
      factSheet: true,
      externalSignals: true,
      computedMetric: true,
    },
  });

  if (!media) {
    throw new Error(`Media not found: ${mediaId}`);
  }

  const before = media.computedMetric;
  const input = buildEngineInput(media);
  const { output, engineVersion } = computeMetric(input);

  const updated = await upsertComputedMetricFromEngine(
    db,
    mediaId,
    output,
    engineVersion,
    before
      ? {
          legacyDailyImpressions: before.legacyDailyImpressions,
          legacyCpm: before.legacyCpm,
        }
      : null,
  );

  return {
    mediaId,
    engineVersion,
    computedAt: updated.computedAt,
    changed: {
      dailyImpressions:
        before?.dailyImpressions !== updated.dailyImpressions,
      cpm: before?.cpm !== updated.cpm,
    },
    before: {
      dailyImpressions: before?.dailyImpressions ?? null,
      cpm: before?.cpm ?? null,
      modelVersion: before?.modelVersion ?? null,
    },
    after: {
      dailyImpressions: updated.dailyImpressions,
      cpm: updated.cpm,
      modelVersion: updated.modelVersion,
    },
  };
}
