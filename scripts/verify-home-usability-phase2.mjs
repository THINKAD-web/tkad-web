import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const outDir = path.join(process.cwd(), "scripts/.verify-home-usability-phase2");

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "ko-KR" });

  const checks = {
    heroCta: false,
    exploreSection: false,
    searchBar: false,
    sidebarMuted: false,
  };

  for (const [label, viewport] of [
    ["desktop", { width: 1280, height: 900 }],
    ["mobile", devices["iPhone 13"].viewport],
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${baseUrl}/ko`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(800);

    if (label === "desktop") {
      checks.heroCta = await page
        .getByRole("button", { name: /아래에서 시작하기/i })
        .isVisible();
      checks.exploreSection = (await page.locator("#home-explore").count()) > 0;
      checks.searchBar = await page.locator("#home-media-search").isVisible();

      const sidebar = page.locator('[data-screenshot="quick-actions-desktop"]');
      if ((await sidebar.count()) > 0) {
        const neonCount = await sidebar.locator(".tkad-neon-cta-clean").count();
        checks.sidebarMuted = neonCount === 0;
      }
    }

    await page.screenshot({
      path: path.join(outDir, `${label}-above-fold.png`),
      fullPage: false,
    });

    if (label === "desktop") {
      await page.screenshot({
        path: path.join(outDir, `${label}-full.png`),
        fullPage: true,
      });
    }
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/ko`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByRole("button", { name: /아래에서 시작하기/i }).click();
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(outDir, "desktop-after-scroll.png"),
    fullPage: false,
  });

  const report = {
    baseUrl,
    checks,
    screenshots: {
      desktopAboveFold: "scripts/.verify-home-usability-phase2/desktop-above-fold.png",
      desktopFull: "scripts/.verify-home-usability-phase2/desktop-full.png",
      desktopAfterScroll: "scripts/.verify-home-usability-phase2/desktop-after-scroll.png",
      mobileAboveFold: "scripts/.verify-home-usability-phase2/mobile-above-fold.png",
    },
  };

  await writeFile(
    path.join(outDir, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
