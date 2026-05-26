#!/usr/bin/env node
/**
 * Capture media package list + detail pages (dev server on :3000).
 * Usage: node scripts/capture-packages-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000";
const OUT = path.join(process.cwd(), "screenshots", "packages");

const PAGES = [
  {
    name: "packages-list",
    url: "/ko/media/packages",
    viewport: { width: 1280, height: 900 },
  },
  {
    name: "gangnam-premium",
    url: "/ko/media/packages/gangnam-premium",
    viewport: { width: 1280, height: 1400 },
  },
  {
    name: "fandom-hotspot",
    url: "/ko/media/packages/fandom-hotspot",
    viewport: { width: 1280, height: 1400 },
  },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "ko-KR" });

  for (const pageSpec of PAGES) {
    const page = await context.newPage();
    await page.setViewportSize(pageSpec.viewport);
    const url = `${BASE}${pageSpec.url}`;
    console.log(`→ ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(pageSpec.name === "packages-list" ? 1500 : 3500);
    const outPath = path.join(OUT, `${pageSpec.name}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`  saved ${outPath}`);
    await page.close();
  }

  await browser.close();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
