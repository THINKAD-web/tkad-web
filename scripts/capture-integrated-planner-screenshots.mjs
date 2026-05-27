import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.SCREENSHOT_BASE ?? "http://127.0.0.1:3000/ko";
const OUT = path.join(process.cwd(), "tmp");

function wizardNext(page) {
  return page.locator("button.tkad-planner-wizard-btn-accent").last();
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function advanceToDigitalStep(page) {
  await page.goto(`${BASE}/planner/integrated`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  await page.getByRole("button", { name: /브랜드 인지도|Brand awareness/i }).first().click();
  await wizardNext(page).click();
  await page.waitForTimeout(800);

  await wizardNext(page).click();
  await page.waitForTimeout(800);

  await wizardNext(page).click();
  await page.waitForTimeout(800);

  const budgetInput = page.locator('input[inputmode="numeric"]').first();
  if (await budgetInput.count()) {
    await budgetInput.fill("5000");
  }
  await wizardNext(page).click();
  await page.waitForTimeout(1200);

  const addMedia = page.getByRole("button", { name: /담기|Add|선택/i }).first();
  if (await addMedia.count()) {
    await addMedia.click();
    await page.waitForTimeout(400);
  }
  await wizardNext(page).click();
  await page.waitForTimeout(1500);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(60000);

  console.log("Digital platforms step...");
  await advanceToDigitalStep(page);
  await page.screenshot({
    path: path.join(OUT, "integrated-digital-platforms.png"),
    fullPage: true,
  });

  console.log("Advancing to report...");
  await page.getByRole("button", { name: /네이버 GFA|Naver GFA/i }).click();
  await page.getByRole("button", { name: /카카오|Kakao/i }).click();
  await page.getByRole("button", { name: /당근|Karrot/i }).click();
  await wizardNext(page).click();
  await page.waitForTimeout(1200);
  await wizardNext(page).click();
  await page.waitForTimeout(2000);

  const reportSection = page.locator("#integrated-planner-report-content");
  if (await reportSection.count()) {
    await page.screenshot({
      path: path.join(OUT, "integrated-report-public.png"),
      fullPage: true,
    });

    const blind = page.locator("text=OOH × 디지털 시너지").first();
    if (await blind.count()) {
      await blind.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(OUT, "integrated-report-blind.png"),
        fullPage: false,
      });
    }
  } else {
    await page.screenshot({
      path: path.join(OUT, "integrated-report-public.png"),
      fullPage: true,
    });
  }

  await browser.close();
  console.log("Done →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
