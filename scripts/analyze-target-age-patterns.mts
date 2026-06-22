/**
 * Classify targetAge free-text patterns (read-only DB scan).
 * Usage: npx tsx scripts/analyze-target-age-patterns.mts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { parseTargetAge } from "../lib/planner/parse-target-age.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

const url = process.env.DATABASE_URL?.trim() || process.env.DATABASE_URL_UNPOOLED?.trim();
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(
    new Pool({ connectionString: normalizePgDatabaseUrl(url), max: 2 }),
  ),
});

type Bucket =
  | "range_with_paren"
  | "range_plain"
  | "center_variant"
  | "all_ages"
  | "single_decade"
  | "mz_2030"
  | "empty"
  | "other";

function classifyRaw(raw: string | null | undefined): Bucket {
  const t = raw?.trim() ?? "";
  if (!t) return "empty";
  if (/전\s*연령/i.test(t)) return "all_ages";
  if (/20\s*~\s*30대\s*중심|중심/i.test(t) && /\d+\s*[~\-]\s*\d+\s*대/.test(t))
    return "center_variant";
  if (/\d{1,2}\s*[~\-–—]\s*\d{1,2}\s*대/.test(t) && /\(/.test(t)) return "range_with_paren";
  if (/\d{1,2}\s*[~\-–—]\s*\d{1,2}\s*대/.test(t)) return "range_plain";
  if (/\d{1,2}\s*대/.test(t)) return "single_decade";
  if (/mz|2030|밀레니얼|gen\s*z/i.test(t)) return "mz_2030";
  return "other";
}

async function main() {
  const rows = await prisma.media.findMany({
    where: { isActive: true },
    select: { targetAge: true },
  });
  const total = rows.length;
  const buckets = new Map<Bucket, number>();
  let parsedRange = 0;
  let parsedExplicitAll = 0;
  let parsedFallback = 0;

  for (const r of rows) {
    const b = classifyRaw(r.targetAge);
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
    const p = parseTargetAge(r.targetAge);
    if (p.kind === "range") parsedRange++;
    else if (p.source === "fallback") parsedFallback++;
    else parsedExplicitAll++;
  }

  const pct = (n: number) => ((n / total) * 100).toFixed(1);

  console.log("=== targetAge pattern buckets (active media) ===");
  for (const [k, v] of [...buckets.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pct(v).padStart(5)}%  ${v.toString().padStart(4)}  ${k}`);
  }
  console.log("\n=== parseTargetAge() outcome ===");
  console.log(`  range: ${parsedRange} (${pct(parsedRange)}%)`);
  console.log(`  all/explicit/empty: ${parsedExplicitAll} (${pct(parsedExplicitAll)}%)`);
  console.log(`  fallback→all: ${parsedFallback} (${pct(parsedFallback)}%)`);
  console.log(
    `\nExplicit range parse rate: ${pct(parsedRange)}% | Safe (range+explicit all+fallback): 100%`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
