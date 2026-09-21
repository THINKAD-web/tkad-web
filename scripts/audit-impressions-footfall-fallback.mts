/**
 * v0-fallback · dailyImpressions === dailyFootfall 영향 규모 (읽기 전용).
 *
 *   npx tsx scripts/audit-impressions-footfall-fallback.mts
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { MODEL_VERSIONS } from "../lib/media/engine/constants.ts";
import {
  dailyFootfallMirrorsEngineDaily,
  storedMonthlyLikelyFootTrafficProxy,
} from "../lib/media-impressions-ssot.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.local"), override: true });

async function main() {
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL);
  if (!url) throw new Error("DATABASE_URL required");
  const pool = new Pool({ connectionString: url });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      dailyFootfall: true,
      impressions: true,
      computedMetric: {
        select: { dailyImpressions: true, modelVersion: true },
      },
    },
  });

  const v0FootfallMirror = rows.filter((r) => {
    const foot = r.dailyFootfall ?? 0;
    const cm = r.computedMetric;
    if (!cm || foot <= 0) return false;
    return (
      cm.modelVersion === MODEL_VERSIONS.V0_FALLBACK &&
      dailyFootfallMirrorsEngineDaily(foot, cm.dailyImpressions)
    );
  });

  const storedProxy = rows.filter((r) => {
    const foot = r.dailyFootfall ?? 0;
    const imp = r.impressions ?? 0;
    return foot > 0 && imp > 0 && storedMonthlyLikelyFootTrafficProxy(imp, foot);
  });

  const report = {
    generatedAt: new Date().toISOString(),
    activeMedia: rows.length,
    v0DailyImpressionsEqualsFootfall: v0FootfallMirror.length,
    storedImpressionsFootTrafficProxy: storedProxy.length,
    samples: {
      v0FootfallMirror: v0FootfallMirror.slice(0, 15).map((r) => ({
        slug: r.slug,
        name: r.name,
        dailyFootfall: r.dailyFootfall,
        impressions: r.impressions,
        engineDaily: r.computedMetric?.dailyImpressions,
      })),
      storedProxy: storedProxy.slice(0, 15).map((r) => ({
        slug: r.slug,
        name: r.name,
        dailyFootfall: r.dailyFootfall,
        impressions: r.impressions,
      })),
    },
  };

  const out = resolve(root, "reports/impressions-footfall-fallback-audit.json");
  mkdirSync(resolve(out, ".."), { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
