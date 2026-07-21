import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  parseMediaCsv,
  type MediaCsvRow,
  type MediaCsvRowError,
} from "@/lib/admin-media-csv";
import { enrichNewMediaLocationFromKakao } from "@/lib/media-location-enrich";
import { isValidCatalogMediaType } from "@/lib/media-auto-categorize";
import { validateCsvDailyFootfall } from "@/lib/media-metrics-write";
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
    return json({
      ok: parsed.errors.length === 0,
      dryRun: true,
      preview: parsed.rows,
      errors: parsed.errors,
      counts: {
        valid: parsed.rows.length,
        errors: parsed.errors.length,
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

  if (outcomes.some((o) => o.kind === "created")) {
    revalidatePath("/ko/media");
    revalidatePath("/en/media");
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

async function createMediaFromCsvRow(
  db: ReturnType<typeof getPrisma>,
  row: MediaCsvRow,
): Promise<string> {
  if (!isValidCatalogMediaType(row.type)) {
    throw new Error("invalid type");
  }

  const footfall = validateCsvDailyFootfall(row.exposure);
  if (!footfall.ok) {
    throw new Error(footfall.errors.map((e) => e.message).join("; "));
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
      type: row.type,
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
    },
  });

  return created.id;
}
