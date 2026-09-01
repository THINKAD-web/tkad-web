#!/usr/bin/env node
/**
 * PR0 preview QA — saved plan cart render path (DB-level + quote calc).
 * Simulates /my/plan sync GET + media resolve for users with migrated snapshots.
 */
import pg from "pg";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const QA_USER_IDS = [
  "cmo9gp3p8000004lerp514ukb", // thinkad2021 — 5 dooh items
  "cmq23luq9000204l52hgbxl2b", // k2-hero — 2 dooh
  "cms5sp0mx000004jz73r1raco", // wkdworud23 — 2 dooh
  "cmrlui98i000n04jv5czzpyv6", // 1 dooh (4th for coverage)
];

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const { calculateQuote } = await import("../../lib/quote-calculator.ts");
const { normalizeCatalogMediaType } = await import("../../lib/catalog-media-type.ts");

const report = { users: [], summary: { ok: 0, warn: 0, fail: 0 } };

try {
  for (const userId of QA_USER_IDS) {
    const userRes = await client.query(`SELECT id, email FROM users WHERE id = $1`, [userId]);
    const planRes = await client.query(
      `SELECT items, updated_at FROM user_saved_plans WHERE user_id = $1`,
      [userId],
    );
    const email = userRes.rows[0]?.email ?? userId;
    const entry = { userId, email, items: [], issues: [] };

    if (!planRes.rows[0]) {
      entry.issues.push("no user_saved_plans row");
      report.summary.fail++;
      report.users.push(entry);
      continue;
    }

    const items = planRes.rows[0].items;
    if (!Array.isArray(items)) {
      entry.issues.push("items not array");
      report.summary.fail++;
      report.users.push(entry);
      continue;
    }

    for (const raw of items) {
      const mediaId = raw?.mediaId;
      const snapType = raw?.mediaType;
      const itemReport = { mediaId, snapType, mediaName: raw?.mediaName };

      if (snapType === "digital") {
        entry.issues.push(`${mediaId}: snapshot still mediaType=digital`);
      }
      const normalized = normalizeCatalogMediaType(snapType);
      itemReport.normalizedType = normalized;

      const mediaRes = await client.query(
        `SELECT id, name, type, price, price_period, price_options, partial_period_rates,
                daily_footfall, impressions, latitude, longitude, location
         FROM media WHERE id = $1`,
        [mediaId],
      );
      if (!mediaRes.rows[0]) {
        entry.issues.push(`${mediaId}: media row missing — UI would show broken item`);
        itemReport.renderable = false;
        entry.items.push(itemReport);
        continue;
      }
      const m = mediaRes.rows[0];
      itemReport.dbType = m.type;
      itemReport.renderable = true;

      if (normalized && m.type !== normalized && !(snapType === "digital" && m.type === "dooh")) {
        entry.issues.push(`${mediaId}: snapshot ${snapType} vs db ${m.type}`);
      }

      try {
        const q = calculateQuote({
          media: [
            {
              id: m.id,
              name: m.name,
              location: m.location ?? "",
              type: m.type,
              price: Number(m.price) || 0,
              pricePeriod: m.price_period,
              priceOptions: m.price_options,
              partialPeriodRates: m.partial_period_rates,
              dailyFootfall: m.daily_footfall,
              impressions: m.impressions,
              latitude: m.latitude,
              longitude: m.longitude,
            },
          ],
          startDate: new Date("2026-03-01"),
          endDate: new Date("2026-03-14"),
          discountRate: 0,
        });
        itemReport.lineSupplyWon = q.lines[0]?.lineSupplyWon ?? null;
      } catch (e) {
        entry.issues.push(`${mediaId}: quote calc failed — ${e}`);
        itemReport.renderable = false;
      }

      entry.items.push(itemReport);
    }

    if (entry.issues.length === 0) report.summary.ok++;
    else if (entry.items.some((i) => i.renderable === false)) report.summary.fail++;
    else report.summary.warn++;

    report.users.push(entry);
  }
} finally {
  await client.end();
}

const outPath = join(root, "reports/pr0-preview-saved-plans-qa.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), ...report }, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Wrote ${outPath}`);
process.exit(report.summary.fail > 0 ? 1 : 0);
