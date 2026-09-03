#!/usr/bin/env npx tsx
/**
 * PR5-b commit 1 — verify onlineSpec on list payload + compare still inquiry.
 * Usage: BASE=https://tkad.co.kr node scripts/pr5-b-compare-commit1-verify.mjs
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "https://tkad.co.kr").replace(/\/$/, "");

async function main() {
  const res = await fetch(
    `${BASE}/api/public/media?catalogChannel=online&limit=25`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const rows = data.data ?? data.items ?? data.medias ?? data;
  if (!Array.isArray(rows)) throw new Error("unexpected API shape");

  const withSpec = rows.filter(
    (r) => r.onlineSpec && (r.onlineSpec.cpcMin != null || r.onlineSpec.cpmMin != null),
  );
  const calculableSlug = "google-ads-search";
  const sample = rows.find((r) => r.slug === calculableSlug);

  console.log("=== commit 1 payload verify ===");
  console.log(`online rows: ${rows.length}`);
  console.log(`rows with onlineSpec rates: ${withSpec.length}`);
  console.log(
    `${calculableSlug} onlineSpec:`,
    sample?.onlineSpec ? "present" : "MISSING",
  );
  console.log(`catalogChannel on sample: ${sample?.catalogChannel ?? "MISSING"}`);

  const passPayload =
    rows.length >= 23 &&
    withSpec.length >= 14 &&
    sample?.onlineSpec?.cpcMin != null;

  console.log("\nExpected: onlineSpec present, compare UI still inquiry (manual/compare page)");
  console.log(passPayload ? "PASS payload" : "FAIL payload");
  process.exit(passPayload ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
