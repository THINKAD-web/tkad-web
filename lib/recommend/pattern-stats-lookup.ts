import {
  buildPatternComboKey,
  getMinPatternStatsSampleThreshold,
} from "@/lib/recommend/pattern-stats-config";
import type { PatternComboDimensions } from "@/lib/recommend/pattern-stats-types";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isPatternStatsNotesEnabled } from "@/lib/recommend/pattern-stats-flags";

export { isPatternStatsNotesEnabled };
export {
  appendPatternStatsOperationalNote,
  formatPatternStatsNote,
  patternComboFromAiInput,
  patternComboFromMatchingInput,
  patternComboFromOnlineExportArgs,
  patternComboFromOohExportArgs,
  patternComboFromPlannerBrief,
} from "@/lib/recommend/pattern-stats-combo";

export async function lookupPatternStatsCount(
  combo: PatternComboDimensions,
): Promise<number | null> {
  if (!isPatternStatsNotesEnabled() || !isDatabaseConfigured()) return null;

  const threshold = getMinPatternStatsSampleThreshold();
  const comboKey = buildPatternComboKey(combo);
  const row = await getPrisma().recommendationPatternStats.findUnique({
    where: { comboKey },
    select: { count: true },
  });

  if (!row || row.count < threshold) return null;
  return row.count;
}

export async function resolvePatternStatsOperationalNote(
  combo: PatternComboDimensions,
  isKo: boolean,
): Promise<string | null> {
  const { formatPatternStatsNote } = await import(
    "@/lib/recommend/pattern-stats-combo"
  );
  const count = await lookupPatternStatsCount(combo);
  if (count == null) return null;
  return formatPatternStatsNote(count, isKo);
}
