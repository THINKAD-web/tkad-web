#!/usr/bin/env node
/**
 * Bulk-replace light-invisible text/bg/border utilities per launch checklist.
 * Scans app/ + components/ only (excludes node_modules, .next, tkad-web duplicate).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIRS = ["app", "components"];
const EXT = new Set([".tsx", ".ts"]);

/** Longest patterns first to avoid partial replacements */
const REPLACEMENTS = [
  ["text-white/90", "dark:text-white/90 text-gray-800"],
  ["text-white/85", "dark:text-white/85 text-gray-800"],
  ["text-white/82", "dark:text-white/82 text-gray-800"],
  ["text-white/80", "dark:text-white/80 text-gray-700"],
  ["text-white/78", "dark:text-white/78 text-gray-700"],
  ["text-white/75", "dark:text-white/75 text-gray-700"],
  ["text-white/70", "dark:text-white/70 text-gray-600"],
  ["text-white/65", "dark:text-white/65 text-gray-600"],
  ["text-white/60", "dark:text-white/60 text-gray-500"],
  ["text-white/55", "dark:text-white/55 text-gray-500"],
  ["text-white/50", "dark:text-white/50 text-gray-400"],
  ["text-white/40", "dark:text-white/40 text-gray-400"],
  ["text-white/35", "dark:text-white/35 text-gray-400"],
  ["text-white/30", "dark:text-white/30 text-gray-300"],
  ["text-white/25", "dark:text-white/25 text-gray-300"],
  ["text-white/20", "dark:text-white/20 text-gray-300"],
  ["text-white/15", "dark:text-white/15 text-gray-300"],
  ["text-white/12", "dark:text-white/12 text-gray-300"],
  ["text-white/10", "dark:text-white/10 text-gray-300"],
  ["text-white/92", "dark:text-white/92 text-gray-800"],
  ["text-white/88", "dark:text-white/88 text-gray-800"],
  ["text-neutral-100", "dark:text-neutral-100 text-gray-900"],
  ["text-neutral-200", "dark:text-neutral-200 text-gray-800"],
  ["text-gray-100", "dark:text-gray-100 text-gray-900"],
  ["text-gray-200", "dark:text-gray-200 text-gray-800"],
  ["text-white", "dark:text-white text-gray-900"],
  ["bg-white/10", "dark:bg-white/10 bg-gray-100"],
  ["bg-white/8", "dark:bg-white/8 bg-gray-100"],
  ["bg-white/6", "dark:bg-white/6 bg-gray-50"],
  ["bg-white/5", "dark:bg-white/5 bg-gray-50"],
  ["bg-black/40", "dark:bg-black/40 bg-white/80"],
  ["bg-black", "dark:bg-black bg-white"],
  ["border-white/20", "dark:border-white/20 border-gray-300"],
  ["border-white/18", "dark:border-white/18 border-gray-300"],
  ["border-white/15", "dark:border-white/15 border-gray-200"],
  ["border-white/14", "dark:border-white/14 border-gray-200"],
  ["border-white/12", "dark:border-white/12 border-gray-200"],
  ["border-white/10", "dark:border-white/10 border-gray-200"],
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, out);
    } else if (EXT.has(path.extname(name))) {
      out.push(full);
    }
  }
  return out;
}

let filesChanged = 0;
let totalReplacements = 0;
const perPattern = Object.fromEntries(REPLACEMENTS.map(([p]) => [p, 0]));

for (const dir of DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    let src = fs.readFileSync(file, "utf8");
    let fileCount = 0;
    for (const [from, to] of REPLACEMENTS) {
      if (src.includes(from)) {
        // Skip tokens already prefixed with dark: to avoid dark:dark: duplication
        const re = new RegExp(
          `(?<!dark:)${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
          "g",
        );
        const matches = src.match(re);
        if (matches?.length) {
          src = src.replace(re, to);
          perPattern[from] += matches.length;
          fileCount += matches.length;
        }
      }
    }
    if (fileCount > 0) {
      fs.writeFileSync(file, src);
      filesChanged += 1;
      totalReplacements += fileCount;
    }
  }
}

console.log(JSON.stringify({ filesChanged, totalReplacements, perPattern }, null, 2));
