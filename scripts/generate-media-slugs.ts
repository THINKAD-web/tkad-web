#!/usr/bin/env npx tsx
/**
 * 기존 Media 행에 slug 생성·저장.
 * Usage: npx tsx scripts/generate-media-slugs.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { getPrisma } from "../lib/prisma";
import { generateMediaSlug } from "../lib/slug";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });
loadEnv({ path: resolve(process.cwd(), ".env") });

async function main() {
  const db = getPrisma();
  const rows = await db.media.findMany({
    select: { id: true, name: true, nameEn: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  const used = new Set<string>();
  for (const row of rows) {
    if (row.slug?.trim()) used.add(row.slug.trim());
  }

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.slug?.trim()) {
      skipped++;
      continue;
    }
    const slug = generateMediaSlug(row.name, row.nameEn, used);
    await db.media.update({
      where: { id: row.id },
      data: { slug },
    });
    created++;
    console.log(`${row.id} → ${slug}`);
  }

  console.log(`Done. created=${created} skipped=${skipped} total=${rows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const db = getPrisma();
    await db.$disconnect();
  });
