#!/usr/bin/env node
/**
 * 공개 페이지 타이포·간격 일괄 정리 (안전한 문자열 치환만).
 * node scripts/unify-ui-typography.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIRS = ["app", "components"];

const REPLACEMENTS = [
  // 섹션 패딩 (과도한 py 축소)
  [/py-12\s+sm:py-16\s+md:py-24\s+lg:py-32/g, "ui-section-y"],
  [/py-20\s+md:py-28/g, "ui-section-y"],
  [/py-24\s+md:py-32/g, "ui-section-y"],
  // 컨테이너
  [/mx-auto\s+max-w-7xl\s+px-4\s+sm:px-6\s+lg:px-8/g, "ui-container"],
  [/mx-auto\s+max-w-7xl\s+px-4\s+md:px-6\s+lg:px-8/g, "ui-container"],
  // 히어로 h1 (클램프·임의 크기 → 토큰)
  [
    /text-\[clamp\([^)]+\)\]\s+font-black\s+leading-\[[^\]]+\]\s+tracking-\[[^\]]+\]/g,
    "ui-section-headline",
  ],
  // 카드 rounded-lg → rounded-2xl (카드만; 버튼은 제외)
  [
    /(<(?:div|article|section)[^>]*className="[^"]*)\brounded-lg\b/g,
    "$1rounded-2xl",
  ],
];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(p, out);
    } else if (ent.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

let changed = 0;
for (const dir of DIRS.map((d) => path.join(ROOT, d))) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    let src = fs.readFileSync(file, "utf8");
    let next = src;
    for (const [re, rep] of REPLACEMENTS) {
      next = next.replace(re, rep);
    }
    if (next !== src) {
      fs.writeFileSync(file, next);
      changed++;
      console.log("updated:", path.relative(ROOT, file));
    }
  }
}
console.log(`Done. ${changed} files updated.`);
