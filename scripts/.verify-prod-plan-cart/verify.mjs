import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "https://thinkad.co.kr";
const OUT = path.dirname(new URL(import.meta.url).pathname);

async function dismissOverlays(page) {
  for (const label of ["스킵", "닫기", "다시 보지 않기", "Skip", "Accept"]) {
    const btn = page.getByRole("button", { name: label }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const report = { base: BASE, checks: {} };
  const browser = await chromium.launch();

  // Redirect check
  const redirectPage = await browser.newPage();
  const resp = await redirectPage.goto(`${BASE}/ko/cart`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  report.checks.cartRedirect = {
    finalUrl: redirectPage.url(),
    ok: /\/ko\/my\/plan/.test(redirectPage.url()),
    status: resp?.status(),
  };
  await redirectPage.close();

  // Desktop badge
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desktop.goto(`${BASE}/ko/media`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await desktop.waitForTimeout(4000);
  await dismissOverlays(desktop);

  const cartLink = desktop.locator('a[data-tour="plan-cart"]').first();
  report.checks.headerCartLink = await cartLink.count();
  const badgeBefore = await cartLink.locator("span.absolute").textContent().catch(() => null);

  const addButtons = desktop.getByRole("button", { name: /담/i });
  let added = 0;
  for (let i = 0; i < 8 && added < 2; i++) {
    const btn = addButtons.nth(i);
    if (!(await btn.isVisible().catch(() => false))) continue;
    if ((await btn.getAttribute("aria-pressed")) === "true") continue;
    await btn.click({ timeout: 5000 }).catch(() => {});
    await desktop.waitForTimeout(500);
    added += 1;
  }
  await desktop.waitForTimeout(800);
  const badgeAfter = await cartLink.locator("span.absolute").textContent().catch(() => null);
  report.checks.badge = { before: badgeBefore?.trim() ?? null, after: badgeAfter?.trim() ?? null, added };
  report.checks.badgeOk =
    report.checks.headerCartLink > 0 &&
    (badgeAfter !== badgeBefore || (added > 0 && badgeAfter));

  await desktop.locator("header.tkad-nav-chrome").screenshot({
    path: path.join(OUT, "prod-desktop-header.png"),
  });

  // Mobile menu
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.addInitScript(() => {
    window.localStorage.setItem(
      "tkad_plan_cart",
      JSON.stringify({
        items: [
          {
            mediaId: "prod-v1",
            mediaName: "Prod Verify",
            mediaType: "digital",
            region: "강남",
            price: 1000000,
            addedFrom: "search",
            addedAt: new Date().toISOString(),
          },
          {
            mediaId: "prod-v2",
            mediaName: "Prod Verify 2",
            mediaType: "ooh",
            region: "홍대",
            price: 2000000,
            addedFrom: "search",
            addedAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      }),
    );
  });
  await mobile.goto(`${BASE}/ko/media`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await mobile.waitForTimeout(3000);
  await dismissOverlays(mobile);
  await mobile.getByRole("button", { name: /메뉴 열기|Open menu/i }).click();
  await mobile.waitForTimeout(600);
  const menuText = await mobile.locator(".tkad-site-header-panel").innerText().catch(() => "");
  report.checks.mobileMenu = {
    hasPlanCartRow: /담은 매체/.test(menuText),
    pill: menuText.match(/\n2\n|\s2\s/) ? "2" : null,
  };
  await mobile.locator(".tkad-site-header-panel").screenshot({
    path: path.join(OUT, "prod-mobile-menu.png"),
  });

  await browser.close();
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
