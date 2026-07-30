import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE =
  process.env.BASE_URL ??
  "https://tkad-web-git-feat-header-plan-cart-badge-mannote-6701s-projects.vercel.app";
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

async function getHeaderCartBadge(page) {
  const link = page.locator('a[data-tour="plan-cart"]').first();
  if (!(await link.count())) return { found: false, count: null };
  const badge = link.locator("span.absolute");
  const text = (await badge.textContent().catch(() => null))?.trim() ?? null;
  return { found: true, count: text };
}

async function addMediaFromBrowse(page, n = 2) {
  const addButtons = page.getByRole("button", { name: /담/i });
  const total = await addButtons.count();
  let added = 0;
  for (let i = 0; i < Math.min(total, n + 5) && added < n; i++) {
    const btn = addButtons.nth(i);
    if (!(await btn.isVisible().catch(() => false))) continue;
    const pressed = await btn.getAttribute("aria-pressed");
    if (pressed === "true") continue;
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    added += 1;
  }
  return added;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const report = {
    base: BASE,
    desktop: {},
    mobile: {},
    layout: {},
    screenshots: [],
  };

  const browser = await chromium.launch();

  // --- Desktop ---
  const desktop = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  await desktop.goto(`${BASE}/ko/media`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await desktop.waitForTimeout(3500);
  await dismissOverlays(desktop);

  const before = await getHeaderCartBadge(desktop);
  report.desktop.badgeBefore = before;

  const added = await addMediaFromBrowse(desktop, 2);
  report.desktop.itemsAdded = added;
  await desktop.waitForTimeout(800);

  const after = await getHeaderCartBadge(desktop);
  report.desktop.badgeAfter = after;
  report.desktop.badgeIncreased =
    before.count !== after.count ||
    (parseInt(after.count ?? "0", 10) >= added && added > 0);

  const header = desktop.locator("header.tkad-nav-chrome").first();
  await header.screenshot({
    path: path.join(OUT, "desktop-header-after-add.png"),
  });
  report.screenshots.push("desktop-header-after-add.png");

  // Layout: cart link near notifications
  const chrome = desktop.locator(".ml-auto.flex.shrink-0").first();
  const box = await chrome.boundingBox().catch(() => null);
  report.layout.chromeBox = box;
  const cartLink = desktop.locator('a[data-tour="plan-cart"]').first();
  const notif = desktop.locator('[data-tour="notifications"], button[aria-label*="알림"]').first();
  report.layout.cartVisible = await cartLink.isVisible().catch(() => false);
  report.layout.cartBox = await cartLink.boundingBox().catch(() => null);
  report.layout.notifBox = await notif.boundingBox().catch(() => null);
  if (report.layout.cartBox && report.layout.notifBox) {
    const c = report.layout.cartBox;
    const n = report.layout.notifBox;
    report.layout.overlap =
      c.x < n.x + n.width &&
      c.x + c.width > n.x &&
      c.y < n.y + n.height &&
      c.y + c.height > n.y;
    report.layout.gapPx = Math.min(
      Math.abs(c.x - (n.x + n.width)),
      Math.abs(n.x - (c.x + c.width)),
    );
  }

  await desktop.close();

  // --- Mobile ---
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await mobile.addInitScript(() => {
    const cart = {
      items: [
        {
          mediaId: "verify-1",
          mediaName: "검증 매체 A",
          mediaType: "digital",
          region: "강남",
          price: 1_000_000,
          addedFrom: "search",
          addedAt: new Date().toISOString(),
        },
        {
          mediaId: "verify-2",
          mediaName: "검증 매체 B",
          mediaType: "ooh",
          region: "홍대",
          price: 2_000_000,
          addedFrom: "search",
          addedAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem("tkad_plan_cart", JSON.stringify(cart));
  });

  await mobile.goto(`${BASE}/ko/media`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await mobile.waitForTimeout(3000);
  await dismissOverlays(mobile);

  const menuBtn = mobile.getByRole("button", {
    name: /메뉴 열기|Open menu/i,
  });
  await menuBtn.click();
  await mobile.waitForTimeout(600);

  const planRow = mobile.getByRole("link", { name: /담은 매체/i });
  report.mobile.planRowVisible = await planRow.isVisible().catch(() => false);
  const pill = planRow.locator("span.rounded-full").last();
  report.mobile.pillText = (await pill.textContent().catch(() => null))?.trim();
  report.mobile.pillVisible = await pill.isVisible().catch(() => false);

  await mobile.locator(".tkad-site-header-panel").screenshot({
    path: path.join(OUT, "mobile-menu-plan-cart-row.png"),
  });
  report.screenshots.push("mobile-menu-plan-cart-row.png");

  await browser.close();

  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
