import type { PrismaClient } from "@prisma/client";
import { logReviewStatusChange } from "@/lib/media/audit-log";
import { buildEngineInput } from "./build-input";
import { computeMetric } from "./compute";
import {
  syncMediaImpressionsFromEngine,
  upsertComputedMetricFromEngine,
} from "./persist";
import type { RecomputeResult } from "./types";

type Db = PrismaClient;

export type RecomputeOptions = {
  /** flagged → reviewed 전환 (Batch backfill용) */
  markReviewed?: boolean;
};

const MEDIA_INCLUDE = {
  factSheet: true,
  externalSignals: true,
  computedMetric: true,
} as const;

export async function recomputeOneMedia(
  db: Db,
  mediaId: string,
  options?: RecomputeOptions,
): Promise<RecomputeResult> {
  const media = await db.media.findUnique({
    where: { id: mediaId },
    include: MEDIA_INCLUDE,
  });

  if (!media) {
    throw new Error(`Media not found: ${mediaId}`);
  }

  const before = media.computedMetric;
  const input = buildEngineInput(media);
  const { output, engineVersion } = computeMetric(input);

  await db.$transaction(async (tx) => {
    await upsertComputedMetricFromEngine(
      tx,
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
    await syncMediaImpressionsFromEngine(tx, mediaId, output);

    if (
      options?.markReviewed &&
      media.reviewStatus === "flagged" &&
      (media.reviewReason == null ||
        media.reviewReason === "null_or_negative")
    ) {
      await tx.media.update({
        where: { id: mediaId },
        data: {
          reviewStatus: "reviewed",
          reviewReason: null,
          flaggedAt: null,
        },
      });
      logReviewStatusChange({
        mediaId,
        from: media.reviewStatus,
        to: "reviewed",
        reviewReason: null,
        source: "recompute_batch",
      });
    }
  });

  const updated = await db.mediaComputedMetric.findUnique({
    where: { mediaId },
  });

  return {
    mediaId,
    engineVersion,
    computedAt: updated!.computedAt,
    changed: {
      dailyImpressions:
        before?.dailyImpressions !== updated!.dailyImpressions,
      cpm: before?.cpm !== updated!.cpm,
    },
    before: {
      dailyImpressions: before?.dailyImpressions ?? null,
      cpm: before?.cpm ?? null,
      modelVersion: before?.modelVersion ?? null,
    },
    after: {
      dailyImpressions: updated!.dailyImpressions,
      cpm: updated!.cpm,
      modelVersion: updated!.modelVersion,
    },
  };
}
