#!/usr/bin/env node
/**
 * Scans app/[locale] for generateMetadata title/description literals.
 * Run: node scripts/audit-seo-metadata.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const APP = path.join(ROOT, "app", "[locale]");

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, acc);
    else if (
      name.name === "page.tsx" ||
      name.name === "layout.tsx"
    )
      acc.push(p);
  }
  return acc;
}

const titleRe =
  /(?:const|let)\s+title\s*=\s*(?:isKo\s*\?\s*)?["'`]([^"'`]+)["'`]/g;
const descRe =
  /(?:const|let)\s+description\s*=\s*(?:isKo\s*\?\s*)?["'`]([^"'`]+)["'`]/g;
const buildShareRe = /buildShareMetadata\s*\(\s*\{[^}]*title:\s*["'`]([^"'`]+)["'`]/g;

const titles = new Map();
const descriptions = new Map();

for (const file of walk(APP)) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, "utf8");
  if (!src.includes("generateMetadata")) continue;

  for (const re of [titleRe, buildShareRe]) {
    let m;
    while ((m = re.exec(src))) {
      const t = m[1].trim();
      if (!titles.has(t)) titles.set(t, []);
      titles.get(t).push(rel);
    }
  }
  let m;
  while ((m = descRe.exec(src))) {
    const d = m[1].trim();
    if (!descriptions.has(d)) descriptions.set(d, []);
    descriptions.get(d).push(rel);
  }
}

const dupTitles = [...titles.entries()].filter(([, files]) => files.length > 1);
const dupDescs = [...descriptions.entries()].filter(
  ([, files]) => files.length > 1,
);

console.log("=== Duplicate titles (exact string) ===");
for (const [t, files] of dupTitles.slice(0, 30)) {
  console.log(`\n"${t}" (${files.length}):`);
  files.forEach((f) => console.log(`  - ${f}`));
}
if (dupTitles.length > 30)
  console.log(`\n... and ${dupTitles.length - 30} more`);

console.log("\n=== Duplicate descriptions (exact string) ===");
for (const [d, files] of dupDescs.slice(0, 20)) {
  console.log(`\n"${d.slice(0, 80)}..." (${files.length}):`);
  files.forEach((f) => console.log(`  - ${f}`));
}
if (dupDescs.length > 20)
  console.log(`\n... and ${dupDescs.length - 20} more`);

console.log(
  `\nSummary: ${titles.size} unique title strings, ${dupTitles.length} duplicated; ${descriptions.size} unique descriptions, ${dupDescs.length} duplicated.`,
);
