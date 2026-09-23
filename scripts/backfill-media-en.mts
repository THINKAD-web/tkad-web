#!/usr/bin/env node
/**
 * Backfill `Media.nameEn` / `descriptionEn` / `locationEn` for the public catalog.
 *
 * Context: PR2-b `backfill-media-translations.mts` only upserted ja/zh on
 * `MediaTranslation` and discarded the en half of each `generateMediaTranslations()`
 * call. English was never batch-filled — this script closes that gap. It is not a
 * product bug; en backfill was simply never run.
 *
 * Reuses the same single Claude call as ja/zh (en+ja+zh together). Past ja/zh runs
 * did not persist en, so targets here require a new API call (no stored en to reuse).
 *
 * Defaults to dry-run. Pass --execute after human approval (cost/time), same as ja/zh.
 * Idempotent: only patches columns that are still null/blank; never overwrites existing en.
 *
 * Usage:
 *   npx tsx scripts/backfill-media-en.mts
 *   npx tsx scripts/backfill-media-en.mts --limit=20
 *   npx tsx scripts/backfill-media-en.mts --execute
 */
import { getPrisma } from "../lib/prisma";
import {
  generateMediaTranslations,
  mediaNeedsEnColumnBackfill,
  patchMediaEnColumnsIfEmpty,
} from "../lib/media-ai-translate";
import {
  BACKFILL_TRANSLATION_CALIBRATION_PATH,
  loadBackfillTranslationCalibration,
} from "./backfill-media-translations-calibration";
import { publicActiveMediaWhere } from "../lib/media-review-status";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const EXECUTE = flag("execute");
const INCLUDE_NON_PUBLIC = flag("include-non-public");
const BATCH_SIZE = Number(arg("batch-size") ?? "8");
const DELAY_MS = Number(arg("delay-ms") ?? "2000");
const LIMIT = arg("limit") ? Number(arg("limit")) : undefined;

const calibration = loadBackfillTranslationCalibration();
const hasArg = (name: string) => process.argv.some((a) => a.startsWith(`--${name}=`));

const EST_INPUT_TOKENS_PER_CALL = Number(
  arg("est-input-tokens") ?? calibration?.inputTokens ?? "700",
);
const EST_OUTPUT_TOKENS_PER_CALL = Number(
  arg("est-output-tokens") ?? calibration?.outputTokens ?? "450",
);
const EST_CALL_MS = Number(arg("est-call-ms") ?? calibration?.callMs ?? "4000");
const EST_UPSERT_MS = Number(
  arg("est-upsert-ms") ?? calibration?.upsertMs ?? "800",
);
const PRICE_PER_1M_INPUT_USD = 3.0;
const PRICE_PER_1M_OUTPUT_USD = 15.0;

function formatDurationMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const min = ms / 60_000;
  if (min < 120) return `~${Math.round(min)} min`;
  const hours = min / 60;
  return `~${hours.toFixed(1)} h (${Math.round(min)} min)`;
}

