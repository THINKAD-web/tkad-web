#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIRS = ["app", "components"];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(name)) out.push(full);
  }
  return out;
}

let fixed = 0;
for (const dir of DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    let src = fs.readFileSync(file, "utf8");
    let next = src;
    while (next.includes("dark:dark:")) {
      next = next.replaceAll("dark:dark:", "dark:");
    }
    // duplicate light fallbacks from nested replace
    next = next.replace(/(text-gray-\d{3})\s+\1/g, "$1");
    next = next.replace(/(border-gray-\d{3})\s+\1/g, "$1");
    next = next.replace(/(bg-gray-\d{2,3})\s+\1/g, "$1");
    next = next.replace(/(bg-white\/\d{2,3})\s+\1/g, "$1");
    if (next !== src) {
      fs.writeFileSync(file, next);
      fixed++;
    }
  }
}
console.log({ filesFixed: fixed });
