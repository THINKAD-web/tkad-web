#!/usr/bin/env node
/**
 * PR2-b — batch backfill of ja/zh translations for all existing media (~865).
 *
 * Defaults to dry-run (no API calls, no DB writes). Pass --execute to actually run.
 * Scope: same as public catalog (`publicActiveMediaWhere` — isActive + not reviewStatus flagged).
 * Pass --include-non-public to backfill every `media` row (legacy / admin-only).
 * Idempotent: skips any media that already has BOTH a ja and a zh MediaTranslation
 * row, unless --force is passed (then it regenerates and overwrites those rows).
 * Fully sequential (one Claude call at a time) — a delay is inserted between
 * batches only for readable progress logging, not for concurrency.
 *
 * Usage:
 *   npx tsx scripts/backfill-media-translations.mts                      # dry-run, all media
 *   npx tsx scripts/backfill-media-translations.mts --limit=20           # dry-run, first 20 targets
 *   npx tsx scripts/backfill-media-translations.mts --execute            # real run, all targets
 *   npx tsx scripts/backfill-media-translations.mts --execute --force    # re-translate even existing rows
 *
 * The dry-run cost estimate below is a ROUGH placeholder until calibrated with
 * real numbers from scripts/test-media-translation-once.mts's printed
 * input_tokens/output_tokens for one real record:
 *   npx tsx scripts/backfill-media-translations.mts --est-input-tokens=NNN --est-output-tokens=NNN
 *
 * Wall time (--execute) is estimated as:
 *   targets × (est-call-ms + est-upsert-ms) + (batches − 1) × delay-ms
 * Override latency with --est-call-ms / --est-upsert-ms, or run
 * scripts/test-media-translation-once.mts once — it writes
 * scripts/.backfill-media-translations-calibration.json (auto-loaded when flags omitted).
 *
 * Does NOT run automatically — dry-run output must be reviewed and --execute
 * approved by a human before any real API/DB call happens (per project policy
 * for a ~865-record job with real API cost).
 */
