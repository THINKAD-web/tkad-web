/**
 * MOIS population_demographics Signal → regionCode → population index.
 * Planner catalog enrichment (Phase 4a-4).
 */
import type { PrismaClient } from "@prisma/client";

const SOURCE_TYPE = "population_demographics";

export async function fetchMoisPopulationIndex(
  db: Pick<PrismaClient, "mediaExternalSignal">,
): Promise<Map<string, number>> {
  const signals = await db.mediaExternalSignal.findMany({
    where: { sourceType: SOURCE_TYPE },
    select: { sourceKey: true, rawValue: true },
  });
  const index = new Map<string, number>();
  for (const s of signals) {
    const raw = s.rawValue as { population?: unknown } | null;
    const pop = Number(raw?.population ?? 0);
    if (pop > 0) index.set(s.sourceKey, pop);
  }
  return index;
}
