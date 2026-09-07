#!/usr/bin/env node
/**
 * PageHero before/after — hero clip on formal pages (planner, report, about).
 *
 * Temporarily swaps page-hero.tsx to git HEAD (before) vs working tree (after).
 *
 * Usage (dev server on :3099):
 *   BASE_URL=http://127.0.0.1:3099 node scripts/capture-page-hero-before-after.mjs
 */
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3099";
const ROOT = process.cwd();
const HERO_PATH = path.join(ROOT, "components/layout/page-hero.tsx");
const OUT = path.join(ROOT, ".compare-screenshots/page-hero");

const PAGES = [
  { key: "recommend", url: "/ko/recommend", wait: "매체 추천" },
  { key: "report", url: "/ko/report", wait: "트렌드 리포트" },
  { key: "about", url: "/ko/about", wait: null },
];

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function captureHeroSet(browser, label) {
  for (const { key, url, wait } of PAGES) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
    });
    page.setDefaultTimeout(120000);
    await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
    try {
      await page.waitForSelector("h1", { timeout: 90000 });
      if (wait) await page.waitForSelector(`text=${wait}`, { timeout: 30000 }).catch(() => {});
    } catch {
      console.warn(`${label}/${key}: h1 timeout — saving viewport anyway`);
    }
    await page.waitForTimeout(1500);

    const hero = page.locator(".ui-container.pt-6").first();
    const file = path.join(OUT, `${key}-hero-${label}.png`);
    if ((await hero.count()) > 0) {
      await hero.screenshot({ path: file });
    } else {
      await page.locator("h1").screenshot({ path: file });
    }
    console.log("saved", path.basename(file));
    await page.close();
  }
}

async function swapHero(content) {
  await writeFile(HERO_PATH, content, "utf8");
  // Allow webpack HMR to pick up the change
  await new Promise((r) => setTimeout(r, 2500));
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const afterContent = await readFile(HERO_PATH, "utf8");
  const beforeContent = execSync("git show HEAD:components/layout/page-hero.tsx", {
    cwd: ROOT,
    encoding: "utf8",
  });

  if (beforeContent.trim() === afterContent.trim()) {
    console.warn("page-hero.tsx unchanged vs HEAD — after shots may match before");
  }

  const browser = await launchBrowser();

  console.log("\n=== BEFORE (git HEAD) ===");
  await swapHero(beforeContent);
  await captureHeroSet(browser, "before");

  console.log("\n=== AFTER (working tree) ===");
  await swapHero(afterContent);
  await captureHeroSet(browser, "after");

  await browser.close();
  console.log("\nDone →", OUT);
}

main().catch(async (e) => {
  console.error(e);
  try {
    const afterContent = await readFile(HERO_PATH, "utf8");
    if (!afterContent.includes("tkad-type-label")) {
      const restored = execSync("git show HEAD:components/layout/page-hero.tsx", {
        cwd: ROOT,
        encoding: "utf8",
      });
      // Prefer restoring working tree from git if we had after content saved — best effort
    }
  } catch {
    /* ignore */
  }
  process.exit(1);
});
