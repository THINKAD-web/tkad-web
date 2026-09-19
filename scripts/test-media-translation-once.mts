#!/usr/bin/env node
/**
 * One-off manual check for PR2-a (lib/media-ai-translate.ts 3-language extension):
 * generates en/ja/zh for ONE real media row and upserts ja/zh into MediaTranslation,
 * then reads the rows back. Prints everything so a human can eyeball translation
 * quality and confirm the DB write actually landed (which also proves the
 * media_translations table exists on whichever DATABASE_URL this runs against).
 *
 * Usage:
 *   npx tsx scripts/test-media-translation-once.mts --media-id=<id>
 *   npx tsx scripts/test-media-translation-once.mts            # picks one active media
 *
 * Needs ANTHROPIC_API_KEY + DATABASE_URL in .env.local (or whatever dotenv lib/prisma.ts loads).
 * Does NOT touch the 865-media backfill — that's a separate script (PR2-b, next).
 */
import { getPrisma } from "../lib/prisma";
import { generateMediaTranslations, upsertMediaTranslationDrafts } from "../lib/media-ai-translate";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const prisma = getPrisma();
  const mediaId = arg("media-id");

  const media = mediaId
    ? await prisma.media.findUnique({ where: { id: mediaId } })
    : await prisma.media.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });

  if (!media) {
    console.error(mediaId ? `No media found with id=${mediaId}` : "No active media found.");
    process.exit(1);
  }

  console.log("=== Source media (ko) ===");
  console.log({
    id: media.id,
    name: media.name,
    location: media.location,
    description: media.description,
    country: media.country,
  });

  console.log("\n=== Calling Claude (single call, en+ja+zh) ===");
  const t0 = Date.now();
  const result = await generateMediaTranslations({
    name: media.name,
    location: media.location,
    description: media.description,
    country: media.country,
  });
  console.log(`(model: ${result.model}, ${Date.now() - t0}ms)\n`);

  console.log("=== Generated: en ===");
  console.log(result.en);
  console.log("\n=== Generated: ja ===");
  console.log(result.ja);
  console.log("\n=== Generated: zh (Simplified) ===");
  console.log(result.zh);

  console.log("\n=== Upserting ja/zh into MediaTranslation (source: ai) ===");
  await upsertMediaTranslationDrafts(media.id, { ja: result.ja, zh: result.zh });

  const rows = await prisma.mediaTranslation.findMany({
    where: { mediaId: media.id },
    orderBy: { locale: "asc" },
  });
  console.log(`\n=== Read-back from media_translations (${rows.length} row(s)) ===`);
  for (const row of rows) {
    console.log({
      locale: row.locale,
      name: row.name,
      description: row.description,
      location: row.location,
      source: row.source,
      updatedAt: row.updatedAt,
    });
  }

  console.log(
    rows.length === 2
      ? "\n✅ Write confirmed — media_translations table exists and accepted ja+zh rows."
      : "\n⚠️ Expected 2 rows (ja, zh), got a different count — check above.",
  );
}

main()
  .catch((e) => {
    console.error("\n❌ Failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
