#!/usr/bin/env node
/**
 * Static checks: plan cart usage events param schema.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const fails = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const ga = read("lib/ga-events.ts");
for (const [re, label] of [
  [/CART_USAGE_EVENT_PLAN\s*=\s*"add_to_plan_cart"/, "plan event const"],
  [/trackPlanCartUsage/, "plan helper"],
  [/cart_kind:\s*"plan"/, "plan cart_kind"],
]) {
  if (!re.test(ga)) fails.push(label);
}
if (/trackLegacyCartUsage/.test(ga)) fails.push("legacy helper removed");
if (/CART_USAGE_EVENT_LEGACY/.test(ga)) fails.push("legacy event const removed");

const plan = read("lib/plan-cart.ts");
if (!/trackPlanCartUsage/.test(plan)) fails.push("plan-cart.ts tracks plan");
if (!/action:\s*"add"/.test(plan)) fails.push("plan cart tracks add");
if (!/action:\s*"remove"/.test(plan)) fails.push("plan cart tracks remove");

const migrate = read("lib/plan-cart-legacy-migrate.ts");
if (!/LEGACY_CART_KEY\s*=\s*"tkad-media-cart-v1"/.test(migrate)) {
  fails.push("legacy migrate keeps storage key constant");
}

for (const rel of ["lib/cart.ts", "components/media-detail-add-to-cart.tsx"]) {
  if (fs.existsSync(path.join(ROOT, rel))) fails.push(`${rel} should be deleted`);
}

const outDir = path.join(ROOT, "scripts/.verify-cart-usage-tracking");
fs.mkdirSync(outDir, { recursive: true });
const report = {
  ok: fails.length === 0,
  fails,
  events: {
    plan: "add_to_plan_cart",
    sharedParams: ["media_id", "source", "action", "media_name", "cart_kind"],
  },
  checkedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
console.log("OK cart usage tracking");
