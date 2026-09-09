#!/usr/bin/env node
/** Preview console check — planner + recommend, pattern-stats related errors */
import { chromium } from "playwright";

const BASE = (
  process.env.BASE ??
  "https://tkad-web-git-feat-admin-reports-hub-mannote-6701s-projects.vercel.app"
).replace(/\/$/, "");

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function checkPage(page, path, label) {
  const errors = [];
  const patternRelated = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    errors.push(t);
    if (/pattern|prisma|pg|dns|brief is not defined/i.test(t)) {
      patternRelated.push(t);
    }
  });
  page.on("pageerror", (err) => {
    const t = String(err);
    errors.push(t);
    if (/pattern|prisma|pg|dns|brief is not defined/i.test(t)) {
      patternRelated.push(t);
    }
  });

  const res = await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(4000);
  return {
    label,
    path,
    status: res?.status() ?? 0,
    errors,
    patternRelated,
  };
}

const browser = await launchBrowser();
const page = await browser.newPage({ locale: "ko-KR" });
const results = [
  await checkPage(page, "/ko/planner?new=1", "planner"),
  await checkPage(page, "/ko/recommend", "recommend"),
];
await browser.close();

console.log(`BASE=${BASE}\n`);
for (const r of results) {
  console.log(`[${r.label}] HTTP ${r.status}`);
  if (r.patternRelated.length) {
    console.log("  pattern/prisma related errors:");
    r.patternRelated.forEach((e) => console.log("   -", e.slice(0, 200)));
  } else if (r.errors.length) {
    console.log(`  other console errors: ${r.errors.length}`);
    r.errors.slice(0, 3).forEach((e) => console.log("   -", e.slice(0, 150)));
  } else {
    console.log("  no console errors (4s wait)");
  }
}

const bad = results.some(
  (r) => r.status >= 400 || r.patternRelated.length > 0,
);
process.exit(bad ? 1 : 0);
