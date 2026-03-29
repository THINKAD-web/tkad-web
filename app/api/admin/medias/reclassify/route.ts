import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { isAdminAuthDebugEnabled } from "@/lib/admin-session";
import { inferCatalogTypeFromDbMedia } from "@/lib/media-auto-categorize";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const dryRun = body.dryRun === true;
  const idsRaw = body.ids;
  const idList =
    Array.isArray(idsRaw) && idsRaw.every((x) => typeof x === "string")
      ? (idsRaw as string[]).map((x) => x.trim()).filter(Boolean)
      : null;

  const db = getPrisma();
  const where =
    idList && idList.length > 0 ? { id: { in: idList } } : undefined;

  const rows = await db.media.findMany({
    where,
    select: {
      id: true,
      name: true,
      type: true,
      location: true,
      description: true,
      subCategory: true,
      tags: true,
      nearbyFacilities: true,
      nearbyStations: true,
      nearbyLandmarks: true,
    },
  });

  const changes: { id: string; name: string; from: string; to: string }[] = [];

  for (const m of rows) {
    const next = inferCatalogTypeFromDbMedia({
      name: m.name,
      location: m.location,
      description: m.description,
      subCategory: m.subCategory,
      tags: m.tags ?? [],
      nearbyFacilities: m.nearbyFacilities,
      nearbyStations: m.nearbyStations,
      nearbyLandmarks: m.nearbyLandmarks,
    });
    if (next !== m.type) {
      changes.push({
        id: m.id,
        name: m.name,
        from: m.type,
        to: next,
      });
    }
  }

  if (!dryRun && changes.length > 0) {
    await db.$transaction(
      changes.map((c) =>
        db.media.update({
          where: { id: c.id },
          data: { type: c.to },
        }),
      ),
    );
  }

  if (isAdminAuthDebugEnabled()) {
    console.log("[admin-api] reclassify", {
      dryRun,
      scanned: rows.length,
      changed: changes.length,
    });
  }

  return json({
    ok: true,
    dryRun,
    scanned: rows.length,
    updated: dryRun ? 0 : changes.length,
    wouldChange: changes.length,
    changes: changes.slice(0, 200),
    changesTruncated: changes.length > 200,
  });
}
