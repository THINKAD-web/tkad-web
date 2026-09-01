#!/usr/bin/env node
/**
 * Production media backfill: URL typo (hthttps) + media_sub_category realignment.
 *
 * Usage (order matters):
 *   node --env-file=.env.local scripts/media-data-backfill.mjs --backup
 *   node --env-file=.env.local scripts/media-data-backfill.mjs --dry-run
 *   node --env-file=.env.local scripts/media-data-backfill.mjs --apply   # after approval
 *   node --env-file=.env.local scripts/media-data-backfill.mjs --verify
 */
import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env"), override: false });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.vercel.production"), override: true });

const URL_FIX_MEDIA_ID = "cmo3f0k4a000004k43dss6zft";

/** browse sub id → main id (from lib/media-browse-categories.ts) */
const SUB_TO_MAIN = {
  digital_signage: "ooh",
  billboard: "ooh",
  wall_mural: "ooh",
  media_pole: "ooh",
  led_screen: "ooh",
  popup_display: "ooh",
  banner: "ooh",
  subway_station: "transit",
  subway_train: "transit",
  bus_exterior: "transit",
  bus_interior: "transit",
  taxi_exterior: "transit",
  taxi_interior: "transit",
  vehicle_wrap: "transit",
  airport: "transit",
  inflight: "transit",
  ktx_terminal: "transit",
  ferry: "transit",
  bus_shelter: "shelter",
  digital_shelter: "shelter",
  city_furniture: "shelter",
  phone_booth: "shelter",
  trash_can: "shelter",
  street_furniture: "shelter",
  mall: "shopping",
  convenience: "shopping",
  supermarket: "shopping",
  outlet: "shopping",
  market: "shopping",
  duty_free: "shopping",
  hotplace: "entertainment",
  cinema: "entertainment",
  leisure: "entertainment",
  concert: "entertainment",
  stadium: "entertainment",
  tv_radio: "entertainment",
  streaming: "entertainment",
  cafe: "lifestyle",
  restaurant: "lifestyle",
  gym: "lifestyle",
  beauty: "lifestyle",
  laundry: "lifestyle",
  elevator: "building",
  office: "building",
  apartment: "building",
  hospital: "building",
  hotel: "building",
  parking: "building",
  campus: "education",
  school: "education",
  academy: "education",
  library: "education",
  museum: "culture",
  park: "culture",
  government: "culture",
  religious: "culture",
  community: "culture",
  social_media: "digital",
  search_ad: "digital",
  display_ad: "digital",
  influencer: "digital",
  elevator_network: "network",
  convenience_network: "network",
  campus_network: "network",
  hospital_network: "network",
  parking_network: "network",
  franchise_network: "network",
  other: "etc",
};

function cleanUrl(raw) {
  if (!raw || typeof raw !== "string") return raw;
  return raw.replace(/^ht+(?=https?:\/\/)/i, "");
}

/** 매체형태 기준 제안 sub — 사용자 확정 방침(전광판→digital_signage 포함) */
function proposeSubFromName(name) {
  const n = name || "";
  if (/(미디어폴|media\s*pole)/i.test(n)) return "media_pole";
  if (/(전광판|LED|사이니지|signage|DOOH)/i.test(n)) return "digital_signage";
  if (/(외벽|아트월|wallscape)/i.test(n)) return "wall_mural";
  if (/(빌보드|billboard)/i.test(n)) return "billboard";
  return null;
}

function classifyBatch(row) {
  const { id, name, current_sub, proposed_sub, type } = row;
  const isPackage = /(네트워크|패키지)/i.test(name);
  const tier1Digital =
    /전광판/i.test(name) && current_sub === "billboard" && type === "dooh";
  const tier1Wall =
    /(외벽|아트월)/i.test(name) && current_sub === "billboard";
  const auto49Subway =
    /전광판/i.test(name) && current_sub === "subway_station";
  const manual11 =
    proposed_sub === "digital_signage" &&
    ["leisure", "ktx_terminal"].includes(current_sub) &&
    /전광판|LED/i.test(name);

  if (tier1Digital) return "tier1_전광판+billboard+digital";
  if (tier1Wall && proposed_sub === "wall_mural") return "tier1_외벽아트월+billboard";
  if (auto49Subway) return "auto49_전광판+subway";
  if (manual11) return "manual11_leisure_ktx";
  if (isPackage) return "package_패키지";
  return "remainder_잔여";
}

function sqlLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (Array.isArray(v)) {
    if (v.length === 0) return "ARRAY[]::text[]";
    return `ARRAY[${v.map((x) => sqlLiteral(x)).join(", ")}]::text[]`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function getPool() {
  const url =
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("[backfill] DATABASE_URL missing");
    process.exit(1);
  }
  return new pg.Pool({ connectionString: url, max: 2 });
}

