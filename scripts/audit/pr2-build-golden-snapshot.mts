#!/usr/bin/env node
/**
 * PR2 — golden snapshot from pr0/pr1a prod baselines (expected copied, not recomputed).
 * Media `price` uses prod baseline unitPriceWon from pr0 results (preview DB prices differ).
 * Optional DATABASE_URL enriches name/options/impressions; prod-only rows use fixtures JSON.
 */
import { config } from "dotenv";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { calculateQuote } from "../../lib/quote-calculator.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

if (existsSync(join(root, ".env.local"))) config({ path: join(root, ".env.local") });
config({ path: join(root, ".env") });

const CLASSIFIED = [
  "cmr9xedzi000a04layhba2ulc",
  "cmrap3eo4000004jv8b2tt90v",
  "cmrn711g8000404ib3hct4qpy",
  "cmtd4wpic000004ic5oeqzdxq",
];

const SCENARIOS = [
  { name: "calendar_14d", periodKey: undefined as string | undefined },
  { name: "wizard_14days", periodKey: "14days" },
  { name: "wizard_1month", periodKey: "1month" },
] as const;

type DbRow = {
  id: string;
  name: string;
  location: string | null;
  type: string | null;
  catalog_channel: string | null;
  price: number;
  price_period: string | null;
  price_options: unknown;
  partial_period_rates: unknown;
  daily_footfall: number | null;
  impressions: number | null;
  latitude: number | null;
  longitude: number | null;
};

async function loadDbRows(sampleIds: string[]): Promise<Map<string, DbRow>> {
  const url = process.env.DATABASE_URL;
  const map = new Map<string, DbRow>();
  if (!url) return map;

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const { rows } = await client.query(
    `SELECT id, name, location, type, catalog_channel, price, price_period, price_options,
            partial_period_rates, daily_footfall, impressions, latitude, longitude
     FROM media WHERE id = ANY($1::text[])`,
    [sampleIds],
  );
  await client.end();
  for (const r of rows) map.set(r.id, r);
  return map;
}

function prodUnitPriceByMedia(
  pr0Results: Array<Record<string, unknown>>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of pr0Results) {
    const id = r.mediaId as string;
    if (!map.has(id) && typeof r.unitPriceWon === "number") {
      map.set(id, r.unitPriceWon);
    }
  }
  return map;
}

