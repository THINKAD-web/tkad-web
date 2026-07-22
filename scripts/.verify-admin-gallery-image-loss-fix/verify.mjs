/**
 * Verify admin gallery image-loss fix (no live admin UI required).
 * - Concurrent append: stale closure vs functional update
 * - Idle save on primary∈extracted sample from DB
 * - Purge intent gate
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  imageFieldsForApiBody,
  mergePrimaryAndExtracted,
} from "../../lib/admin-media-gallery-urls.ts";
import { resolveBunnyUrlsToPurge } from "../../lib/bunny-storage.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;
config({ path: path.resolve(__dirname, "../../.env.local") });

function appendUploaded(prev, uploaded) {
  const seen = new Set(prev);
  const next = [...prev];
  for (const u of uploaded) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    next.push(u);
  }
  return next;
}

/** Reproduce pre-fix race: each completion spreads a closed-over snapshot. */
function raceStaleClosure(initial, batches) {
  let urls = [...initial];
  const closures = batches.map(() => [...urls]);
  for (let i = 0; i < batches.length; i++) {
    urls = [...closures[i], ...batches[i]];
  }
  return urls;
}

/** Fixed: each completion applies functional append on latest. */
function raceFunctional(initial, batches) {
  let urls = [...initial];
  for (const batch of batches) {
    urls = appendUploaded(urls, batch);
  }
  return urls;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const initial = ["https://cdn.example/existing.jpg"];
  const batches = [
    ["https://cdn.example/u1.jpg"],
    ["https://cdn.example/u2.jpg"],
    ["https://cdn.example/u3.jpg"],
    ["https://cdn.example/u4.jpg"],
  ];
  const beforeRace = raceStaleClosure(initial, batches);
  const afterRace = raceFunctional(initial, batches);

  process.env.BUNNY_CDN_BASE_URL ||= "https://tkad-cdn.b-cdn.net";
  const prev = [
    "https://tkad-cdn.b-cdn.net/a.jpg",
    "https://tkad-cdn.b-cdn.net/b.jpg",
    "https://tkad-cdn.b-cdn.net/c.jpg",
  ];
  const nextShrunk = [
    "https://tkad-cdn.b-cdn.net/a.jpg",
    "https://tkad-cdn.b-cdn.net/c.jpg",
  ];
  const purgeNoIntent = resolveBunnyUrlsToPurge(prev, nextShrunk, undefined);
  const purgeWithIntent = resolveBunnyUrlsToPurge(prev, nextShrunk, [
    "https://tkad-cdn.b-cdn.net/b.jpg",
  ]);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  let dbSample = null;
  try {
    const rows = await prisma.media.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        image: true,
        extractedImages: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
    });
    const dup = rows.find((r) => {
      const img = r.image?.trim();
      return img && (r.extractedImages ?? []).includes(img);
    });
    const target =
      dup ??
      rows.find((r) => (r.extractedImages?.length ?? 0) + (r.image ? 1 : 0) >= 2);
    if (target) {
      const mergedBefore = mergePrimaryAndExtracted(
        target.image,
        target.extractedImages,
      );
      const idle = imageFieldsForApiBody(
        target.image ?? "",
        (target.extractedImages ?? []).join("\n"),
      );
      const mergedAfter = mergePrimaryAndExtracted(
        idle.image,
        idle.extractedImages,
      );
      const accidentalShrink = {
        previous: mergedBefore,
        // Simulate stale form that lost first URL then saved without purgeImageUrls
        next: mergedBefore.slice(1),
      };
      const purgeGate = resolveBunnyUrlsToPurge(
        accidentalShrink.previous.filter((u) =>
          u.includes("b-cdn.net") || u.includes("cloudinary"),
        ).length
          ? accidentalShrink.previous.map((u) =>
              u.startsWith("http")
                ? u.replace(/^https?:\/\/[^/]+/, "https://tkad-cdn.b-cdn.net")
                : u,
            )
          : [
              "https://tkad-cdn.b-cdn.net/x1.jpg",
              "https://tkad-cdn.b-cdn.net/x2.jpg",
            ],
        accidentalShrink.next.length
          ? accidentalShrink.next.map((u) =>
              u.startsWith("http")
                ? u.replace(/^https?:\/\/[^/]+/, "https://tkad-cdn.b-cdn.net")
                : u,
            )
          : ["https://tkad-cdn.b-cdn.net/x2.jpg"],
        undefined,
      );
      dbSample = {
        id: target.id,
        name: target.name,
        updatedAt: target.updatedAt,
        before: {
          image: target.image,
          extractedCount: target.extractedImages?.length ?? 0,
          mergedCount: mergedBefore.length,
          primaryInExtracted: Boolean(
            target.image &&
              (target.extractedImages ?? []).includes(target.image),
          ),
        },
        afterIdleSaveSimulation: {
          image: idle.image,
          extractedCount: idle.extractedImages.length,
          mergedCount: mergedAfter.length,
          uniquePreserved: mergedAfter.length === mergedBefore.length,
          sameSet:
            [...mergedAfter].sort().join("|") ===
            [...mergedBefore].sort().join("|"),
        },
        accidentalShrinkPurgeSkipped: {
          skippedCount: purgeGate.skippedWithoutIntent.length,
          toPurgeCount: purgeGate.toPurge.length,
        },
      };
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  const report = {
    measuredAt: new Date().toISOString(),
    concurrentUpload: {
      initialCount: initial.length,
      batches: batches.length,
      beforeFixLostUrls: beforeRace,
      beforeFixCount: beforeRace.length,
      afterFixUrls: afterRace,
      afterFixCount: afterRace.length,
      staleDropped:
        afterRace.filter((u) => !beforeRace.includes(u)).length > 0 ||
        beforeRace.length < afterRace.length,
    },
    purgeIntentGate: {
      noIntent: purgeNoIntent,
      withIntent: purgeWithIntent,
    },
    dbSample,
  };

  await writeFile(
    path.join(outDir, "report.json"),
    JSON.stringify(report, null, 2),
  );

  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"/>
<title>Admin gallery image-loss fix verify</title>
<style>
body{font-family:ui-sans-serif,system-ui;margin:24px;background:#0b0f14;color:#e8eef7}
h1{font-size:20px} h2{font-size:15px;margin-top:28px;color:#9fb3c8}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{border:1px solid #243041;border-radius:12px;padding:16px;background:#121821}
.bad{color:#ff8b8b}.good{color:#7ddea5} code{font-size:12px;word-break:break-all}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;background:#1c2736;margin:2px;font-size:11px}
</style></head><body>
<h1>Admin gallery image-loss fix — verification</h1>
<p>Measured: ${report.measuredAt}</p>
<div class="grid">
  <div class="card">
    <h2 class="bad">BEFORE — stale closure race</h2>
    <p>4 rapid uploads from same snapshot → keep only last batch</p>
    <p>Count: <strong>${beforeRace.length}</strong> (expected ${initial.length + batches.length})</p>
    ${beforeRace.map((u) => `<span class="pill">${u.split("/").pop()}</span>`).join("")}
  </div>
  <div class="card">
    <h2 class="good">AFTER — functional append</h2>
    <p>Each completion appends onto latest gallery</p>
    <p>Count: <strong>${afterRace.length}</strong></p>
    ${afterRace.map((u) => `<span class="pill">${u.split("/").pop()}</span>`).join("")}
  </div>
</div>
<div class="card" style="margin-top:16px">
  <h2>CDN purge gate</h2>
  <p>No purgeImageUrls → toPurge=${purgeNoIntent.toPurge.length}, skipped=${purgeNoIntent.skippedWithoutIntent.length}</p>
  <p>With purgeImageUrls=[b.jpg] → toPurge=${purgeWithIntent.toPurge.length}</p>
</div>
${
  dbSample
    ? `<div class="card" style="margin-top:16px">
  <h2>DB sample idle-save</h2>
  <p><code>${dbSample.id}</code><br/>${dbSample.name}</p>
  <p>merged before=${dbSample.before.mergedCount}, extracted=${dbSample.before.extractedCount}, primary∈extracted=${dbSample.before.primaryInExtracted}</p>
  <p class="good">after idle save: merged=${dbSample.afterIdleSaveSimulation.mergedCount}, uniquePreserved=${dbSample.afterIdleSaveSimulation.uniquePreserved}, sameSet=${dbSample.afterIdleSaveSimulation.sameSet}</p>
  <p>accidental shrink without intent: CDN toPurge=${dbSample.accidentalShrinkPurgeSkipped.toPurgeCount}, skipped=${dbSample.accidentalShrinkPurgeSkipped.skippedCount}</p>
</div>`
    : "<p>No DB sample</p>"
}
</body></html>`;
  await writeFile(path.join(outDir, "preview.html"), html);

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
