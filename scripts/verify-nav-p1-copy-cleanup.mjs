#!/usr/bin/env node
/**
 * Nav P1 — copy/order checks (no browser; source + i18n SSOT).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const ko = JSON.parse(read("messages/ko.json"));
const en = JSON.parse(read("messages/en.json"));
const navData = read("lib/navigation/public-nav-data.ts");
const desktop = read("components/navigation/desktop-global-nav.tsx");
const mobile = read("components/navigation/public-nav-sidebar.tsx");

const fail = [];

const koTargets = ko.nav.items["campaign-targets"].desc;
const koPkg = ko.nav.items["package-proposal"].desc;
const koAi = ko.nav.items["ai-recommend"].desc;
const enTargets = en.nav.items["campaign-targets"].desc;
const enAi = en.nav.items["ai-recommend"].desc;

if (!/목적별 탐색 랜딩/.test(koTargets)) {
  fail.push(`campaign-targets KO desc missing landing copy: ${koTargets}`);
}
if (!/사전 조합|패키지/.test(koPkg)) {
  fail.push(`package-proposal KO desc unclear: ${koPkg}`);
}
if (koTargets === koPkg || koTargets.includes("패키지 제안")) {
  fail.push("campaign-targets and package-proposal still collide");
}
if (!/1분/.test(koAi) || !/플래너/.test(koAi)) {
  fail.push(`ai-recommend KO missing differential copy: ${koAi}`);
}
if (!/1-min|instant/i.test(enAi) || !/Planner/i.test(enAi)) {
  fail.push(`ai-recommend EN missing differential copy: ${enAi}`);
}
if (!/Goal-based browse|purpose/i.test(enTargets)) {
  fail.push(`campaign-targets EN desc weak: ${enTargets}`);
}

// Academy after guides in PUBLIC_NAV_GROUPS insights block
const insightsMatch = navData.match(
  /id:\s*"insights"[\s\S]*?items:\s*\[([\s\S]*?)\]/,
);
if (!insightsMatch) {
  fail.push("insights group not found in public-nav-data");
} else {
  const ids = [...insightsMatch[1].matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
  const expected = [
    "trend-report",
    "success-cases",
    "advertiser-guide",
    "academy-content",
  ];
  if (JSON.stringify(ids) !== JSON.stringify(expected)) {
    fail.push(`insights order ${JSON.stringify(ids)} !== ${JSON.stringify(expected)}`);
  }
}

if (/item\.id !== "ai-recommend"/.test(desktop)) {
  fail.push("desktop still hides ai-recommend description");
}
if (!/item\.desc\s*\?/.test(desktop)) {
  fail.push("desktop desc render missing");
}
if (!/MOBILE_DESC_ITEM_IDS[\s\S]{0,400}?"ai-recommend"/.test(mobile)) {
  fail.push("mobile MOBILE_DESC_ITEM_IDS missing ai-recommend");
}

const out = {
  ko: { campaignTargets: koTargets, package: koPkg, ai: koAi },
  en: { campaignTargets: enTargets, ai: enAi },
  fail,
};
const dir = path.join(root, "scripts/.verify-nav-p1-copy-cleanup");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "report.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
if (fail.length) {
  console.error("FAIL");
  process.exit(1);
}
console.log("PASS");
