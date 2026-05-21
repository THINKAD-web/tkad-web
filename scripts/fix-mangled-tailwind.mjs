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

function cleanClassString(s) {
  let c = s;
  while (c.includes("dark:dark:")) c = c.replaceAll("dark:dark:", "dark:");
  // collapse duplicate utility tokens in a class string
  const parts = c.split(/\s+/).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out.join(" ");
}

let fixed = 0;
for (const dir of DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    let src = fs.readFileSync(file, "utf8");
    let next = src
      .replace(/bg-gray-505/g, "bg-gray-500/50")
      .replace(/bg-gray-1000/g, "bg-gray-100")
      .replace(/dark:dark:dark:/g, "dark:")
      .replace(/dark:dark:/g, "dark:");
    // clean className="..." and cn("...") strings with duplicate tokens
    next = next.replace(/className="([^"]*)"/g, (_, cls) => {
      const cleaned = cleanClassString(cls);
      return cleaned !== cls ? `className="${cleaned}"` : `className="${cls}"`;
    });
    next = next.replace(/cn\(\s*"([^"]*)"/g, (m, cls) => {
      const cleaned = cleanClassString(cls);
      return cleaned !== cls ? m.replace(cls, cleaned) : m;
    });
    if (next !== src) {
      fs.writeFileSync(file, next);
      fixed++;
    }
  }
}
console.log({ filesFixed: fixed });
