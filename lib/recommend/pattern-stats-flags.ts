/**
 * B-1 pattern stats UI — shared feature flag.
 * Server: `PATTERN_STATS_NOTES_ENABLED`
 * Client bundle: `NEXT_PUBLIC_PATTERN_STATS_NOTES_ENABLED` (must match for preview)
 */
export function isPatternStatsNotesEnabled(): boolean {
  const raw =
    process.env.PATTERN_STATS_NOTES_ENABLED?.trim() ??
    process.env.NEXT_PUBLIC_PATTERN_STATS_NOTES_ENABLED?.trim();
  return raw?.toLowerCase() === "true";
}
