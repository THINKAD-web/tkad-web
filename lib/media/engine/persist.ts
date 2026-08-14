import type { Prisma, PrismaClient } from "@prisma/client";
import type { EngineOutput } from "./types";

type Db = PrismaClient | Prisma.TransactionClient;

export async function upsertComputedMetricFromEngine(
  db: Db,
  mediaId: string,
  output: EngineOutput,
  engineVersion: string,
  existing: {
    legacyDailyImpressions: number | null;
    legacyCpm: number | null;
  } | null,
) {
  const hourlyImpressions =
    output.hourlyImpressions === null
      ? undefined
      : (output.hourlyImpressions as Prisma.InputJsonValue);

  return db.mediaComputedMetric.upsert({
    where: { mediaId },
    create: {
      mediaId,
      dailyImpressions: output.dailyImpressions,
      hourlyImpressions: hourlyImpressions ?? undefined,
      cpm: output.cpm,
      visibilityScore: output.visibilityScore,
      reliabilityGrade: output.reliabilityGrade,
      modelVersion: engineVersion,
      computedAt: output.computedAt,
      sourceSignalIds: output.sourceSignalIds,
      legacyDailyImpressions: existing?.legacyDailyImpressions ?? null,
      legacyCpm: existing?.legacyCpm ?? null,
    },
    update: {
      dailyImpressions: output.dailyImpressions,
      ...(hourlyImpressions !== undefined
        ? { hourlyImpressions }
        : { hourlyImpressions: null }),
      cpm: output.cpm,
      visibilityScore: output.visibilityScore,
      reliabilityGrade: output.reliabilityGrade,
      sourceSignalIds: output.sourceSignalIds,
      modelVersion: engineVersion,
      computedAt: output.computedAt,
    },
  });
}
