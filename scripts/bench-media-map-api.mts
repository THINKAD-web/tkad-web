/**
 * Benchmark map catalog cache — cold vs warm load.
 * Run: npx tsx scripts/bench-media-map-api.mts
 *
 * HTTP 모드(BENCH_HTTP=1)로만 동작; in-process 경로는 Prisma ESM 이슈로 미지원.
 * Optional HTTP check (dev server on :3000):
 *   BENCH_HTTP=1 npx tsx scripts/bench-media-map-api.mts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

import {
  getPublicMediaMapCatalogCached,
  invalidatePublicMediaMapCatalogCache,
} from "../lib/public-media-map-catalog-cache.ts";

async function benchInProcess() {
  invalidatePublicMediaMapCatalogCache();

  const coldStart = performance.now();
  const cold = await getPublicMediaMapCatalogCached();
  const coldMs = performance.now() - coldStart;

  const warmStart = performance.now();
  const warm = await getPublicMediaMapCatalogCached();
  const warmMs = performance.now() - warmStart;

  console.log("in-process catalog cache", {
    catalogSize: cold.catalog.length,
    coldMs: Math.round(coldMs),
    warmMs: Math.round(warmMs),
    sameReference: cold === warm,
  });

  if (warmMs >= coldMs) {
    console.warn("warn: warm load was not faster than cold — cache may be ineffective");
  }
}

async function benchHttp() {
  const qs = "swLat=36.74&swLng=126.11&neLat=38.39&neLng=127.85";
  const url = `http://localhost:3000/api/media/map?${qs}`;
  const times: number[] = [];
  for (let i = 0; i < 2; i++) {
    const t0 = performance.now();
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`HTTP bench skipped: ${res.status} ${url}`);
      return;
    }
    await res.json();
    times.push(performance.now() - t0);
  }
  console.log("HTTP /api/media/map (2 sequential)", {
    firstMs: Math.round(times[0]!),
    secondMs: Math.round(times[1]!),
  });
}

async function main() {
  await benchInProcess();
  if (process.env.BENCH_HTTP === "1") {
    await benchHttp();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
