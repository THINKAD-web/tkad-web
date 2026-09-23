/**
 * effectMemo / description — 근거 없는 「참여율 N%」 문구 제거 (#618 컬럼 정리 후 잔여 텍스트).
 *
 *   npx tsx scripts/sanitize-effect-memo-engagement-copy.mts
 *   npx tsx scripts/sanitize-effect-memo-engagement-copy.mts --apply --confirm-prod
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  ENGAGEMENT_RATE_COPY_PATTERN,
  sanitizeUnsourcedEngagementCopyInText,
} from "../lib/engagement-rate-trust.ts";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { assertScriptDatabaseAccess } from "./lib/script-db-guard.mts";
import { revalidateMediaCachesAfterScript } from "./lib/revalidate-media-list-after-script.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const apply = process.argv.includes("--apply");

type TextField = "effectMemo" | "description";

async function main() {
  const dbCtx = assertScriptDatabaseAccess({
    scriptName: "sanitize-effect-memo-engagement-copy.mts",
  });

  const url = normalizePgDatabaseUrl(dbCtx.databaseUrl);
  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      engagementRate: true,
      description: true,
      effectMemo: true,
    },
  });

  const plan: Array<{
    id: string;
    slug: string | null;
    name: string;
    field: TextField;
    before: string;
    after: string | null;
    reason: string;
  }> = [];

  for (const row of rows) {
    for (const field of ["effectMemo", "description"] as const) {
      const before = row[field];
      if (!before?.trim()) continue;
      if (!ENGAGEMENT_RATE_COPY_PATTERN.test(before)) continue;

      const { next, changed, reason } =
        sanitizeUnsourcedEngagementCopyInText(before);
      if (!changed) continue;

      plan.push({
        id: row.id,
        slug: row.slug,
        name: row.name,
        field,
        before,
        after: next,
        reason,
      });

      if (apply) {
        await db.media.update({
          where: { id: row.id },
          data: { [field]: next },
        });
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    apply,
    dbTarget: dbCtx.target,
    hostname: dbCtx.hostname,
    rowsScanned: rows.length,
    toUpdate: plan.length,
    plan,
  };

  const out = resolve(root, "reports/effect-memo-engagement-copy-sanitize.json");
  mkdirSync(resolve(out, ".."), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (apply && plan.length > 0) {
    await revalidateMediaCachesAfterScript(
      plan.map((p) => ({ id: p.id, slug: p.slug })),
    );
  }

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
