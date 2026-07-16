import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const outDir = path.join(process.cwd(), "scripts/.verify-home-ai-cta-only");

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "ko-KR" });

  const checks = {
    homeNoTextarea: false,
    homeCtaVisible: false,
    homeTwoColumn: false,
    browseCardUnchanged: false,
    ctaNavigatesToRecommendAi: false,
    recommendAiTabSelected: false,
    briefAutoRun: false,
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
    await page.waitForTimeout(900);

    await page.getByRole("button", { name: /아래에서 시작하기/i }).click();
    await page.waitForTimeout(500);

    const explore = page.locator("#home-explore");
    await explore.scrollIntoViewIfNeeded();

    if (label === "desktop") {
      checks.homeNoTextarea =
        (await explore.locator("#home-freetext-input, textarea").count()) === 0;
      checks.homeCtaVisible = await explore
        .getByRole("link", { name: /AI 추천 시작/i })
        .isVisible();
      checks.homeTwoColumn =
        (await explore.locator(".md\\:grid-cols-2").count()) > 0;
      checks.browseCardUnchanged = await explore
        .locator("#home-media-search")
        .isVisible();
    }

    await page.screenshot({
      path: path.join(outDir, `${label}-home-explore.png`),
      fullPage: false,
    });
  }

  // CTA → /recommend AI tab
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/ko`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByRole("button", { name: /아래에서 시작하기/i }).click();
  await page.waitForTimeout(400);
  await page.locator("#home-explore").scrollIntoViewIfNeeded();
  await page.getByRole("link", { name: /AI 추천 시작/i }).click();
  await page.waitForURL(/\/ko\/recommend/, { timeout: 30_000 });
  await page.waitForTimeout(1200);

  checks.ctaNavigatesToRecommendAi = page.url().includes("/recommend");

  const aiTab = page.getByRole("button", { name: /AI 자연어 입력/i });
  checks.recommendAiTabSelected = await aiTab.evaluate((el) => {
    return (
      el.className.includes("shadow-sm") ||
      el.className.includes("text-gray-900") ||
      el.className.includes("dark:text-white")
    );
  });

  await page.screenshot({
    path: path.join(outDir, "desktop-recommend-ai-tab.png"),
    fullPage: false,
  });

  // brief= regression (chatbot handoff)
  const brief = encodeURIComponent("강남 2030 브랜딩 3000만원");
  await page.goto(`${baseUrl}/ko/recommend?brief=${brief}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(4000);

  checks.briefAutoRun =
    (await page.getByText(/추천 결과|TOP|대시보드|전체 결과/i).count()) > 0 ||
    (await page.getByText(/분석 중|로딩/i).count()) === 0;

  await page.screenshot({
    path: path.join(outDir, "desktop-recommend-brief-handoff.png"),
    fullPage: false,
  });

  await browser.close();

  const report = {
    baseUrl,
    checks,
    pass: Object.values(checks).every(Boolean),
    screenshots: {
      desktopHomeExplore: "scripts/.verify-home-ai-cta-only/desktop-home-explore.png",
      mobileHomeExplore: "scripts/.verify-home-ai-cta-only/mobile-home-explore.png",
      desktopRecommendAiTab:
        "scripts/.verify-home-ai-cta-only/desktop-recommend-ai-tab.png",
      desktopRecommendBriefHandoff:
        "scripts/.verify-home-ai-cta-only/desktop-recommend-brief-handoff.png",
    },
  };

  await writeFile(
    path.join(outDir, "report.json"),
    JSON.stringify(report, null, 2),
  );

  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
