#!/usr/bin/env npx tsx
/**
 * Freetext intent verification — 공항·쇼핑몰 등 PARSER_GAP 회귀.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { parsePlannerFreetextBrief } from "../lib/planner/parse-freetext-brief.ts";
import { parseFreetextMediaIntents } from "../lib/recommend/freetext-media-intents.ts";
import { buildAiRecommendInputFromFreetextRaw } from "../lib/recommend/build-freetext-recommend-input.ts";
import { aiInputToMatching } from "../lib/recommendation-adapters.ts";
import { matchMediaCatalog } from "../lib/matching-engine.ts";
import {
  prismaMediaToMediaItem,
  PUBLIC_MEDIA_CATALOG_INCLUDE,
} from "../lib/public-media-catalog.ts";
import { publicActiveMediaWhere } from "../lib/media-review-status.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.local") });

const CASES = [
  { raw: "서울 공항광고 3000만원", expectIntents: ["airport"] as const },
  { raw: "쇼핑몰 오픈 옥외광고 3000만원", expectIntents: ["mall"] as const },
  { raw: "서울 지하철광고 비용 3000만원", expectIntents: ["subway"] as const },
  { raw: "서울 쉘터 3000만원", expectIntents: ["bus_shelter"] as const },
];

async function loadCatalog() {
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const rows = await db.media.findMany({
    where: publicActiveMediaWhere(),
    include: PUBLIC_MEDIA_CATALOG_INCLUDE,
  });
  await db.$disconnect();
  return rows.map((r) => prismaMediaToMediaItem(r));
}

async function main() {
  const catalog = await loadCatalog();
  let failed = 0;

  for (const c of CASES) {
    const parsed = parsePlannerFreetextBrief(c.raw);
    const intents = parseFreetextMediaIntents(c.raw);
    const ai = buildAiRecommendInputFromFreetextRaw(c.raw, true);
    const matchInput = ai ? aiInputToMatching(ai, catalog) : null;
    const top = matchInput
      ? matchMediaCatalog(catalog, matchInput).slice(0, 5)
      : [];

    const intentOk = c.expectIntents.every((i) => intents.includes(i));
    console.log(`\n=== ${c.raw} ===`);
    console.log("intents:", intents.join(", ") || "(none)");
    console.log(
      "categories:",
      parsed.fields.categories.value?.join("+") ?? "(none)",
    );
    console.log(
      "top5:",
      top.map((r) => r.media.name.slice(0, 40)).join(" | ") || "(none)",
    );

    if (!intentOk) {
      console.error("FAIL: expected intents", c.expectIntents);
      failed++;
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