type Fail = { mediaId: string; name: string; error: string };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const prisma = getPrisma();
  const mediaWhere = INCLUDE_NON_PUBLIC ? {} : publicActiveMediaWhere();

  const [allMediaRows, totalInDb, inactiveCount, flaggedActiveCount] =
    await Promise.all([
      prisma.media.findMany({
        where: mediaWhere,
        select: {
          id: true,
          name: true,
          location: true,
          description: true,
          country: true,
          nameEn: true,
          descriptionEn: true,
          locationEn: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.media.count(),
      prisma.media.count({ where: { isActive: false } }),
      prisma.media.count({
        where: { isActive: true, reviewStatus: "flagged" },
      }),
    ]);

  const skippedAlreadyEn = allMediaRows.filter(
    (m) => !mediaNeedsEnColumnBackfill(m),
  );
  let targets = allMediaRows.filter((m) => mediaNeedsEnColumnBackfill(m));
  if (LIMIT != null) targets = targets.slice(0, LIMIT);

  const n = allMediaRows.length;
  const nameFilled = allMediaRows.filter((m) => String(m.nameEn ?? "").trim()).length;
  const locFilled = allMediaRows.filter((m) => String(m.locationEn ?? "").trim()).length;
  const descFilled = allMediaRows.filter((m) => String(m.descriptionEn ?? "").trim()).length;

  console.log(`Total media rows in DB: ${totalInDb}`);
  if (!INCLUDE_NON_PUBLIC) {
    console.log(
      `Scope: public catalog (isActive=true, reviewStatus≠flagged) — ${n} media`,
    );
    console.log(
      `Excluded from scope: ${inactiveCount} inactive, ${flaggedActiveCount} active+flagged`,
    );
  } else {
    console.log(`Scope: --include-non-public — ${n} media`);
  }
  console.log("\n=== en column fill rate (in scope) ===");
  console.log(
    `nameEn: ${nameFilled}/${n} (${((nameFilled / n) * 100).toFixed(1)}%)`,
  );
  console.log(
    `locationEn: ${locFilled}/${n} (${((locFilled / n) * 100).toFixed(1)}%)`,
  );
  console.log(
    `descriptionEn: ${descFilled}/${n} (${((descFilled / n) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Already complete (skipped): ${skippedAlreadyEn.length} (manual/admin AI or all en fields set)`,
  );
  console.log(
    `Target this run: ${targets.length}${LIMIT != null ? ` (--limit=${LIMIT})` : ""}`,
  );
  console.log(
    `Batch size: ${BATCH_SIZE} (logging only), delay between batches: ${DELAY_MS}ms`,
  );

  if (!EXECUTE) {
    const estInputCost =
      ((targets.length * EST_INPUT_TOKENS_PER_CALL) / 1_000_000) *
      PRICE_PER_1M_INPUT_USD;
    const estOutputCost =
      ((targets.length * EST_OUTPUT_TOKENS_PER_CALL) / 1_000_000) *
      PRICE_PER_1M_OUTPUT_USD;
    const batches = Math.ceil(targets.length / BATCH_SIZE);
    const batchDelayMs = Math.max(0, batches - 1) * DELAY_MS;
    const apiMs = targets.length * EST_CALL_MS;
    const upsertMs = targets.length * EST_UPSERT_MS;
    const estMs = apiMs + upsertMs + batchDelayMs;

    const calNote =
      calibration &&
      !hasArg("est-input-tokens") &&
      !hasArg("est-output-tokens") &&
      !hasArg("est-call-ms") &&
      !hasArg("est-upsert-ms")
        ? `Using calibration file ${BACKFILL_TRANSLATION_CALIBRATION_PATH}.`
        : "No/full calibration — pass --est-* or run scripts/test-media-translation-once.mts.";

    console.log("\n=== DRY RUN — no API calls, no DB writes ===");
    console.log(calNote);
    console.log(
      "Note: each target needs a new generateMediaTranslations() call (en was not stored from ja/zh backfill).",
    );
    console.log(
      `Estimated cost: $${(estInputCost + estOutputCost).toFixed(2)}` +
        ` (${EST_INPUT_TOKENS_PER_CALL} in + ${EST_OUTPUT_TOKENS_PER_CALL} out tokens/call)`,
    );
    console.log(
      `Estimated wall time if --execute: ${formatDurationMs(estMs)}`,
    );
    console.log("\nSample targets (first 5):");
    for (const m of targets.slice(0, 5)) {
      const gaps = [
        !String(m.nameEn ?? "").trim() ? "nameEn" : null,
        !String(m.locationEn ?? "").trim() ? "locationEn" : null,
        !String(m.descriptionEn ?? "").trim() ? "descriptionEn" : null,
      ].filter(Boolean);
      console.log(`  - ${m.id}  ${m.name}  [missing: ${gaps.join(", ")}]`);
    }
    console.log("\nRe-run with --execute after approval. Nothing was changed.");
    return;
  }

  console.log("\n=== EXECUTING — real API calls + DB writes (en columns only) ===");
  const failures: Fail[] = [];
  let successCount = 0;
  let noopCount = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    console.log(
      `\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(targets.length / BATCH_SIZE)}`,
    );

    for (const media of batch) {
      try {
        const result = await generateMediaTranslations({
          name: media.name,
          location: media.location,
          description: media.description,
          country: media.country,
        });
        const patch = await patchMediaEnColumnsIfEmpty(media.id, result.en, media);
        if (patch.updated) {
          successCount++;
          console.log(
            `  ✅ ${media.id}  ${media.name}  (wrote: ${patch.fields.join(", ")})`,
          );
        } else {
          noopCount++;
          console.log(`  ⏭ ${media.id}  ${media.name}  (no empty en fields to patch)`);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        failures.push({ mediaId: media.id, name: media.name, error: message });
        console.error(`  ❌ ${media.id}  ${media.name} — ${message}`);
      }
    }

    if (i + BATCH_SIZE < targets.length) await sleep(DELAY_MS);
  }

  console.log("\n=== Summary ===");
  console.log(`Patched: ${successCount}`);
  console.log(`No-op (already filled): ${noopCount}`);
  console.log(`Failed: ${failures.length}`);
  if (failures.length > 0) {
    for (const f of failures) {
      console.log(`  - ${f.mediaId}  ${f.name}: ${f.error}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("\n❌ Fatal:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
