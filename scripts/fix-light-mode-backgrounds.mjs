#!/usr/bin/env node
/**
 * 라이트 모드에서 단독 쓰인 어두운 배경 → dark: + 밝은 라이트 대체
 * node scripts/fix-light-mode-backgrounds.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIRS = ["app", "components"];

const PATTERNS = [
  { re: /\bbg-\[#020202\]\b/g, rep: "dark:bg-[#020202] bg-white" },
  { re: /\bbg-\[#0a0a0a\]\b/gi, rep: "dark:bg-[#0a0a0a] bg-white" },
  { re: /\bbg-\[#0A0A0A\]\b/g, rep: "dark:bg-[#0A0A0A] bg-white" },
  { re: /\bbg-\[#05050a\]\b/gi, rep: "dark:bg-[#05050a] bg-gray-50" },
  { re: /\bbg-\[#090912\]\b/gi, rep: "dark:bg-[#090912] bg-white" },
  { re: /\bbg-\[#0a0a0f\]\b/gi, rep: "dark:bg-[#0a0a0f] bg-gray-50" },
  { re: /\bbg-black\b/g, rep: "dark:bg-black bg-white" },
  { re: /\bbg-gray-950\b/g, rep: "dark:bg-gray-950 bg-gray-50" },
  { re: /\bbg-gray-900\b/g, rep: "dark:bg-gray-900 bg-gray-50" },
  { re: /\bbg-slate-950\b/g, rep: "dark:bg-slate-950 bg-white" },
  { re: /\bbg-slate-900\b/g, rep: "dark:bg-slate-900 bg-gray-50" },
  { re: /\bbg-zinc-950\b/g, rep: "dark:bg-zinc-950 bg-white" },
  { re: /\bbg-zinc-900\b/g, rep: "dark:bg-zinc-900 bg-gray-50" },
  { re: /\bbg-neutral-950\b/g, rep: "dark:bg-neutral-950 bg-white" },
  { re: /\bbg-neutral-900\b/g, rep: "dark:bg-neutral-900 bg-gray-50" },
];

/** 이미 dark: 라이트 쌍이 있으면 스킵할 중복 방지 */
function hasLightPair(line, match) {
  const before = line.slice(0, match.index);
  if (/\bdark:bg-/.test(before) && /\bbg-(white|gray-50|gray-100)\b/.test(line)) return true;
  return false;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (["node_modules", ".next"].includes(ent.name)) continue;
      walk(p, out);
    } else if (/\.(tsx|ts|css)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function fixLine(line) {
  let next = line;
  for (const { re, rep } of PATTERNS) {
    re.lastIndex = 0;
    let m;
    const parts = [];
    let last = 0;
    while ((m = re.exec(next)) !== null) {
      const slice = next.slice(last, m.index);
      if (line.includes("dark:") && m[0].startsWith("dark:")) {
        parts.push(slice + m[0]);
      } else if (hasLightPair(next, m)) {
        parts.push(slice + m[0]);
      } else if (next.slice(Math.max(0, m.index - 5), m.index).includes("dark:")) {
        parts.push(slice + m[0]);
      } else {
        parts.push(slice + rep);
      }
      last = m.index + m[0].length;
    }
    if (last > 0) {
      parts.push(next.slice(last));
      next = parts.join("");
    }
  }
  // 중복 토큰 정리
  next = next
    .replace(/\bdark:bg-(\S+)\s+dark:bg-\1\b/g, "dark:bg-$1")
    .replace(/\bbg-white\s+bg-white\b/g, "bg-white")
    .replace(/\bbg-gray-50\s+bg-gray-50\b/g, "bg-gray-50");
  return next;
}

let changed = 0;
for (const dir of DIRS.map((d) => path.join(ROOT, d))) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const src = fs.readFileSync(file, "utf8");
    const lines = src.split("\n");
    let fileChanged = false;
    const out = lines.map((line) => {
      if (!/(bg-\[#|bg-black|bg-gray-9|bg-slate-9|bg-zinc-9|bg-neutral-9)/i.test(line)) return line;
      const fixed = fixLine(line);
      if (fixed !== line) fileChanged = true;
      return fixed;
    });
    if (fileChanged) {
      fs.writeFileSync(file, out.join("\n"));
      changed++;
      console.log(path.relative(ROOT, file));
    }
  }
}
console.log(`\nDone. ${changed} files updated.`);
