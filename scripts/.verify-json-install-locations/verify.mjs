/**
 * Verify JSON/quick-add installLocations wiring against live DB (read + dry map).
 * Optional: round-trip persist on a media that already has installs, then restore.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  mapQuickAddToDb,
  mediaDbRowToQuickAddJson,
  quickAddJsonWithAliasKeys,
  validateQuickAddItem,
} from "../../lib/media-quick-add.ts";
import { parseMediaInstallLocations } from "../../lib/media-install-locations.ts";
import { persistMediaInstallLocations } from "../../lib/persist-media-install-locations.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../.env.local") });

async function main() {
  await mkdir(__dirname, { recursive: true });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const rows = await prisma.media.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        installLocations: true,
        location: true,
        city: true,
        district: true,
        type: true,
        description: true,
        subCategory: true,
        tags: true,
        price: true,
        priceNote: true,
        widthM: true,
        heightM: true,
        resolution: true,
        operatingHours: true,
        dailyFootfall: true,
        weekdayFootfall: true,
        targetAge: true,
        impressions: true,
        reach: true,
        frequency: true,
        cpm: true,
        engagementRate: true,
        visibilityScore: true,
        effectMemo: true,
        extractedImages: true,
        nearbyFacilities: true,
        nearbyStations: true,
        nearbyLandmarks: true,
        pastAdvertisers: true,
        pricePeriod: true,
        priceOptions: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    const withInstalls = rows.find(
      (r) => parseMediaInstallLocations(r.installLocations).length >= 2,
    );
    const withoutInstalls = rows.find(
      (r) => parseMediaInstallLocations(r.installLocations).length === 0,
    );

    if (!withInstalls) throw new Error("No media with >=2 installLocations");

    const exported = mediaDbRowToQuickAddJson(withInstalls);
    const payload = quickAddJsonWithAliasKeys(exported);
    const exportOk = Array.isArray(payload.installLocations)
      ? payload.installLocations.length >= 2
      : false;

    // Simulate JSON edit: add a third point
    const edited = {
      ...exported,
      installLocations: [
        ...(exported.installLocations ?? []),
        {
          label: "VERIFY-TEMP-POINT",
          location: "검증용 임시 지점",
          latitude: 35.1796,
          longitude: 129.0756,
        },
      ],
    };
    const validated = validateQuickAddItem(edited, 0);
    if (!validated.ok) throw new Error(validated.error);
    const mapped = mapQuickAddToDb(validated.item);
    const centroidOk =
      mapped.installLocations?.length === edited.installLocations.length &&
      mapped.latitude != null &&
      mapped.longitude != null;

    // Persist then restore (live bidirectional check)
    const original = parseMediaInstallLocations(withInstalls.installLocations);
    await persistMediaInstallLocations(
      prisma,
      withInstalls.id,
      mapped.installLocations ?? null,
    );
    await prisma.media.update({
      where: { id: withInstalls.id },
      data: {
        latitude: mapped.latitude,
        longitude: mapped.longitude,
      },
    });
    const afterWrite = await prisma.media.findUnique({
      where: { id: withInstalls.id },
      select: {
        installLocations: true,
        latitude: true,
        longitude: true,
      },
    });
    const afterParsed = parseMediaInstallLocations(afterWrite?.installLocations);
    const writeOk =
      afterParsed.some((p) => p.label === "VERIFY-TEMP-POINT") &&
      afterParsed.length === (mapped.installLocations?.length ?? 0) &&
      afterWrite?.latitude != null &&
      Math.abs((afterWrite.latitude ?? 0) - (mapped.latitude ?? 0)) < 1e-6;

    await persistMediaInstallLocations(prisma, withInstalls.id, original);
    await prisma.media.update({
      where: { id: withInstalls.id },
      data: {
        latitude: withInstalls.latitude,
        longitude: withInstalls.longitude,
      },
    });
    const restored = await prisma.media.findUnique({
      where: { id: withInstalls.id },
      select: { installLocations: true },
    });
    const restoreOk =
      parseMediaInstallLocations(restored?.installLocations).length ===
      original.length;

    // Regression: JSON without installLocations key
    let regressionOk = false;
    if (withoutInstalls) {
      const noInstallExport = mediaDbRowToQuickAddJson(withoutInstalls);
      const v = validateQuickAddItem(
        {
          ...noInstallExport,
          // ensure key absent
        },
        0,
      );
      regressionOk = v.ok && v.item.installLocations === undefined;
    }

    const report = {
      measuredAt: new Date().toISOString(),
      sampleId: withInstalls.id,
      sampleName: withInstalls.name,
      exportOk,
      exportInstallCount: exported.installLocations?.length ?? 0,
      centroidOk,
      mappedCentroid: {
        latitude: mapped.latitude,
        longitude: mapped.longitude,
        installCount: mapped.installLocations?.length ?? 0,
      },
      writeOk,
      restoreOk,
      regressionOk,
      payloadPreview: payload,
    };

    await writeFile(
      path.join(__dirname, "report.json"),
      JSON.stringify(report, null, 2),
    );

    const pretty = JSON.stringify(payload, null, 2);
    const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"/>
<title>JSON edit — installLocations</title>
<style>
body{margin:0;font-family:ui-sans-serif,system-ui;background:#0f1419;color:#e7eef7}
.bar{padding:12px 16px;border-bottom:1px solid #243041;display:flex;gap:12px;align-items:center}
.badge{font-size:11px;padding:2px 8px;border-radius:999px;background:#1d4ed8}
.editor{margin:16px;border:1px solid #334155;border-radius:12px;overflow:hidden;background:#111827}
.editor h1{font-size:14px;margin:0;padding:12px 16px;border-bottom:1px solid #243041;color:#93c5fd}
pre{margin:0;padding:16px;font-size:12px;line-height:1.45;white-space:pre-wrap;word-break:break-word;max-height:70vh;overflow:auto}
.hl{background:#14532d;color:#bbf7d0}
.meta{padding:12px 16px;font-size:12px;color:#94a3b8}
</style></head><body>
<div class="bar">
  <strong>JSON으로 편집</strong>
  <span class="badge">installLocations export</span>
  <span style="font-size:12px;color:#94a3b8">${withInstalls.name}</span>
</div>
<div class="editor">
  <h1>/api/admin/medias/${withInstalls.id}/json → json</h1>
  <pre>${pretty
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(
      /("installLocations"|"install_locations")/g,
      '<span class="hl">$1</span>',
    )}</pre>
</div>
<div class="meta">
  exportOk=${exportOk} · points=${exported.installLocations?.length ?? 0} ·
  write+restoreOk=${writeOk && restoreOk} · regressionOk=${regressionOk} ·
  centroid=(${mapped.latitude}, ${mapped.longitude})
</div>
</body></html>`;
    await writeFile(path.join(__dirname, "preview.html"), html);
    console.log(JSON.stringify({
      ...report,
      payloadPreview: undefined,
      payloadKeys: Object.keys(payload),
    }, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
