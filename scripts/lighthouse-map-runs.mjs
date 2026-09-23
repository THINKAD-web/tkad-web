#!/usr/bin/env node
/**
 * `/media/map` Lighthouse regression helper — mobile simulated, N runs, median.
 *
 * Usage:
 *   node scripts/lighthouse-map-runs.mjs '<url>' <label>
 *
 * Writes `/tmp/lh-<label>-<n>.json` and `/tmp/lh-<label>-median.json`.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const url = process.argv[2];
const label = process.argv[3] ?? "run";
const runs = Number(process.env.LH_RUNS ?? "3");

if (!url) {
  console.error("Usage: node scripts/lighthouse-map-runs.mjs <url> [label]");
  process.exit(1);
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Best-effort LCP DOM node (LH 13 often omits legacy largest-contentful-paint-element). */
function pickLcpElementHint(lhr) {
  const legacy = lhr.audits["largest-contentful-paint-element"]?.details?.items?.[0];
  if (legacy?.node?.snippet) {
    return {
      selector: legacy.node.selector,
      snippet: legacy.node.snippet,
      source: "largest-contentful-paint-element",
    };
  }
  const imgInsight = lhr.audits["image-delivery-insight"]?.details?.items?.[0];
  if (imgInsight?.node?.snippet) {
    return {
      selector: imgInsight.node.selector,
      snippet: imgInsight.node.snippet,
      url: imgInsight.url,
      source: "image-delivery-insight",
    };
  }
  return null;
}

function pickAudits(lhr) {
  const a = lhr.audits ?? {};
  const breakdown = a["lcp-breakdown-insight"]?.details?.items ?? [];
  const breakdownMap = Object.fromEntries(
    breakdown.map((x) => [x.subpart, x.duration]),
  );
  const discoveryRoot = a["lcp-discovery-insight"]?.details?.items ?? [];
  const checklist =
    discoveryRoot.find((x) => x.type === "checklist")?.items ??
    discoveryRoot.items ??
    {};
  return {
    fcpMs: a["first-contentful-paint"]?.numericValue,
    lcpMs: a["largest-contentful-paint"]?.numericValue,
    tbtMs: a["total-blocking-time"]?.numericValue,
    inpMs: a["interaction-to-next-paint"]?.numericValue ?? null,
    lcpTtfbMs: breakdownMap.timeToFirstByte,
    lcpResourceLoadDelayMs: breakdownMap.resourceLoadDelay,
    lcpElementRenderDelayMs: breakdownMap.elementRenderDelay,
    lcpElement: pickLcpElementHint(lhr),
    lcpDiscovery: {
      requestDiscoverable: checklist.requestDiscoverable?.value ?? null,
      priorityHinted: checklist.priorityHinted?.value ?? null,
    },
  };
}

const rows = [];
for (let i = 1; i <= runs; i++) {
  const out = `/tmp/lh-${label}-${i}.json`;
  const r = spawnSync(
    "npx",
    [
      "lighthouse",
      url,
      "--form-factor=mobile",
      "--screenEmulation.mobile",
      "--throttling-method=simulate",
      "--quiet",
      "--output=json",
      `--output-path=${out}`,
      "--chrome-flags=--headless --no-sandbox",
    ],
    { stdio: "inherit", env: process.env },
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
  const lhr = JSON.parse(readFileSync(out, "utf8"));
  const row = pickAudits(lhr);
  rows.push(row);
  console.log(`run ${i}:`, {
    fcpMs: row.fcpMs,
    lcpMs: row.lcpMs,
    tbtMs: row.tbtMs,
    lcpElement: row.lcpElement?.selector ?? row.lcpElement,
  });
}

const inpVals = rows.filter((x) => x.inpMs != null).map((x) => x.inpMs);
const med = {
  fcpMs: median(rows.map((x) => x.fcpMs)),
  lcpMs: median(rows.map((x) => x.lcpMs)),
  tbtMs: median(rows.map((x) => x.tbtMs)),
  inpMs: inpVals.length ? median(inpVals) : null,
};
console.log("MEDIAN", med);
console.log(
  "LCP element (median run #2 hint):",
  rows[1]?.lcpElement ?? rows[0]?.lcpElement,
);
writeFileSync(
  `/tmp/lh-${label}-median.json`,
  JSON.stringify({ url, label, rows, med }, null, 2),
);
