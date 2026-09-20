import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const BACKFILL_TRANSLATION_CALIBRATION_PATH = join(
  process.cwd(),
  "scripts",
  ".backfill-media-translations-calibration.json",
);

export type BackfillTranslationCalibration = {
  callMs: number;
  inputTokens: number;
  outputTokens: number;
  upsertMs?: number;
  recordedAt: string;
  mediaId?: string;
};

export function loadBackfillTranslationCalibration(): BackfillTranslationCalibration | null {
  try {
    const parsed = JSON.parse(
      readFileSync(BACKFILL_TRANSLATION_CALIBRATION_PATH, "utf8"),
    ) as BackfillTranslationCalibration;
    if (
      Number.isFinite(parsed.callMs) &&
      Number.isFinite(parsed.inputTokens) &&
      Number.isFinite(parsed.outputTokens)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveBackfillTranslationCalibration(
  cal: BackfillTranslationCalibration,
): void {
  writeFileSync(
    BACKFILL_TRANSLATION_CALIBRATION_PATH,
    `${JSON.stringify(cal, null, 2)}\n`,
  );
}
