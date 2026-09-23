/**
 * bulk-import dry-run (DB write 없음, Kakao·metrics gate 포함).
 *
 *   npx tsx --env-file=.env.local scripts/bulk-import-dry-run-local.mts scripts/fixtures/officebiztv-buildings-177.quick-add.json
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { validateQuickAddItems } from "@/lib/media-quick-add";
import { enrichQuickAddRowForPersist } from "@/lib/media-quick-add-enrich-one";
import { buildBulkImportRowPreview } from "@/lib/admin-bulk-import-preview";
import {
  gateMediaMetricsWrite,
  metricsWriteErrorBody,
  validateMappedMediaMetrics,
} from "@/lib/media-metrics-write";
import { getPrisma } from "@/lib/prisma";
import { getKakaoRestApiKey } from "@/lib/kakao-address-geocode";

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Usage: bulk-import-dry-run-local.mts <quick-add.json>");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(path.resolve(jsonPath), "utf8")) as unknown[];
const validated = validateQuickAddItems(raw);
if (!validated.ok) {
  console.error(validated.error);
  process.exit(1);
}

const db = getPrisma();
const nameRows = await db.media.findMany({ select: { name: true } });
const existingNamesLower = nameRows.map((r) => r.name.trim().toLowerCase());

type RowResult =
  | {
      kind: "created" | "updated";
      name: string;
      full_address: string;
      addressVerified: boolean;
      preview: ReturnType<typeof buildBulkImportRowPreview>;
      existingId?: string;
    }
  | { kind: "failed"; name: string; full_address: string; error: string; rowIndex: number };

const outcomes: RowResult[] = [];

for (let i = 0; i < validated.items.length; i++) {
  const row = validated.items[i]!;
  const prefix = `[${i + 1}/${validated.items.length}]`;
  process.stderr.write(`${prefix} ${row.media_name.slice(0, 40)}…\n`);
  try {
    const existing = await db.media.findFirst({ where: { name: row.media_name } });
    const { createPayload, addressVerified } =
      await enrichQuickAddRowForPersist(row);
    const preview = buildBulkImportRowPreview({
      createPayload,
      addressVerified,
      existingNamesLower,
      mediaName: row.media_name,
    });
    const metrics = validateMappedMediaMetrics(createPayload, undefined);
    const gate = gateMediaMetricsWrite(metrics, {
      requireAckForWarnings: false,
      rejectPackageScaleOnBatch: true,
    });
    if (gate.kind === "error") {
      outcomes.push({
        kind: "failed",
        name: row.media_name,
        full_address: row.full_address,
        error: metricsWriteErrorBody(gate.result).error,
        rowIndex: i + 1,
      });
      continue;
    }
    outcomes.push({
      kind: existing ? "updated" : "created",
      name: row.media_name,
      full_address: row.full_address,
      addressVerified,
      preview,
      ...(existing ? { existingId: existing.id } : {}),
    });
  } catch (e) {
    outcomes.push({
      kind: "failed",
      name: row.media_name,
      full_address: row.full_address,
      error: e instanceof Error ? e.message : String(e),
      rowIndex: i + 1,
    });
  }
}

await db.$disconnect();

const failed = outcomes.filter((o) => o.kind === "failed");
const kakaoFail = outcomes.filter(
  (o) => o.kind !== "failed" && !o.addressVerified,
);
const created = outcomes.filter((o) => o.kind === "created");
const updated = outcomes.filter((o) => o.kind === "updated");

const report = {
  source: path.basename(jsonPath),
  kakaoKeyPresent: Boolean(getKakaoRestApiKey()),
  counts: {
    total: outcomes.length,
    created: created.length,
    updated: updated.length,
    failed: failed.length,
    addressVerifiedFalse: kakaoFail.length,
  },
  failed,
  kakaoUnverified: kakaoFail.map((o) =>
    o.kind === "failed"
      ? null
      : { name: o.name, full_address: o.full_address },
  ).filter(Boolean),
};

const outPath = jsonPath.replace(/\.json$/i, ".dry-run-report.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify(report.counts, null, 2));
console.log("report:", outPath);
if (failed.length) {
  for (const f of failed) console.log("FAILED", f.rowIndex, f.name, f.error);
}