async function main() {
  const pr0Post = JSON.parse(
    readFileSync(join(root, "reports/pr0-prod-price-post.json"), "utf8"),
  );
  const pr1a = JSON.parse(
    readFileSync(join(root, "reports/pr1a-prod-price-check.json"), "utf8"),
  );

  const sampleIds: string[] = [
    ...new Set([...(pr0Post.sampleIds as string[]), ...CLASSIFIED]),
  ];
  if (sampleIds.length !== 34) {
    throw new Error(`Expected 34 sampleIds, got ${sampleIds.length}`);
  }

  const prodUnitPrice = prodUnitPriceByMedia(pr0Post.results);

  const expectedByKey = new Map<string, Record<string, unknown>>();
  for (const r of pr0Post.results as Array<Record<string, unknown>>) {
    expectedByKey.set(`${r.mediaId}|${r.scenario}`, r);
  }
  for (const r of pr1a.classified as Array<Record<string, unknown>>) {
    const key = `${r.mediaId}|${r.scenario}`;
    expectedByKey.set(key, {
      ...(expectedByKey.get(key) ?? {}),
      mediaId: r.mediaId,
      scenario: r.scenario,
      totalWon: r.totalWon,
    });
  }

  const expected: Record<string, unknown>[] = [];
  for (const mediaId of sampleIds) {
    for (const sc of SCENARIOS) {
      const key = `${mediaId}|${sc.name}`;
      const row = expectedByKey.get(key);
      if (row?.totalWon == null) {
        throw new Error(`Missing expected totalWon for ${key}`);
      }
      expected.push({
        mediaId,
        scenario: sc.name,
        totalWon: row.totalWon,
        lineSupplyWon: row.lineSupplyWon ?? null,
        unitPriceWon: row.unitPriceWon ?? null,
        impressions: row.impressions ?? null,
        periodDays: row.periodDays ?? null,
      });
    }
  }
  if (expected.length !== 102) {
    throw new Error(`Expected 102 rows, got ${expected.length}`);
  }

  const dbById = await loadDbRows(sampleIds);

  const prodOnlyPath = join(
    root,
    "lib/pricing/__tests__/golden/prod-only-media-fixtures.json",
  );
  const prodOnlyFixtures: Array<Record<string, unknown>> = existsSync(prodOnlyPath)
    ? JSON.parse(readFileSync(prodOnlyPath, "utf8"))
    : [];

  const classifiedFixturesPath = join(
    root,
    "lib/pricing/__tests__/golden/classified-media-fixtures.json",
  );

  const startDate = new Date("2026-03-01");
  const endDate = new Date("2026-03-14");
  const media: Record<string, unknown>[] = [];

  for (const mediaId of sampleIds) {
    const db = dbById.get(mediaId);
    const prodOnly = prodOnlyFixtures.find((f) => f.id === mediaId);
    const classifiedOnly = existsSync(classifiedFixturesPath)
      ? (JSON.parse(readFileSync(classifiedFixturesPath, "utf8")) as Array<Record<string, unknown>>).find(
          (f) => f.id === mediaId,
        )
      : undefined;

    let price = prodUnitPrice.get(mediaId);
    if (classifiedOnly?.price != null) {
      price = Number(classifiedOnly.price);
    } else if (price == null && prodOnly?.price != null) {
      price = Number(prodOnly.price);
    } else if (price == null && db) {
      price = Number(db.price) || 0;
    }
    if (price == null) {
      throw new Error(`No prod baseline price for ${mediaId}`);
    }

    const fixture = {
      id: mediaId,
      name:
        (db?.name as string) ??
        (prodOnly?.name as string) ??
        (classifiedOnly?.name as string) ??
        mediaId,
      location:
        db?.location ??
        prodOnly?.location ??
        classifiedOnly?.location ??
        "",
      type:
        db?.type ??
        prodOnly?.type ??
        classifiedOnly?.type ??
        (pr0Post.results.find((r: { mediaId: string }) => r.mediaId === mediaId)?.type as string),
      catalogChannel:
        db?.catalog_channel ??
        prodOnly?.catalogChannel ??
        classifiedOnly?.catalogChannel ??
        "offline",
      price,
      pricePeriod:
        db?.price_period ??
        prodOnly?.pricePeriod ??
        classifiedOnly?.pricePeriod ??
        null,
      priceOptions:
        db?.price_options ??
        prodOnly?.priceOptions ??
        classifiedOnly?.priceOptions ??
        null,
      partialPeriodRates:
        db?.partial_period_rates ??
        prodOnly?.partialPeriodRates ??
        classifiedOnly?.partialPeriodRates ??
        null,
      dailyFootfall:
        db?.daily_footfall ??
        prodOnly?.dailyFootfall ??
        classifiedOnly?.dailyFootfall ??
        null,
      impressions:
        db?.impressions ??
        prodOnly?.impressions ??
        classifiedOnly?.impressions ??
        null,
      latitude:
        db?.latitude ??
        prodOnly?.latitude ??
        classifiedOnly?.latitude ??
        null,
      longitude:
        db?.longitude ??
        prodOnly?.longitude ??
        classifiedOnly?.longitude ??
        null,
    };

    media.push(fixture);
  }

  const mismatches: Array<Record<string, unknown>> = [];
  for (const exp of expected) {
    const m = media.find((row) => row.id === exp.mediaId);
    const scenario = SCENARIOS.find((s) => s.name === exp.scenario)!;
    const q = calculateQuote({
      media: [m as Parameters<typeof calculateQuote>[0]["media"][0]],
      startDate,
      endDate,
      discountRate: 0,
      periodKey: scenario.periodKey,
      mediaPriceOptionIndex: {},
    });
    if (q.totalWon !== exp.totalWon) {
      mismatches.push({
        mediaId: exp.mediaId,
        scenario: exp.scenario,
        expectedTotalWon: exp.totalWon,
        actualTotalWon: q.totalWon,
      });
    }
  }

  if (mismatches.length > 0) {
    const out = join(root, "reports/pr2-golden-build-mismatches.json");
    writeFileSync(out, JSON.stringify({ mismatches }, null, 2));
    throw new Error(
      `${mismatches.length} fixture mismatches — wrote ${out}. Add/adjust classified-media-fixtures.json`,
    );
  }

  const typeCounts: Record<string, number> = {};
  for (const m of media) {
    const t = (m.type as string) || "unknown";
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }

  const out = {
    version: 1,
    label: "pr2-golden-from-pr0-pr1a-prod-baseline",
    at: new Date().toISOString(),
    sampleCount: 34,
    calcRows: 102,
    typeCounts,
    sampleIds,
    startDate: "2026-03-01",
    endDate: "2026-03-14",
    scenarios: SCENARIOS,
    media,
    expected,
    _fixtureNote:
      "media.price = prod baseline unitPriceWon (pr0 post). DB enriches options/impressions only.",
  };

  const outPath = join(
    root,
    "lib/pricing/__tests__/golden/pr2-quote-snapshot.json",
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ outPath, sampleCount: 34, calcRows: 102, typeCounts }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
