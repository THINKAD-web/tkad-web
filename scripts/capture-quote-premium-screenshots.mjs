import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000/ko";
const OUT = path.join(process.cwd(), "tmp");

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1200, height: 2400 } });
  page.setDefaultTimeout(120000);

  await page.goto(`${BASE}/quote/premium-preview`, {
    waitUntil: "networkidle",
  });

  const page1 = page.locator('[data-quote-premium-page="1"]');
  const page2 = page.locator('[data-quote-premium-page="2"]');
  await page1.waitFor({ state: "visible", timeout: 60000 });
  await page2.waitFor({ state: "visible", timeout: 60000 });
  await page.waitForTimeout(1200);

  await page1.screenshot({ path: path.join(OUT, "quote-premium-page1-proposal.png") });
  await page2.screenshot({ path: path.join(OUT, "quote-premium-page2-official.png") });

  await browser.close();
  console.log("Done →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
