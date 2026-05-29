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
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });

  page.setDefaultTimeout(90000);
  await page.goto(`${BASE}/quote/contract-ui-preview`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2000);

  const sections = page.locator("main > section");
  await sections.nth(0).screenshot({
    path: path.join(OUT, "quote-contract-cta-pending.png"),
  });
  await sections.nth(1).screenshot({
    path: path.join(OUT, "quote-contract-timeline-signed.png"),
  });

  await browser.close();
  console.log("Done →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
