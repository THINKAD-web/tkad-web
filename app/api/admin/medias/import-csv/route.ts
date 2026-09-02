import { revalidateMediaCachesBulk } from "@/lib/media-cache-revalidate";
import type { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  parseMediaCsv,
  type MediaCsvRow,
  type MediaCsvRowError,
} from "@/lib/admin-media-csv";
import { enrichNewMediaLocationFromKakao } from "@/lib/media-location-enrich";
import { normalizeCatalogMediaType } from "@/lib/media-auto-categorize";
import { resolveCatalogChannelForMediaWrite } from "@/lib/catalog-channel";
import {
  gateMediaMetricsWrite,
  metricsWriteErrorBody,
  validateCsvDailyFootfall,
} from "@/lib/media-metrics-write";
import { maybeAutoRecomputeMediaMetrics } from "@/lib/media/engine/auto-recompute";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type ImportOutcome =
  | { kind: "created"; rowIndex: number; id: string; name: string }
  | { kind: "failed"; rowIndex: number; name: string; error: string };

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: { csv?: string; dryRun?: boolean };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const csv = String(body.csv ?? "");
  if (!csv.trim()) {
    return json({ error: "csv required" }, 400);
  }

  const dryRun = body.dryRun === true;
  const parsed = parseMediaCsv(csv);

  if (parsed.rows.length === 0 && parsed.errors.length > 0) {
    return json(
      {
        ok: false,
        dryRun,
        errors: parsed.errors,
        outcomes: [],
        counts: { created: 0, failed: 0 },
      },
      400,
    );
  }

  if (dryRun) {
    const metricErrors: MediaCsvRowError[] = [...parsed.errors];
    for (const row of parsed.rows) {
      const footfall = validateCsvDailyFootfall(row.exposure, {
        name: row.name,
        type: row.type,
      });
      const gate = gateMediaMetricsWrite(footfall, {
        requireAckForWarnings: false,
        rejectPackageScaleOnBatch: true,
      });
      if (gate.kind === "error") {
        metricErrors.push({
          rowIndex: row.rowIndex,
          field: "노출수",
          message: metricsWriteErrorBody(gate.result).error,
        });
      }
    }
    return json({
      ok: metricErrors.length === 0,
      dryRun: true,
      preview: parsed.rows,
      errors: metricErrors,
      counts: {
        valid: parsed.rows.length,
        errors: metricErrors.length,
      },
    });
  }

  const db = getPrisma();
  const outcomes: ImportOutcome[] = [];
  const allErrors: MediaCsvRowError[] = [...parsed.errors];

  for (const row of parsed.rows) {
    try {
      const id = await createMediaFromCsvRow(db, row);
      outcomes.push({ kind: "created", rowIndex: row.rowIndex, id, name: row.name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      outcomes.push({
        kind: "failed",
        rowIndex: row.rowIndex,
        name: row.name,
        error: msg,
      });
    }
  }

  const created = outcomes.filter(
    (o): o is Extract<ImportOutcome, { kind: "created" }> => o.kind === "created",
  );
  if (created.length > 0) {
    revalidateMediaCachesBulk(created.map((o) => ({ id: o.id })));
  }

  return json({
    ok: outcomes.every((o) => o.kind === "created"),
    dryRun: false,
    errors: allErrors,
    outcomes,
    counts: {
      created: outcomes.filter((o) => o.kind === "created").length,
      failed: outcomes.filter((o) => o.kind === "failed").length,
    },
  });
}

export async function createMediaFromCsvRow(
  db: ReturnType<typeof getPrisma>,
  row: MediaCsvRow,
): Promise<string> {
  const catalogType = normalizeCatalogMediaType(row.type);
  if (!catalogType) {
    throw new Error("invalid type");
  }

  const footfall = validateCsvDailyFootfall(row.exposure, {
    name: row.name,
    type: catalogType,
  });
  const gate = gateMediaMetricsWrite(footfall, {
    requireAckForWarnings: false,
    rejectPackageScaleOnBatch: true,
  });
  if (gate.kind === "error") {
    throw new Error(metricsWriteErrorBody(gate.result).error);
  }

  const filled = await enrichNewMediaLocationFromKakao({
    location: row.location,
    latitude: null,
    longitude: null,
    city: null,
    district: null,
  });

  const created = await db.media.create({
    data: {
      name: row.name,
      location: row.location,
      region: row.region,
      type: catalogType,
      price: row.price,
      description: row.description || null,
      width: row.width,
      height: row.height,
      dailyFootfall: footfall.values.dailyFootfall ?? null,
      latitude: filled.latitude,
      longitude: filled.longitude,
      city: filled.city,
      district: filled.district,
      addressVerified: filled.addressVerified,
      isActive: false,
      catalogChannel: resolveCatalogChannelForMediaWrite({ type: catalogType }),
    },
  });

  await maybeAutoRecomputeMediaMetrics(db, created.id);

  return created.id;
}
