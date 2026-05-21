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
    const next = src
      .replace(/text-gray-900\/\d+\s+/g, "")
      .replace(/\s+text-gray-900\/\d+/g, "")
      .replace(/dark:text-white text-gray-900\b/g, "dark:text-white text-gray-900")
      .replace(
        /\[text-shadow:0_24px_120px_rgba\(0,0,0,0\.88\)\]/g,
        "dark:[text-shadow:0_24px_120px_rgba(0,0,0,0.88)]",
      );
    if (next !== src) {
      fs.writeFileSync(file, next);
      fixed++;
    }
  }
}
console.log({ filesFixed: fixed });
