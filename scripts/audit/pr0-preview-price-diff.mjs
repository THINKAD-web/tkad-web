#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const pre = JSON.parse(readFileSync(join(root, "reports/pr0-preview-price-pre.json"), "utf8"));
const post = JSON.parse(readFileSync(join(root, "reports/pr0-preview-price-post.json"), "utf8"));

const key = (r) => `${r.mediaId}|${r.scenario}`;
const preMap = new Map(pre.results.map((r) => [key(r), r]));
const diffs = [];
let match = 0;

for (const p of post.results) {
  const k = key(p);
  const b = preMap.get(k);
  if (!b) {
    diffs.push({ key: k, issue: "missing in pre" });
    continue;
  }
  if (b.error || p.error) {
    if (b.error === p.error) match++;
    else diffs.push({ key: k, preError: b.error, postError: p.error });
    continue;
  }
  const fields = ["lineSupplyWon", "unitPriceWon", "impressions", "periodDays", "totalWon"];
  const fieldDiffs = {};
  for (const f of fields) {
    if (b[f] !== p[f]) fieldDiffs[f] = { pre: b[f], post: p[f] };
  }
  if (Object.keys(fieldDiffs).length === 0) match++;
  else diffs.push({ key: k, preType: b.type, postType: p.type, fieldDiffs });
}

const out = {
  comparedAt: new Date().toISOString(),
  sampleCount: pre.sampleCount,
  totalRows: post.results.length,
  matched: match,
  mismatched: diffs.length,
  diffs,
};
const outPath = join(root, "reports/pr0-preview-price-diff.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ matched: match, mismatched: diffs.length, outPath }, null, 2));
process.exit(diffs.length > 0 ? 1 : 0);
