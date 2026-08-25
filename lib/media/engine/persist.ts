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

  const v1Fields =
    output.contactRate != null
      ? {
          contactRate: output.contactRate,
          contactRateBasis: output.contactRateBasis ?? null,
          contactRateInputVisibility:
            output.contactRateInputVisibility ?? null,
          contactRateInputClass: output.contactRateInputClass ?? null,
          sovShare: output.sovShare ?? null,
          sovShareBasis: output.sovShareBasis ?? null,
        }
      : {};

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
      ...v1Fields,
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
      ...v1Fields,
    },
  });
}

export function monthlyImpressionsFromOutput(output: EngineOutput): number {
  if (output.monthlyImpressions != null && output.monthlyImpressions > 0) {
    return output.monthlyImpressions;
  }
  return output.dailyImpressions * 30;
}

export async function syncMediaImpressionsFromEngine(
  db: Db,
  mediaId: string,
  output: EngineOutput,
) {
  const monthly = monthlyImpressionsFromOutput(output);
  return db.media.update({
    where: { id: mediaId },
    data: {
      impressions: monthly > 0 ? monthly : null,
      cpm: output.cpm > 0 ? output.cpm : null,
    },
  });
}