async function fetchActiveMedia(pool) {
  const { rows } = await pool.query(`
    SELECT id, name, type, media_main_category, media_sub_category, media_category,
           image, extracted_images, updated_at
    FROM media WHERE is_active
    ORDER BY name
  `);
  return rows;
}

function buildSubUpdates(rows) {
  const updates = [];
  for (const row of rows) {
    const proposed = proposeSubFromName(row.name);
    if (!proposed || row.media_sub_category === proposed) continue;
    const proposedMain = SUB_TO_MAIN[proposed] ?? row.media_main_category;
    updates.push({
      id: row.id,
      name: row.name,
      type: row.type,
      current_sub: row.media_sub_category,
      current_main: row.media_main_category,
      proposed_sub: proposed,
      proposed_main: proposedMain,
      batch: classifyBatch({
        id: row.id,
        name: row.name,
        current_sub: row.media_sub_category,
        proposed_sub: proposed,
        type: row.type,
      }),
    });
  }
  return updates;
}

function buildUrlUpdates(rows) {
  const row = rows.find((r) => r.id === URL_FIX_MEDIA_ID);
  if (!row) return [];
  const fields = [];
  const nextImage = cleanUrl(row.image);
  if (row.image && nextImage !== row.image) {
    fields.push({ column: "image", before: row.image, after: nextImage });
  }
  const nextExtracted = (row.extracted_images ?? []).map(cleanUrl);
  const extractedChanged = nextExtracted.some(
    (u, i) => u !== (row.extracted_images ?? [])[i],
  );
  if (extractedChanged) {
    fields.push({
      column: "extracted_images",
      before: row.extracted_images,
      after: nextExtracted,
    });
  }
  if (fields.length === 0) return [];
  return [{ id: row.id, name: row.name, fields }];
}

async function runBackup(pool) {
  const rows = await fetchActiveMedia(pool);
  const subUpdates = buildSubUpdates(rows);
  const urlUpdates = buildUrlUpdates(rows);
  const touchIds = new Set([
    ...subUpdates.map((u) => u.id),
    ...urlUpdates.map((u) => u.id),
  ]);
  const backupRows = rows
    .filter((r) => touchIds.has(r.id))
    .map((r) => ({
      id: r.id,
      name: r.name,
      media_main_category: r.media_main_category,
      media_sub_category: r.media_sub_category,
      media_category: r.media_category,
      image: r.image,
      extracted_images: r.extracted_images,
      updated_at: r.updated_at,
    }));

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await mkdir(resolve(root, "tmp"), { recursive: true });
  const jsonPath = resolve(root, `tmp/media-backfill-backup-${ts}.json`);
  const sqlPath = resolve(root, `tmp/media-backfill-rollback-${ts}.sql`);

  const rollbackLines = [
    "-- Rollback for media-data-backfill",
    `-- Generated: ${new Date().toISOString()}`,
    "BEGIN;",
  ];
  for (const r of backupRows) {
    rollbackLines.push(
      `UPDATE media SET media_main_category = ${sqlLiteral(r.media_main_category)}, media_sub_category = ${sqlLiteral(r.media_sub_category)}, media_category = ${sqlLiteral(r.media_category)}, image = ${sqlLiteral(r.image)}, extracted_images = ${sqlLiteral(r.extracted_images)}, updated_at = ${sqlLiteral(r.updated_at)} WHERE id = ${sqlLiteral(r.id)};`,
    );
  }
  rollbackLines.push("COMMIT;");

  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        rowCount: backupRows.length,
        urlFixIds: urlUpdates.map((u) => u.id),
        subUpdateIds: subUpdates.map((u) => u.id),
        rows: backupRows,
      },
      null,
      2,
    ),
  );
  await writeFile(sqlPath, rollbackLines.join("\n") + "\n");

  console.log(
    JSON.stringify(
      {
        step: "backup",
        jsonPath,
        sqlPath,
        backupRowCount: backupRows.length,
        subUpdateCount: subUpdates.length,
        urlFixCount: urlUpdates.length,
      },
      null,
      2,
    ),
  );
  return { jsonPath, sqlPath, subUpdates, urlUpdates };
}

