#!/usr/bin/env node
/**
 * Static checks: legacy cart + plan cart usage events share a param schema.
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
  [/CART_USAGE_EVENT_LEGACY\s*=\s*"add_to_cart_legacy"/, "legacy event const"],
  [/CART_USAGE_EVENT_PLAN\s*=\s*"add_to_plan_cart"/, "plan event const"],
  [/trackLegacyCartUsage/, "legacy helper"],
  [/trackPlanCartUsage/, "plan helper"],
  [/cart_kind:\s*"legacy"/, "legacy cart_kind"],
  [/cart_kind:\s*"plan"/, "plan cart_kind"],
]) {
  if (!re.test(ga)) fails.push(label);
}

const cart = read("lib/cart.ts");
if (!/trackLegacyCartUsage/.test(cart)) fails.push("cart.ts tracks legacy");
if (!/toggle\(id: string, source/.test(cart) && !/toggle = useCallback\(\(id: string, source/.test(cart)) {
  fails.push("cart toggle accepts source");
}

const plan = read("lib/plan-cart.ts");
if (!/trackPlanCartUsage/.test(plan)) fails.push("plan-cart.ts tracks plan");
if (!/action:\s*"add"/.test(plan)) fails.push("plan cart tracks add");
if (!/action:\s*"remove"/.test(plan)) fails.push("plan cart tracks remove");

const detail = read("components/media-detail-add-to-cart.tsx");
if (!/toggle\(mediaId,\s*"media_detail"\)/.test(detail)) {
  fails.push("media detail passes media_detail source");
}

const landing = read("components/media-keyword-landing-catalog.tsx");
if (!/toggleCartId\(item\.id,\s*"keyword_landing"\)/.test(landing)) {
  fails.push("keyword landing passes source");
}

const outDir = path.join(ROOT, "scripts/.verify-cart-usage-tracking");
fs.mkdirSync(outDir, { recursive: true });
const report = {
  ok: fails.length === 0,
  fails,
  events: {
    legacy: "add_to_cart_legacy",
    plan: "add_to_plan_cart",
    sharedParams: ["media_id", "source", "action", "media_name", "cart_kind"],
  },
  checkedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
console.log("OK cart usage tracking");
