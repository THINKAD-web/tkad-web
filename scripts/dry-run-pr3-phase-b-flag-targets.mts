#!/usr/bin/env npx tsx
/**
 * Phase B 2단계 dry-run — 플래그 대상 6건 SELECT only.
 *
 *   npx tsx scripts/dry-run-pr3-phase-b-flag-targets.mts
 *
 * D/E 포함 금지. impressions / dailyFootfall 미변경.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { PHASE_B_ABC_FLAG_TARGETS } from "../lib/media-review-status.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.vercel.production"), override: true });

function resolveDatabaseUrl(): string | undefined {
  const raw =
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim();
  if (!raw) return undefined;
  if (/@ep-xxx\.|\/\/user:password@|ep-xxx\.region\.aws\.neon\.tech/i.test(raw)) {
    return undefined;
  }
  return raw;
}

async function main() {
  const url = resolveDatabaseUrl();
  if (!url) throw new Error("DATABASE_URL missing");

  const ids = PHASE_B_ABC_FLAG_TARGETS.map((t) => t.mediaId);
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: 2,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    await db.$executeRawUnsafe("SET default_transaction_read_only = on");
    const rows = await db.media.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        impressions: true,
        dailyFootfall: true,
      },
    });
    const found = new Set(rows.map((r) => r.id));
    const missing = ids.filter((id) => !found.has(id));
    console.log(
      JSON.stringify(
        {
          expectedCount: ids.length,
          foundCount: rows.length,
          missing,
          rows: rows.map((r) => ({
            id: r.id,
            name: r.name,
            impressions: r.impressions,
            dailyFootfall: r.dailyFootfall,
            plannedReason: PHASE_B_ABC_FLAG_TARGETS.find(
              (t) => t.mediaId === r.id,
            )?.reviewReason,
          })),
        },
        null,
        2,
      ),
    );
    if (rows.length !== 6 || missing.length > 0) {
      throw new Error(
        `expected 6 ids, found ${rows.length}, missing ${missing.join(",")}`,
      );
    }
    console.log("[dry-run] OK — 6건 특정됨, 쓰기 없음");
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
