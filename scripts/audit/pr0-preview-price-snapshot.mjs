#!/usr/bin/env node
/**
 * PR0 preview — price snapshot before/after migration (30 samples + controls).
 * Usage:
 *   DATABASE_URL=... node --import tsx scripts/audit/pr0-preview-price-snapshot.mjs --label pre|post
 */
import pg from "pg";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "../..");

const label = process.argv.includes("--label")
  ? process.argv[process.argv.indexOf("--label") + 1]
  : "pre";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const SAMPLE_FILE = join(root, "reports/pr0-preview-sample-ids.json");

async function loadSampleIds(client) {
  const digital = await client.query(`
    SELECT id FROM media WHERE type IN ('digital','dooh')
      AND (partial_period_rates IS NOT NULL OR price_options IS NOT NULL)
    ORDER BY random() LIMIT 12
  `);
  const digitalPlain = await client.query(`
    SELECT id FROM media WHERE type IN ('digital','dooh')
      AND partial_period_rates IS NULL AND (price_options IS NULL OR price_options::text = 'null')
    ORDER BY random() LIMIT 8
  `);
  const staticRows = await client.query(`
    SELECT id FROM media WHERE type = 'static' ORDER BY random() LIMIT 5
  `);
  const mobileRows = await client.query(`
    SELECT id FROM media WHERE type = 'mobile' ORDER BY random() LIMIT 5
  `);
  const ids = [
    ...digital.rows.map((r) => r.id),
    ...digitalPlain.rows.map((r) => r.id),
    ...staticRows.rows.map((r) => r.id),
    ...mobileRows.rows.map((r) => r.id),
  ];
  return [...new Set(ids)].slice(0, 30);
}

function rowToQuoteMedia(r) {
  return {
    id: r.id,
    name: r.name,
    location: r.location ?? "",
    type: r.type,
    price: Number(r.price) || 0,
    pricePeriod: r.price_period,
    priceOptions: r.price_options,
    partialPeriodRates: r.partial_period_rates,
    dailyFootfall: r.daily_footfall,
    impressions: r.impressions,
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  let sampleIds;
  if (label === "pre") {
    sampleIds = await loadSampleIds(client);
    mkdirSync(dirname(SAMPLE_FILE), { recursive: true });
    writeFileSync(
      SAMPLE_FILE,
      JSON.stringify({ sampleIds, createdAt: new Date().toISOString() }, null, 2),
    );
  } else {
    sampleIds = JSON.parse(readFileSync(SAMPLE_FILE, "utf8")).sampleIds;
  }

  const { rows } = await client.query(
    `SELECT id, name, location, type, price, price_period, price_options, partial_period_rates,
            daily_footfall, impressions, latitude, longitude
     FROM media WHERE id = ANY($1::text[])`,
    [sampleIds],
  );

  const { calculateQuote } = await import("../../lib/quote-calculator.ts");

  const startDate = new Date("2026-03-01");
  const endDate = new Date("2026-03-14");
  const scenarios = [
    { name: "calendar_14d", periodKey: undefined, mediaPriceOptionIndex: {} },
    { name: "wizard_14days", periodKey: "14days", mediaPriceOptionIndex: {} },
    { name: "wizard_1month", periodKey: "1month", mediaPriceOptionIndex: {} },
  ];

  const results = [];
  for (const r of rows) {
    const media = rowToQuoteMedia(r);
    for (const sc of scenarios) {
      try {
        const q = calculateQuote({
          media: [media],
          startDate,
          endDate,
          discountRate: 0,
          periodKey: sc.periodKey,
          mediaPriceOptionIndex: sc.mediaPriceOptionIndex,
        });
        const line = q.lines[0];
        results.push({
          mediaId: r.id,
          type: r.type,
          scenario: sc.name,
          lineSupplyWon: line?.lineSupplyWon ?? null,
          unitPriceWon: line?.unitPriceWon ?? null,
          impressions: line?.impressions ?? null,
          periodDays: line?.periodDays ?? null,
          totalWon: q.totalWon,
        });
      } catch (e) {
        results.push({
          mediaId: r.id,
          type: r.type,
          scenario: sc.name,
          error: String(e),
        });
      }
    }
  }

  const outPath = join(root, `reports/pr0-preview-price-${label}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        label,
        at: new Date().toISOString(),
        sampleCount: sampleIds.length,
        sampleIds,
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${outPath} (${results.length} calc rows)`);
} finally {
  await client.end();
}
