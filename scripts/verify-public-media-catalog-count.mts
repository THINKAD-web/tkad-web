#!/usr/bin/env npx tsx
/**
 * Post-deploy verify: public catalog must return ~865 DB rows + networks.
 * Usage: npx tsx scripts/verify-public-media-catalog-count.mts [--url https://tkad.co.kr]
 */
const base =
  process.argv.find((a) => a.startsWith("--url="))?.slice(6) ??
  process.argv[process.argv.indexOf("--url") + 1] ??
  "https://tkad.co.kr";

const url = `${base.replace(/\/$/, "")}/api/public/media-catalog`;
const res = await fetch(url, { cache: "no-store" });
if (!res.ok) {
  console.error("HTTP", res.status, url);
  process.exit(1);
}
const items = (await res.json()) as unknown[];
if (!Array.isArray(items)) {
  console.error("Expected JSON array");
  process.exit(1);
}
const network = items.filter(
  (m) =>
    (m as { catalogSource?: string }).catalogSource === "network" ||
    (m as { type?: string }).type === "network" ||
    String((m as { id?: string }).id ?? "").startsWith("nw_"),
);
const regular = items.length - network.length;
const ok = items.length >= 800 && regular >= 800;
console.log(
  JSON.stringify(
    { url, total: items.length, regular, network: network.length, ok },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 1);
