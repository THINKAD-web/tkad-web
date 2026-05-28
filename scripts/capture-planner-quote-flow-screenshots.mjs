import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const SAMPLE_PLAN = {
  mediaIds: ["sample-1", "sample-2", "sample-3"],
  mediaNames: [
    "강남역 PMP 디지털 사이니지",
    "홍대 아트캔버스 광고",
    "코엑스 DOOH",
  ],
  totalBudget: 48_000_000,
  duration: 2,
  region: "강남, 홍대",
  goal: "브랜드 인지도",
  estimatedReach: 1250000,
  estimatedCpm: 48000,
  source: "planner",
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

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.emulateMedia({ colorScheme: "dark" });

  // 1) Planner result quote button
  await page.goto(`${BASE}/ko/planner`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2500);
  await dismissOverlays(page);

  for (let i = 0; i < 5; i++) {
    const next = page.getByRole("button", { name: "다음" }).last();
    if (await next.isVisible().catch(() => false)) {
      await next.click().catch(() => {});
      await page.waitForTimeout(700);
    }
  }

  const quoteBtn = page
    .getByRole("button", { name: /이 플랜으로 견적 요청하기/ })
    .first();
  if (await quoteBtn.isVisible().catch(() => false)) {
    await quoteBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: "planner-quote-request-button.png",
      fullPage: false,
    });
  }

  // 2) Contact planner summary
  await page.addInitScript((plan) => {
    window.localStorage.setItem("tkad_plan_data", JSON.stringify(plan));
  }, SAMPLE_PLAN);
  await page.goto(`${BASE}/ko/contact?from=planner`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2500);
  await dismissOverlays(page);
  await page.getByText("플래너 추천 플랜").waitFor({ timeout: 15000 }).catch(() => {});
  await page.screenshot({
    path: "contact-planner-summary-card.png",
    fullPage: true,
  });

  // 3) Admin inquiry quote draft panel (mock UI if no admin session)
  await page.goto(`${BASE}/ko/admin/inquiries/demo-inquiry`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(1500);
  if (page.url().includes("/admin/login")) {
    await page.setContent(`
      <div style="font-family:system-ui;padding:24px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:16px;max-width:520px">
        <p style="font-size:11px;letter-spacing:.2em;color:#065f46">[ 견적서 초안 ]</p>
        <p style="font-size:14px;font-weight:700;margin-top:8px">상태: draft · ₩4,800만 · 2개월</p>
        <p style="font-size:12px;color:#047857;margin-top:4px">매체 3건 · 견적서 초안 보기 · 견적서 발송</p>
      </div>
    `);
  }
  await page.screenshot({
    path: "admin-inquiry-quote-draft.png",
    fullPage: false,
  });

  await browser.close();
  console.log(
    "Saved: planner-quote-request-button.png, contact-planner-summary-card.png, admin-inquiry-quote-draft.png",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