import { getPrisma } from "../lib/prisma";
import {
  generateMediaTranslations,
  upsertMediaTranslationDrafts,
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
const FORCE = flag("force");
/** Public-catalog scope (isActive + not flagged). Pass to include deactivated/flagged rows. */
const INCLUDE_NON_PUBLIC = flag("include-non-public");
const BATCH_SIZE = Number(arg("batch-size") ?? "8");
const DELAY_MS = Number(arg("delay-ms") ?? "2000");
const LIMIT = arg("limit") ? Number(arg("limit")) : undefined;

/**
 * Placeholder per-call TOKEN COUNT — override with real numbers once you have
 * them (see file header): --est-input-tokens / --est-output-tokens.
 *
 * The PRICE below is not a placeholder — $3/1M input, $15/1M output is the
 * actual rate for claude-sonnet-4-5-20250929, the dated snapshot this codebase's
 * AI_MODELS.contentGen resolves to (lib/ai-models.ts). If ANTHROPIC_MODEL is set
 * to override that, re-check pricing for whatever model is actually configured.
 */
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
  arg("est-upsert-ms") ?? calibration?.upsertMs ?? "1500",
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
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.media.count(),
      prisma.media.count({ where: { isActive: false } }),
      prisma.media.count({
        where: { isActive: true, reviewStatus: "flagged" },
      }),
    ]);

  const allMedia = allMediaRows;

  const existingCounts = await prisma.mediaTranslation.groupBy({
    by: ["mediaId"],
    _count: { locale: true },
  });
  // Unique(mediaId, locale) caps this at 2 (ja + zh) — >=2 means both are present.
  const fullyTranslated = new Set(
    existingCounts.filter((c) => c._count.locale >= 2).map((c) => c.mediaId),
  );

  let targets = FORCE
    ? allMedia
    : allMedia.filter((m) => !fullyTranslated.has(m.id));
  const skippedAlreadyDone = allMedia.length - targets.length;
  if (LIMIT != null) targets = targets.slice(0, LIMIT);

  console.log(`Total media rows in DB: ${totalInDb}`);
  if (!INCLUDE_NON_PUBLIC) {
    console.log(
      `Scope: public catalog (isActive=true, reviewStatus≠flagged) — ${allMedia.length} media`,
    );
    console.log(
      `Excluded from scope: ${inactiveCount} inactive, ${flaggedActiveCount} active+flagged`,
    );
  } else {
    console.log(`Scope: --include-non-public (all media rows) — ${allMedia.length} media`);
  }
  console.log(`In-scope media this run: ${allMedia.length}`);
  console.log(
    `Already translated (ja+zh present, skipped unless --force): ${skippedAlreadyDone}`,
  );
  console.log(
    `Target this run: ${targets.length}${LIMIT != null ? ` (--limit=${LIMIT})` : ""}`,
  );
  console.log(
    `Batch size: ${BATCH_SIZE} (logging only, calls are sequential), delay between batches: ${DELAY_MS}ms, force: ${FORCE}, include-non-public: ${INCLUDE_NON_PUBLIC}`,
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
      calibration && !hasArg("est-input-tokens") && !hasArg("est-output-tokens") && !hasArg("est-call-ms") && !hasArg("est-upsert-ms")
        ? `Using calibration file ${BACKFILL_TRANSLATION_CALIBRATION_PATH} (recorded ${calibration.recordedAt}).`
        : calibration
          ? `Partial overrides via CLI; file ${BACKFILL_TRANSLATION_CALIBRATION_PATH} fills unset --est-* flags.`
          : "No calibration file — pass --est-* or run scripts/test-media-translation-once.mts first.";

    console.log("\n=== DRY RUN — no API calls, no DB writes ===");
    console.log(calNote);
    console.log(
      `Estimated cost: $${(estInputCost + estOutputCost).toFixed(2)}` +
        ` (input $${estInputCost.toFixed(2)} + output $${estOutputCost.toFixed(2)}, ` +
        `at $${PRICE_PER_1M_INPUT_USD}/1M in + $${PRICE_PER_1M_OUTPUT_USD}/1M out; ` +
        `${EST_INPUT_TOKENS_PER_CALL} in + ${EST_OUTPUT_TOKENS_PER_CALL} out tokens/call)`,
    );
    console.log(
      `Estimated wall time if --execute: ${formatDurationMs(estMs)} — ` +
        `${targets.length}×(${EST_CALL_MS}ms API + ${EST_UPSERT_MS}ms upsert) + ` +
        `${Math.max(0, batches - 1)}×${DELAY_MS}ms batch delay (${batches} batches, sequential)`,
    );
    console.log("\nSample targets (first 5):");
    for (const m of targets.slice(0, 5)) {
      console.log(`  - ${m.id}  ${m.name}  (${m.location})`);
    }
    console.log(
      "\nRe-run with --execute to actually generate + write. Nothing was changed above.",
    );
    return;
  }

  console.log("\n=== EXECUTING — real API calls + DB writes ===");
  const failures: Fail[] = [];
  let successCount = 0;

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    console.log(
      `\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(targets.length / BATCH_SIZE)} (${batch.length} media)`,
    );

    for (const media of batch) {
      try {
        const result = await generateMediaTranslations({
          name: media.name,
          location: media.location,
          description: media.description,
          country: media.country,
        });
        await upsertMediaTranslationDrafts(media.id, {
          ja: result.ja,
          zh: result.zh,
        });
        successCount++;
        console.log(`  ✅ ${media.id}  ${media.name}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        failures.push({ mediaId: media.id, name: media.name, error: message });
        console.error(`  ❌ ${media.id}  ${media.name} — ${message}`);
      }
    }

    if (i + BATCH_SIZE < targets.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failures.length}`);
  console.log(`Skipped (already translated): ${skippedAlreadyDone}`);
  if (failures.length > 0) {
    console.log("\nFailures:");
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
