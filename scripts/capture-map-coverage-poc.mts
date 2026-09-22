/**
 * Map coverage PoC — before/after screenshots (local dev).
 * BEFORE: default map (no narrow mobile filter)
 * AFTER: 부산 시내버스 (+ optional 광주)
 *
 * npx tsx scripts/capture-map-coverage-poc.mts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = path.join(
  process.cwd(),
  ".github/pr-screenshots/map-coverage-poc",
);

async function prepPage(page: import("playwright").Page) {
  await page.addInitScript(() => {
    (globalThis as unknown as { __name?: (f: unknown) => unknown }).__name = (
      f,
    ) => f;
    localStorage.setItem("tkad_map_three_step_tour_v1", "done");
    localStorage.setItem("tkad_map_onboarding_seen", "1");
    localStorage.setItem("tkad_map_sheet_hint_seen", "1");
  });
}

async function shot(
  page: import("playwright").Page,
  name: string,
  viewport: { width: number; height: number },
) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUT, name),
    fullPage: false,
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await prepPage(page);

  await page.goto(`${BASE}/ko/media/map`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(4000);

  await shot(page, "01-before-default-pc.png", { width: 1280, height: 800 });
  await shot(page, "02-before-default-375.png", { width: 375, height: 812 });

  const busanUrl = `${BASE}/ko/media/map?regionMain=busan&subCategory=bus_exterior&q=${encodeURIComponent("부산 시내버스")}`;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(busanUrl, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(6000);
  await page.waitForFunction(
    () =>
      document.querySelector('[data-screenshot="media-map-coverage-overlay-hint"]') !=
      null,
    { timeout: 90000 },
  );
  await page.waitForTimeout(2500);

  await shot(page, "03-after-busan-bus-pc.png", { width: 1280, height: 800 });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(400);
  const listToggle = page.locator(
    '[data-screenshot="media-map-sheet-view-toggle"] button[aria-pressed="true"]',
  );
  if ((await listToggle.textContent())?.includes("목록")) {
    await page.evaluate(() => {
      const btn = document.querySelector(
        'button[aria-label="지도 보기"]',
      ) as HTMLButtonElement | null;
      btn?.click();
    });
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUT, "04-after-busan-bus-375.png"),
    fullPage: false,
  });

  const meta = {
    base: BASE,
    busanUrl,
    gwangjuProdIds: [
      "cmqjbizs5000504if1dyoe7oj",
      "cmqj3tdx1000304l54haj7juo",
    ],
    capturedAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(OUT, "README.json"),
    JSON.stringify(meta, null, 2),
  );

  await browser.close();
  console.log(`map coverage poc screenshots → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
