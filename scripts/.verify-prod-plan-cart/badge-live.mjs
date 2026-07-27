import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "https://tkad.co.kr";
const OUT = path.dirname(new URL(import.meta.url).pathname);

async function dismissOverlays(page) {
  for (const label of ["스킵", "닫기", "다시 보지 않기", "Skip"]) {
    const btn = page.getByRole("button", { name: label }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function badgeText(page) {
  const cart = page.locator('a[data-tour="plan-cart"]');
  if ((await cart.count()) === 0) return { found: false, text: null };
  const text = await cart.locator("span.absolute").textContent().catch(() => null);
  return { found: true, text: text?.trim() || null };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  await page.goto(`${BASE}/ko/media`, { waitUntil: "commit", timeout: 120000 });
  await page.waitForSelector('a[data-tour="plan-cart"]', { timeout: 90000 });
  await page.waitForTimeout(3000);
  await dismissOverlays(page);

  const before = await badgeText(page);
  let added = 0;
  const buttons = page.getByRole("button", { name: /^담기$|^Add$|매체 담기|담은 매체에 담기/i });
  const count = await buttons.count();
  for (let i = 0; i < count && added < 2; i++) {
    const btn = buttons.nth(i);
    if (!(await btn.isVisible().catch(() => false))) continue;
    if ((await btn.getAttribute("aria-pressed")) === "true") continue;
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);
    added += 1;
  }

  const after = await badgeText(page);
  const ok =
    before.found &&
    after.found &&
    (after.text !== before.text || (added > 0 && after.text !== null));

  await page.locator('a[data-tour="plan-cart"]').screenshot({
    path: path.join(OUT, "prod-badge-after-add.png"),
  });
  await page
    .locator(".ml-auto.flex.shrink-0")
    .first()
    .screenshot({ path: path.join(OUT, "prod-header-icons.png") })
    .catch(async () => {
      await page.screenshot({ path: path.join(OUT, "prod-page-fallback.png") });
    });

  const report = {
    base: BASE,
    deployCheck: null,
    before,
    after,
    added,
    ok,
    checkedAt: new Date().toISOString(),
  };

  try {
    const html = await page.content();
    const dpl = html.match(/data-dpl-id="([^"]+)"/)?.[1] ?? null;
    report.deployCheck = dpl;
  } catch {
    /* ignore */
  }

  fs.writeFileSync(path.join(OUT, "badge-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
