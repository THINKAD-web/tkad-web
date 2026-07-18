#!/usr/bin/env node
/**
 * Admin palette residual scan — violet/cyan/purple/#a855f7/#22d3ee must be 0
 * under admin routes + admin components (style-only qp migration).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGETS = [
  "app/[locale]/admin",
  "components/admin",
];

function listAdminComponentFiles() {
  const dir = path.join(ROOT, "components");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.startsWith("admin") && /\.(tsx|ts)$/.test(name))
    .map((name) => path.join("components", name));
}

const FORBIDDEN =
  /violet-|cyan-|#a855f7|#22d3ee|purple-|from-violet|to-cyan|tkad-neon-grid|adminQuoteLinkVioletClass|tkad-landing-neon|tkad-planner-neon|34\s*,?\s*211\s*,?\s*238|168\s*,?\s*85\s*,?\s*247|124\s*,?\s*58\s*,?\s*237/i;

function walk(p, out = []) {
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) return out;
  const st = fs.statSync(abs);
  if (st.isFile()) {
    if (/\.(tsx|ts|css)$/.test(abs)) out.push(abs);
    return out;
  }
  for (const name of fs.readdirSync(abs)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    walk(path.relative(ROOT, path.join(abs, name)), out);
  }
  return out;
}

const files = [...new Set([
  ...TARGETS.flatMap((t) => walk(t)),
  ...listAdminComponentFiles().flatMap((t) => walk(t)),
])];
const hits = [];
for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (FORBIDDEN.test(line)) {
      hits.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 160)}`);
    }
  });
}

const outDir = path.join(ROOT, "scripts/.verify-design-admin-palette");
fs.mkdirSync(outDir, { recursive: true });
const report = {
  ok: hits.length === 0,
  filesScanned: files.length,
  residualCount: hits.length,
  hits: hits.slice(0, 50),
  checkedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));

if (!report.ok) {
  console.error("FAIL residual cyan/purple in admin:", hits.length);
  for (const h of hits.slice(0, 30)) console.error(" ", h);
  process.exit(1);
}
console.log(`OK admin palette residual 0 (${files.length} files)`);
