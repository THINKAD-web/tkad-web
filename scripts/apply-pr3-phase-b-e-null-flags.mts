#!/usr/bin/env npx tsx
/**
 * Phase B 4단계 E — null/음수 행에 reviewStatus=flagged (값 미변경).
 *
 *   npx tsx scripts/apply-pr3-phase-b-e-null-flags.mts --dry-run --allow-prod
 *   npx tsx scripts/apply-pr3-phase-b-e-null-flags.mts --apply --confirm=phase-b-e-72 --allow-prod
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { auditCatalogMedia } from "../lib/phase-b-catalog-audit.ts";
import {
  MEDIA_REVIEW_REASON,
  MEDIA_REVIEW_STATUS,
} from "../lib/media-review-status.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

const apply = process.argv.includes("--apply");
const allowProd = process.argv.includes("--allow-prod");
const confirmed = process.argv.includes("--confirm=phase-b-e-72");

if (allowProd) {
  config({ path: resolve(root, ".env.vercel.production"), override: true });
}

function resolveDatabaseUrl(): string | undefined {
  const raw =
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;
  if (/@ep-xxx\.|\/\/user:password@|ep-xxx\.region\.aws\.neon\.tech/i.test(raw)) {
    return undefined;
  }
  return raw;
}

async function main() {
  if (apply && !confirmed) {
    throw new Error("--apply 는 --confirm=phase-b-e-72 과 함께 써야 합니다");
  }
  if (apply && !allowProd) {
    throw new Error("production 적용은 --allow-prod 필수");
  }

  const url = resolveDatabaseUrl();
  if (!url) throw new Error("DATABASE_URL missing");

  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: 2,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const rows = await db.media.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        priceNote: true,
        priceOptions: true,
        mediaMainCategory: true,
        mediaSubCategory: true,
        subCategory: true,
        widthM: true,
        heightM: true,
        dailyFootfall: true,
        impressions: true,
        updatedAt: true,
        ownerUserId: true,
        isActive: true,
        reviewStatus: true,
      },
    });

    const targets = rows.filter((row) =>
      auditCatalogMedia(row).some((f) => f.violationCode === "E"),
    );
    if (targets.length !== 72) {
      throw new Error(`expected 72 E rows, found ${targets.length}`);
    }
    const already = targets.filter(
      (t) => t.reviewStatus === MEDIA_REVIEW_STATUS.flagged,
    );
    console.log(
      JSON.stringify(
        {
          count: targets.length,
          alreadyFlagged: already.length,
          namesPreview: targets.slice(0, 5).map((t) => t.name),
        },
        null,
        2,
      ),
    );

    if (!apply) {
      console.log("[dry-run] 쓰기 없음");
      return;
    }

    const flaggedAt = new Date();
    const ids = targets.map((t) => t.id);
    const result = await pool.query(
      `UPDATE media
       SET review_status = $1,
           review_reason = $2,
           flagged_at = $3
       WHERE id = ANY($4::text[])
       RETURNING id, impressions, daily_footfall, review_status, review_reason`,
      [
        MEDIA_REVIEW_STATUS.flagged,
        MEDIA_REVIEW_REASON.null_or_negative,
        flaggedAt,
        ids,
      ],
    );
    if (result.rowCount !== 72) {
      throw new Error(`expected 72 updates, got ${result.rowCount}`);
    }
    for (const t of targets) {
      const updated = result.rows.find((r) => r.id === t.id);
      if (!updated) throw new Error(`missing return row ${t.id}`);
      if (
        updated.impressions !== t.impressions ||
        updated.daily_footfall !== t.dailyFootfall
      ) {
        throw new Error(`metrics mutated for ${t.id}`);
      }
    }
    console.log("[apply] E 72건 flagged. impressions/dailyFootfall 불변");
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
