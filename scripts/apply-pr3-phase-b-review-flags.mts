#!/usr/bin/env npx tsx
/**
 * Phase B 2단계 — Prisma 플래그 적용 (값 미변경).
 *
 * Preview:
 *   npx tsx scripts/apply-pr3-phase-b-review-flags.mts --env=preview
 *   npx tsx scripts/apply-pr3-phase-b-review-flags.mts --apply --confirm=phase-b-6 --env=preview
 *
 * Production: --apply --confirm=phase-b-6 --env=production --confirm-prod
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import {
  MEDIA_REVIEW_STATUS,
  PHASE_B_ABC_FLAG_TARGETS,
} from "../lib/media-review-status.ts";
import { revalidateMediaListAfterScript } from "./lib/revalidate-media-list-after-script";
import { assertScriptDatabaseAccess } from "./lib/script-db-guard.mts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm=phase-b-6");

async function main() {
  if (apply && !confirmed) {
    throw new Error("--apply 는 --confirm=phase-b-6 과 함께 써야 합니다");
  }

  const dbCtx = assertScriptDatabaseAccess({
    scriptName: "apply-pr3-phase-b-review-flags.mts",
    write: apply,
  });

  const ids = PHASE_B_ABC_FLAG_TARGETS.map((t) => t.mediaId);
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(dbCtx.databaseUrl),
    max: 2,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const before = await db.media.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        impressions: true,
        dailyFootfall: true,
        reviewStatus: true,
      },
    });
    if (before.length !== 6) {
      throw new Error(`expected 6 rows, found ${before.length}`);
    }

    const plan = PHASE_B_ABC_FLAG_TARGETS.map((t) => {
      const row = before.find((r) => r.id === t.mediaId)!;
      return {
        ...t,
        name: row.name,
        impressions: row.impressions,
        dailyFootfall: row.dailyFootfall,
        currentStatus: row.reviewStatus,
      };
    });
    console.log("[plan]", JSON.stringify(plan, null, 2));

    if (!apply) {
      console.log("[dry-run] 쓰기 없음. --apply --confirm=phase-b-6 로 적용");
      return;
    }

    const flaggedAt = new Date();
    for (const t of PHASE_B_ABC_FLAG_TARGETS) {
      const beforeRow = before.find((r) => r.id === t.mediaId)!;
      const updated = await db.media.update({
        where: { id: t.mediaId },
        data: {
          reviewStatus: MEDIA_REVIEW_STATUS.flagged,
          reviewReason: t.reviewReason,
          flaggedAt,
        },
        select: {
          id: true,
          impressions: true,
          dailyFootfall: true,
          reviewStatus: true,
          reviewReason: true,
          flaggedAt: true,
        },
      });
      if (
        updated.impressions !== beforeRow.impressions ||
        updated.dailyFootfall !== beforeRow.dailyFootfall
      ) {
        throw new Error(`metrics mutated for ${t.mediaId}`);
      }
      console.warn(
        `[AUDIT] ${JSON.stringify({
          kind: "PHASE_B_REVIEW_FLAG",
          mediaId: updated.id,
          reviewStatus: updated.reviewStatus,
          reviewReason: updated.reviewReason,
          flaggedAt: updated.flaggedAt,
          impressions: updated.impressions,
          dailyFootfall: updated.dailyFootfall,
        })}`,
      );
    }
    console.log("[apply] 6건 flagged. impressions/dailyFootfall 불변 확인");

    await revalidateMediaListAfterScript();
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
