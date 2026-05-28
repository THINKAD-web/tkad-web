import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const SAMPLE_PLAN = {
  items: [
    {
      mediaId: "sample-1",
      mediaName: "강남역 PMP 디지털 사이니지",
      mediaType: "digital",
      region: "강남",
      price: 30_000_000,
      addedFrom: "search",
      addedAt: new Date().toISOString(),
    },
    {
      mediaId: "sample-2",
      mediaName: "홍대 아트캔버스 광고",
      mediaType: "ooh",
      region: "홍대",
      price: 8_000_000,
      addedFrom: "ai_recommend",
      addedAt: new Date().toISOString(),
    },
    {
      mediaId: "sample-3",
      mediaName: "코엑스 DOOH",
      mediaType: "digital",
      region: "삼성",
      price: 10_000_000,
      addedFrom: "planner",
      addedAt: new Date().toISOString(),
    },
  ],
  campaignGoal: "brand_awareness",
  totalBudget: 48_000_000,
  duration: 2,
  updatedAt: new Date().toISOString(),
};

async function dismissOverlays(page) {
  for (const label of ["스킵", "닫기", "다시 보지 않기", "Skip"]) {
    const btn = page.getByRole("button", { name: label }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function seedPlanCart(page) {
  await page.addInitScript((cart) => {
    window.localStorage.setItem("tkad_plan_cart", JSON.stringify(cart));
  }, SAMPLE_PLAN);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.emulateMedia({ colorScheme: "dark" });
  await seedPlanCart(page);

  // 1) Media search card with plan button
  await page.goto(`${BASE}/ko/media`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(3000);
  await dismissOverlays(page);
  const planBtn = page.getByRole("button", { name: "플랜에 담기" }).first();
  if (await planBtn.isVisible().catch(() => false)) {
    await planBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: "plan-cart-media-card-button.png",
      fullPage: false,
    });
  }

  // 2) Floating plan button with badge
  await page.waitForTimeout(800);
  await page.screenshot({
    path: "plan-cart-floating-button.png",
    fullPage: false,
  });

  // 3) My plan page
  await page.goto(`${BASE}/ko/my/plan`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(2500);
  await dismissOverlays(page);
  await page.screenshot({ path: "plan-cart-my-plan-page.png", fullPage: true });

  // 4) Contact form plan summary
  await page.goto(`${BASE}/ko/contact?from=plan`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(2500);
  await dismissOverlays(page);
  await page.getByText("선택하신 플랜").waitFor({ timeout: 15000 }).catch(() => {});
  await page.screenshot({
    path: "plan-cart-contact-summary.png",
    fullPage: true,
  });

  await browser.close();
  console.log(
    "Saved: plan-cart-media-card-button.png, plan-cart-floating-button.png, plan-cart-my-plan-page.png, plan-cart-contact-summary.png",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