async function runDryRun(pool) {
  const rows = await fetchActiveMedia(pool);
  const subUpdates = buildSubUpdates(rows);
  const urlUpdates = buildUrlUpdates(rows);

  const batchCounts = {};
  for (const u of subUpdates) {
    batchCounts[u.batch] = (batchCounts[u.batch] || 0) + 1;
  }

  const proposedGroups = {};
  for (const u of subUpdates) {
    const k = `${u.proposed_sub} ← ${u.current_sub}`;
    proposedGroups[k] = (proposedGroups[k] || 0) + 1;
  }

  // Tier1 ∩ auto49 overlap check
  const tier1WallIds = new Set(
    subUpdates
      .filter((u) => u.batch === "tier1_외벽아트월+billboard")
      .map((u) => u.id),
  );
  const auto49Overlap = subUpdates.filter(
    (u) =>
      u.batch === "tier1_외벽아트월+billboard" &&
      /(외벽|아트월)/i.test(u.name) &&
      u.current_sub === "billboard",
  ).length;

  console.log(
    JSON.stringify(
      {
        step: "dry-run",
        generatedAt: new Date().toISOString(),
        urlFixes: urlUpdates,
        subUpdateCount: subUpdates.length,
        subUpdatesByBatch: batchCounts,
        subUpdatesByProposedGroup: proposedGroups,
        note: {
          tier1_wall_in_auto49_overlap:
            "wall 20건은 tier1과 auto49에 동시 분류되나 UPDATE는 id당 1회",
          uniqueUpdateIds: subUpdates.length,
          policy: "매체형태 기준: 전광판/LED/사이니지→digital_signage (수동11·패키지·잔여 포함)",
        },
        subUpdates: subUpdates.map((u) => ({
          id: u.id,
          name: u.name,
          current_sub: u.current_sub,
          proposed_sub: u.proposed_sub,
          current_main: u.current_main,
          proposed_main: u.proposed_main,
          batch: u.batch,
        })),
      },
      null,
      2,
    ),
  );
}

async function runApply(pool) {
  const rows = await fetchActiveMedia(pool);
  const subUpdates = buildSubUpdates(rows);
  const urlUpdates = buildUrlUpdates(rows);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const u of urlUpdates) {
      const row = rows.find((r) => r.id === u.id);
      const newImage = cleanUrl(row.image);
      const newExtracted = (row.extracted_images ?? []).map(cleanUrl);
      await client.query(
        `UPDATE media SET image = $1, extracted_images = $2, updated_at = NOW() WHERE id = $3`,
        [newImage, newExtracted, u.id],
      );
    }

    for (const u of subUpdates) {
      await client.query(
        `UPDATE media SET media_sub_category = $1, media_main_category = $2, updated_at = NOW() WHERE id = $3`,
        [u.proposed_sub, u.proposed_main, u.id],
      );
    }

    await client.query("COMMIT");
    console.log(
      JSON.stringify(
        {
          step: "apply",
          appliedUrlFixes: urlUpdates.length,
          appliedSubUpdates: subUpdates.length,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function runVerify(pool) {
  const rows = await fetchActiveMedia(pool);
  const subUpdates = buildSubUpdates(rows);
  const urlUpdates = buildUrlUpdates(rows);

  const hthttps = await pool.query(`
    SELECT COUNT(DISTINCT id)::int AS n FROM (
      SELECT id FROM media WHERE is_active AND COALESCE(image,'') ~* 'hthttps'
      UNION
      SELECT m.id FROM media m, unnest(m.extracted_images) u(v)
      WHERE m.is_active AND v ~* 'hthttps'
    ) t
  `);

  const digitalSignageCount = await pool.query(`
    SELECT COUNT(*)::int AS n FROM media
    WHERE is_active AND media_sub_category = 'digital_signage'
  `);

  const filterSample = await pool.query(`
    SELECT id, name, media_sub_category FROM media
    WHERE is_active AND media_sub_category = 'digital_signage'
      AND name ~* '(스키장|KTX|리조트).*전광판|전광판.*(스키장|KTX|리조트)'
    ORDER BY name LIMIT 15
  `);

  const signature = await pool.query(`
    SELECT id, name, image, extracted_images FROM media
    WHERE id = $1
  `, [URL_FIX_MEDIA_ID]);

  console.log(
    JSON.stringify(
      {
        step: "verify",
        remainingSubMismatches: subUpdates.length,
        remainingUrlFixes: urlUpdates.length,
        hthttpsMediaCount: hthttps.rows[0].n,
        digitalSignageActiveCount: digitalSignageCount.rows[0].n,
        skiKtxSamples: filterSample.rows,
        signatureSquare: signature.rows[0],
        remainingMismatches: subUpdates.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

async function main() {
  const flags = new Set(process.argv.slice(2));
  const pool = await getPool();
  try {
    if (flags.has("--backup")) await runBackup(pool);
    else if (flags.has("--dry-run")) await runDryRun(pool);
    else if (flags.has("--apply")) await runApply(pool);
    else if (flags.has("--verify")) await runVerify(pool);
    else {
      console.error(
        "Usage: --backup | --dry-run | --apply | --verify (one at a time)",
      );
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
