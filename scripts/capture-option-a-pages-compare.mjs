#!/usr/bin/env node
/** Option A — home / media detail / recommend before (prod) vs after (local) */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";

const PROD = (process.env.PROD_BASE ?? "https://tkad.co.kr").replace(/\/$/, "");
const LOCAL = (process.env.LOCAL_BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const MEDIA_SLUG =
  process.env.MEDIA_SLUG ?? "sadangyeok-samjinbilding-jeongwangpan-gwanggo";

const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../reports/design-tone-audit-20260826/screenshots/option-a-pages",
);

const PAGES = [
  {
    id: "home",
    label: "홈 /ko",
    path: "/ko",
    wait: ".home-accent-option-a, .ooh-home-hero",
  },
  {
    id: "media-detail",
    label: `매체 상세 /ko/media/${MEDIA_SLUG}`,
    path: `/ko/media/${MEDIA_SLUG}`,
    wait: ".media-detail-accent-option-a, .tkad-media-page",
  },
  {
    id: "recommend",
    label: "AI 추천 /ko/recommend",
    path: "/ko/recommend",
    wait: ".recommend-accent-option-a, .tkad-ai-recommend-submit",
  },
];

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function dismissOverlays(page) {
  for (const label of ["스킵", "닫기", "다시 보지 않기", "Skip"]) {
    const btn = page.getByRole("button", { name: label }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function capture(page, base, pageDef, suffix) {
  const name = `${pageDef.id}-${suffix}.png`;
  await page.goto(`${base}${pageDef.path}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(6000);
  await dismissOverlays(page);
  await page.locator(pageDef.wait).first().waitFor({ timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  console.log("saved", name);
  return name;
}

function htmlReport(files) {
  const rows = PAGES.map(
    (p) => `
    <section class="page-block">
      <h2>${p.label}</h2>
      <div class="pair">
        <figure>
          <figcaption>Before<span>${files[p.id].before} · production</span></figcaption>
          <img src="${files[p.id].before}" alt="${p.label} before" />
        </figure>
        <figure>
          <figcaption>After (Option A)<span>${files[p.id].after} · design/orange-accent-option-a-media</span></figcaption>
          <img src="${files[p.id].after}" alt="${p.label} after" />
        </figure>
      </div>
    </section>`,
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Option A — 홈·매체상세·추천 Before/After (2026-08-29)</title>
  <style>
    :root { --bg: #f4f3f0; --ink: #08080a; --muted: #5a5a5e; --line: #d8d6d0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--ink); line-height: 1.5; }
    header { padding: 1.25rem 1.5rem; background: #fff; border-bottom: 1px solid var(--line); }
    header h1 { margin: 0 0 0.35rem; font-size: 1.125rem; }
    header p { margin: 0; font-size: 0.8125rem; color: var(--muted); max-width: 72rem; }
    main { padding: 1.25rem 1.5rem 2.5rem; max-width: 1400px; }
    .page-block { margin-bottom: 2rem; }
    .page-block h2 { font-size: 0.9375rem; margin: 0 0 0.75rem; }
    .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 900px) { .pair { grid-template-columns: 1fr; } }
    figure { margin: 0; background: #fff; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    figcaption { padding: 0.6rem 0.85rem; font-size: 0.8125rem; font-weight: 600; border-bottom: 1px solid var(--line); background: #faf9f7; }
    figcaption span { display: block; font-weight: 400; color: var(--muted); font-size: 0.6875rem; margin-top: 0.15rem; }
    figure img { display: block; width: 100%; height: auto; }
    .note { margin-top: 1rem; padding: 1rem; background: #fff; border: 1px dashed var(--line); border-radius: 6px; font-size: 0.8125rem; color: var(--muted); }
    .open-cmd { margin-top: 0.5rem; padding: 0.5rem 0.75rem; background: #f0efec; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 0.75rem; word-break: break-all; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; margin-top: 0.75rem; }
    th, td { border: 1px solid var(--line); padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
    th { background: #faf9f7; }
  </style>
</head>
<body>
  <header>
    <h1>Option A — 홈·매체상세·추천 확대 (2026-08-29)</h1>
    <p>
      <strong>Before</strong> = production <code>tkad.co.kr</code>.
      <strong>After</strong> = <code>design/orange-accent-option-a-media</code> (페이지당 KEEP 1개, 나머지 검정/회색).
      매체목록 비교는 <code>option-a-media/option-a-media-before-after.html</code> 참조.
    </p>
  </header>
  <main>
    ${rows}
    <div class="note">
      <strong>로컬에서 열기:</strong>
      <div class="open-cmd">open reports/design-tone-audit-20260826/screenshots/option-a-pages/option-a-pages-before-after.html</div>
      <table>
        <thead><tr><th>페이지</th><th>KEEP (1)</th><th>NEUTRAL / OUTLINE</th></tr></thead>
        <tbody>
          <tr><td>홈</td><td>Hero 「매체 둘러보기」</td><td>glow·dots·eyebrow·카드 아이콘/CTA·사이드바</td></tr>
          <tr><td>매체 상세</td><td>sticky 「견적 받기」</td><td>가격·DOOH·썸네일 ring·탭·관련 카드</td></tr>
          <tr><td>AI 추천</td><td>「추천 받기」/ 폼 submit</td><td>heading·배지·채널 선택·조건 분석</td></tr>
          <tr><td>매체 목록</td><td>사이드바 「새 플랜」</td><td>(기존 적용)</td></tr>
        </tbody>
      </table>
    </div>
  </main>
</body>
</html>`;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const files = {};

  for (const pageDef of PAGES) {
    files[pageDef.id] = {
      before: await capture(page, PROD, pageDef, "before-production"),
      after: await capture(page, LOCAL, pageDef, "after-option-a"),
    };
  }

  await browser.close();
  const htmlPath = path.join(OUT, "option-a-pages-before-after.html");
  await writeFile(htmlPath, htmlReport(files), "utf8");
  console.log("HTML →", htmlPath);
  console.log("Done →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
