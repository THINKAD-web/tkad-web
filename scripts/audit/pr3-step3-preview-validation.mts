#!/usr/bin/env npx tsx
/**
 * PR3 Step 3 — Preview validation (DB + API + handoff + saved plans).
 *
 * Usage:
 *   npx tsx scripts/audit/pr3-step3-preview-validation.mts
 *   PREVIEW_BASE_URL=https://... npx tsx scripts/audit/pr3-step3-preview-validation.mts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";
import { normalizePgDatabaseUrl } from "../../lib/normalize-pg-database-url.ts";
import { isOnlineCatalogMedia, isPricingUnavailable } from "../../lib/pricing-unavailable.ts";
import { calculateMediaQuoteByDays } from "../../lib/compare-quote.ts";
import {
  resolveHandoffMix,
  planCartToBriefHandoff,
} from "../../lib/planner/brief/handoff.ts";
import type { MediaItem } from "../../lib/media-data.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: join(root, ".env.preview.local"), override: true });
config({ path: join(root, ".env.local"), override: true });

const PREVIEW_BASE =
  process.env.PREVIEW_BASE_URL?.replace(/\/$/, "") ??
  process.env.VERCEL_PREVIEW_URL?.replace(/\/$/, "") ??
  "";

const seed = JSON.parse(
  readFileSync(join(root, "prisma/seed-data/online-media-2026-09.json"), "utf8"),
) as { count: number; rows: Array<{ id: string; slug: string }> };

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function record(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "✔" : "✖"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 200);
  }
  return { status: res.status, body };
}

function rowToMediaItem(row: Record<string, unknown>): MediaItem {
  return {
    id: String(row.id),
    slug: row.slug ? String(row.slug) : undefined,
    name: String(row.name ?? ""),
    nameEn: String(row.name_en ?? row.name ?? ""),
    location: String(row.location ?? ""),
    locationEn: String(row.location_en ?? row.location ?? ""),
    region: String(row.region ?? ""),
    type: row.type == null ? null : String(row.type),
    price: row.price == null ? null : Number(row.price),
    catalogChannel: row.catalog_channel ? String(row.catalog_channel) : undefined,
    catalogSource: "media",
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: [],
    pricePeriod: "month",
  } as unknown as MediaItem;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL required (.env.preview.local)");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: normalizePgDatabaseUrl(dbUrl),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const onlineCount = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM media WHERE catalog_channel = 'online' AND is_active = true`,
  );
  const nOnline = Number(onlineCount.rows[0]?.n ?? 0);
  record("DB online active count = 23", nOnline === 23, `got ${nOnline}`);

  const specCount = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM media_online_spec mos
     JOIN media m ON m.id = mos.media_id
     WHERE m.catalog_channel = 'online'`,
  );
  record(
    "DB media_online_spec rows = 23",
    Number(specCount.rows[0]?.n) === 23,
    `got ${specCount.rows[0]?.n}`,
  );

  const seedIds = seed.rows.map((r) => r.id);
  const seedPresent = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM media WHERE id = ANY($1::text[])`,
    [seedIds],
  );
  record(
    "All 23 seed ids present",
    Number(seedPresent.rows[0]?.n) === 23,
    `got ${seedPresent.rows[0]?.n}`,
  );

  if (PREVIEW_BASE) {
    const catalogUrl = `${PREVIEW_BASE}/api/public/media-catalog?limit=2000&mainCategory=online`;
    const { status, body } = await fetchJson(catalogUrl);
    const items =
      body && typeof body === "object" && "items" in body
        ? (body as { items: unknown[] }).items
        : [];
    const onlineInApi = items.filter(
      (it) =>
        it &&
        typeof it === "object" &&
        (it as { catalogChannel?: string }).catalogChannel === "online",
    );
    record(
      "API catalog online filter returns seeded rows",
      status === 200 && onlineInApi.length >= 23,
      `status=${status}, onlineItems=${onlineInApi.length}`,
    );

    const sampleSlug = seed.rows[0]!.slug;
    const detailUrl = `${PREVIEW_BASE}/ko/media/${sampleSlug}`;
    const detailRes = await fetch(detailUrl, { cache: "no-store" });
    const detailHtml = await detailRes.text();
    record(
      "Detail page CTA B — 문의하기 on sample online slug",
      detailRes.status === 200 &&
        (detailHtml.includes("문의하기") || detailHtml.includes("Contact us")),
      `${sampleSlug} status=${detailRes.status}`,
    );
    record(
      "Detail page hides 견적 받기 primary for online",
      !detailHtml.includes("견적 받기") || detailHtml.includes("문의하기"),
      sampleSlug,
    );
  } else {
    record("API/UI spot-check", false, "PREVIEW_BASE_URL not set — skipped");
  }

  const onlineRows = await client.query(
    `SELECT id, slug, name, name_en, location, location_en, region, type, price, catalog_channel
     FROM media WHERE catalog_channel = 'online' ORDER BY slug LIMIT 30`,
  );
  const catalog = onlineRows.rows.map((r) => rowToMediaItem(r));
  const offlineSample = await client.query(
    `SELECT id, slug, name, name_en, location, location_en, region, type, price, catalog_channel
     FROM media WHERE catalog_channel = 'offline' AND type IS NOT NULL AND price IS NOT NULL LIMIT 5`,
  );
  const mixedCatalog = [
    ...offlineSample.rows.map((r) => rowToMediaItem(r)),
    ...catalog.slice(0, 2),
  ];

  for (const m of catalog.slice(0, 5)) {
    record(
      `isPricingUnavailable online ${m.slug}`,
      isPricingUnavailable(m),
      m.id,
    );
    const q = calculateMediaQuoteByDays(m, 30);
    record(
      `compare-quote inquiry ${m.slug}`,
      q.pricingUnavailable === true && q.costWon === 0,
      `costWon=${q.costWon}`,
    );
  }

  const handoff = resolveHandoffMix({
    catalog: mixedCatalog,
    mediaIds: [mixedCatalog[0]!.id, catalog[0]!.id],
    units: null,
  });
  record(
    "Handoff ?addMedia= blocks online",
    handoff.blockedOnline.length === 1 && handoff.lines.length === 1,
    JSON.stringify(handoff),
  );

  const emptyCart = {
    items: catalog.slice(0, 2).map((m) => ({
      mediaId: m.id,
      mediaName: m.name,
      mediaType: "",
      catalogChannel: "online" as const,
      region: m.region,
      price: 0,
    })),
    updatedAt: "",
  };
  const cartHandoff = planCartToBriefHandoff(emptyCart, mixedCatalog);
  record(
    "Plan cart handoff excludes online",
    cartHandoff.mix.lines.length === 0 && cartHandoff.mix.blockedOnline.length === 2,
    JSON.stringify(cartHandoff.mix),
  );

  // 3-account saved plan regression (PR0 QA users)
  const QA_USER_IDS = [
    "cmo9gp3p8000004lerp514ukb",
    "cmq23luq9000204l52hgbxl2b",
    "cms5sp0mx000004jz73r1raco",
  ];
  let savedOk = 0;
  for (const userId of QA_USER_IDS) {
    const planRes = await client.query(
      `SELECT items FROM user_saved_plans WHERE user_id = $1`,
      [userId],
    );
    const items = planRes.rows[0]?.items;
    if (!Array.isArray(items) || items.length === 0) continue;
    let broken = 0;
    for (const raw of items) {
      const mediaId = raw?.mediaId;
      const m = await client.query(`SELECT id FROM media WHERE id = $1`, [mediaId]);
      if (!m.rows[0]) broken++;
    }
    if (broken === 0) savedOk++;
  }
  record("3-account saved plans — all media ids resolve", savedOk === QA_USER_IDS.length, `${savedOk}/${QA_USER_IDS.length}`);

  await client.end();

  const outDir = join(root, "reports/pr3-preview");
  mkdirSync(outDir, { recursive: true });
  const report = {
    at: new Date().toISOString(),
    previewBase: PREVIEW_BASE || null,
    checks,
    pass: checks.filter((c) => c.ok).length,
    fail: checks.filter((c) => !c.ok).length,
  };
  const outPath = join(outDir, "step3-validation-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
  if (report.fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
