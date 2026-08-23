#!/usr/bin/env npx tsx
/**
 * pricing_mode DB 스냅샷 — migrate deploy 전후 기록용.
 *
 * Usage:
 *   MIGRATION_DRY_RUN_ENV=production npx tsx scripts/check-pricing-mode-db-state.mts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { execSync } from "node:child_process";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.preview.local"), override: true });
const env = process.env.MIGRATION_DRY_RUN_ENV ?? "preview";
if (env === "production") {
  config({ path: resolve(root, ".env.production.local"), override: true });
}

execSync("npx tsx scripts/dry-run-pricing-mode-migration.mts", {
  stdio: "inherit",
  env: { ...process.env, MIGRATION_DRY_RUN_ENV: env },
});

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const src = resolve(root, "scripts/.dry-run-pricing-mode/report.json");
const dest = resolve(
  root,
  `reports/pricing-mode-db-snapshot-${env}-${stamp}.json`,
);
mkdirSync(resolve(root, "reports"), { recursive: true });
writeFileSync(dest, readFileSync(src, "utf8"));
console.log("saved:", dest);
