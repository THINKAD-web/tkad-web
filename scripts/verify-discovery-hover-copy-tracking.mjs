#!/usr/bin/env node
/**
 * Discovery hover: "인기 매체" copy + discovery_hover_popular_click GA event.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const PANEL = path.join(
  ROOT,
  "components/navigation/media-nav-hover-panel.tsx",
);
const src = fs.readFileSync(PANEL, "utf8");
const staticFails = [];
for (const [re, label] of [
  [/인기 매체/, "ko label"],
  [/"Popular"/, "en label"],
  [/discovery_hover_popular_click/, "GA event"],
  [/trackEvent/, "trackEvent"],
  [/sort=popular&limit=12/, "popular fetch"],
  [/\.slice\(0, 3\)/, "slice 3"],
]) {
  if (!re.test(src)) staticFails.push(label);
}
if (/추천 매체/.test(src)) staticFails.push("old 추천 매체 label");

const outDir = path.join(ROOT, "scripts/.verify-discovery-hover-copy-tracking");
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.BASE_URL || "http://127.0.0.1:3011";
let runtime = { skipped: true };

try {
  const browser = await chromium.launch({ headless: true });
  const page = await (
    await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "ko-KR",
    })
  ).newPage();
  await page.addInitScript(() => {
    window.__gaEvents = [];
  });
  await page.goto(`${BASE}/ko`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.gtag = function (...args) {
      window.__gaEvents = window.__gaEvents || [];
      window.__gaEvents.push(args);
    };
  });
  const trigger = page.locator("nav button", { hasText: "발견하기" }).first();
  const box = await trigger.boundingBox();
  await trigger.hover();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height + 40);
  }
  await page.waitForFunction(() => {
    const els = [...document.querySelectorAll("p")].filter(
      (p) => p.textContent?.trim() === "인기 매체",
    );
    const root = els[0]?.parentElement;
    return root ? root.querySelectorAll("a[href*='/media/']").length > 0 : false;
  }, null, { timeout: 25000 });
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (e) => {
        const a = e.target?.closest?.("a");
        if (a?.getAttribute("href")?.includes("/media/")) e.preventDefault();
      },
      true,
    );
  });
  const links = page
    .locator("p", { hasText: /^인기 매체$/ })
    .locator("xpath=..")
    .locator("a[href*='/media/']");
  const popularLinkCount = await links.count();
  await links.first().click();
  await page.waitForTimeout(200);
  const ga = await page.evaluate(() => window.__gaEvents || []);
  const hit = ga.find(
    (a) => a[0] === "event" && a[1] === "discovery_hover_popular_click",
  );
  runtime = {
    skipped: false,
    labelVisible: await page.getByText("인기 매체", { exact: true }).count(),
    oldLabel: await page.getByText("추천 매체", { exact: true }).count(),
    popularLinkCount,
    gaHit: Boolean(hit),
    gaParams: hit?.[2] ?? null,
  };
  await page.screenshot({ path: path.join(outDir, "hover-panel.png") });
  await browser.close();
} catch (e) {
  runtime = { skipped: true, error: String(e?.message || e) };
}

const report = {
  ok:
    staticFails.length === 0 &&
    !runtime.skipped &&
    runtime.labelVisible > 0 &&
    runtime.oldLabel === 0 &&
    runtime.popularLinkCount >= 1 &&
    runtime.gaHit,
  staticFails,
  runtime,
  checkedAt: new Date().toISOString(),
};
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
console.log("OK discovery hover copy + tracking");
