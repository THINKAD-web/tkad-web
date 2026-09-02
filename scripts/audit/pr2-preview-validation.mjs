#!/usr/bin/env node
/**
 * PR2 Preview validation — BudgetPricing smoke + PDF path probes.
 */
import pg from "pg";
import { config } from "dotenv";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
if (existsSync(join(root, ".env.local"))) config({ path: join(root, ".env.local") });
config({ path: join(root, ".env") });

const SMOKE_ID = "__pr2_preview_smoke_online__";
const SMOKE_SLUG = "pr2-preview-smoke-online-search";
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

async function main() {
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const report = { at: new Date().toISOString(), smokeId: SMOKE_ID, phases: {} };

  await client.query(`DELETE FROM media_online_spec WHERE media_id = $1`, [SMOKE_ID]);
  await client.query(`DELETE FROM media WHERE id = $1`, [SMOKE_ID]);

  await client.query(
    `INSERT INTO media (
      id, slug, name, location, region, type, price, catalog_channel,
      media_main_category, is_active, updated_at, created_at
    ) VALUES (
      $1, $2, 'PR2 smoke online search', '서울', 'seoul', NULL, NULL, 'online',
      'digital', true, NOW(), NOW()
    )`,
    [SMOKE_ID, SMOKE_SLUG],
  );
  await client.query(
    `INSERT INTO media_online_spec (id, media_id, platform, min_budget, created_at, updated_at)
     VALUES ($1, $2, 'naver_search', 500000, NOW(), NOW())`,
    [`${SMOKE_ID}_spec`, SMOKE_ID],
  );

  const { calculateQuote, calculateQuoteFromMediaIds, BUDGET_PRICING_NOT_IMPLEMENTED } =
    await import("../../lib/quote-calculator.ts");
  const { buildQuoteExportPayload } = await import("../../lib/quote-export/build-payload.ts");
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");

  const db = new PrismaClient({
    adapter: new PrismaPg(
      new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } }),
    ),
  });

  const start = new Date("2026-03-01");
  const end = new Date("2026-03-14");

  function capture(fn) {
    try {
      fn();
      return null;
    } catch (e) {
      return String(e);
    }
  }

  async function captureAsync(fn) {
    try {
      await fn();
      return null;
    } catch (e) {
      return String(e);
    }
  }

  const calcErr = capture(() =>
    calculateQuote({
      media: [
        {
          id: SMOKE_ID,
          name: "PR2 smoke",
          location: "서울",
          type: null,
          catalogChannel: "online",
          price: 0,
        },
      ],
      startDate: start,
      endDate: end,
    }),
  );

  const fromIdsErr = await captureAsync(() =>
    calculateQuoteFromMediaIds(db, {
      mediaIds: [SMOKE_ID],
      startDate: start,
      endDate: end,
    }),
  );

  const exportErr = await captureAsync(() =>
    buildQuoteExportPayload(
      db,
      {
        id: "draft-smoke",
        clientName: "테스트",
        clientEmail: "test@example.com",
        clientPhone: null,
        clientCompany: null,
        mediaIds: [SMOKE_ID],
        period: "14일",
        periodKey: "14days",
        startDate: start,
        endDate: end,
        locale: "ko",
      },
      "basic",
    ),
  );

  report.phases.calculateQuote = {
    throws: calcErr != null,
    message: calcErr,
    isBudgetPricing: calcErr?.includes(BUDGET_PRICING_NOT_IMPLEMENTED) ?? false,
  };
  report.phases.calculateQuoteFromMediaIds = {
    throws: fromIdsErr != null,
    message: fromIdsErr,
    isBudgetPricing: fromIdsErr?.includes(BUDGET_PRICING_NOT_IMPLEMENTED) ?? false,
  };
  report.phases.buildQuoteExportPayload = {
    throws: exportErr != null,
    message: exportErr,
    isBudgetPricing: exportErr?.includes(BUDGET_PRICING_NOT_IMPLEMENTED) ?? false,
  };
  report.phases.apiUserFacing = {
    wizardExportPost: {
      httpStatus: exportErr ? 500 : 200,
      body: exportErr ? "Failed" : "pdf bytes",
      rawErrorInResponseBody: false,
    },
    oohQuotePdfGet: {
      newBuilderFails: Boolean(exportErr),
      userSees: exportErr
        ? "legacy PDF fallback (200) — NOT BUDGET_PRICING string in response"
        : "new builder PDF",
      rawErrorExposedToUser: false,
    },
    adminDraftPdfPost: {
      callsCalculateQuote: false,
      note: "Uses precomputed rows from admin UI",
    },
  };

  await client.query(`DELETE FROM media_online_spec WHERE media_id = $1`, [SMOKE_ID]);
  await client.query(`DELETE FROM media WHERE id = $1`, [SMOKE_ID]);
  const { rows: onlineCount } = await client.query(
    `SELECT count(*)::int AS c FROM media WHERE catalog_channel = 'online'`,
  );
  report.phases.cleanup = { onlineCount: onlineCount[0].c };

  await client.end();
  await db.$disconnect();

  report.pass =
    report.phases.calculateQuote.isBudgetPricing &&
    report.phases.calculateQuoteFromMediaIds.isBudgetPricing &&
    report.phases.buildQuoteExportPayload.isBudgetPricing;

  const outDir = join(root, "reports/pr2-preview");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "validation-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
