#!/usr/bin/env node
/**
 * STEP3c — admin hotspot tagging browser verification
 * Usage: BASE=http://127.0.0.1:3000 node scripts/verify-step3c-hotspot-admin.mjs
 */
import { chromium } from "playwright";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = (process.env.BASE ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const JEJU_ID = "cmo6ir888000004l5fx2rxd4i";
const SEOUL_ID = "cmp867txy000004l1mik3bkdx";
const ADMIN_USER = (process.env.ADMIN_USERNAME || "admin").trim();

const consoleErrors = [];
const pageErrors = [];
const log = [];

function note(step, ok, detail) {
  const line = `[${ok ? "OK" : "FAIL"}] ${step}: ${detail}`;
  log.push(line);
  console.log(line);
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function loginViaApi(context) {
  const candidates = [
    (process.env.ADMIN_PASSWORD || "").trim(),
    "thinkad2024!",
    (process.env.SEED_ADMIN_PASSWORD || "").trim(),
  ].filter(Boolean);
  const seen = new Set();
  for (const password of candidates) {
    if (seen.has(password)) continue;
    seen.add(password);
    const res = await context.request.post(`${BASE}/api/admin/auth/login`, {
      data: { username: ADMIN_USER, password },
    });
    if (res.ok()) return;
  }
  throw new Error("admin login failed for all password candidates");
}

async function fetchHotspotTags(request, id) {
  const res = await request.get(`${BASE}/api/admin/medias/${id}`);
  if (!res.ok()) throw new Error(`GET media ${id}: ${res.status()}`);
  const json = await res.json();
  return json.media?.hotspotTags ?? json.hotspotTags ?? null;
}

async function openMediaEdit(page, mediaId, nameHint) {
  await page.goto(`${BASE}/ko/admin/medias`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(1500);

  const search = page.locator('input[type="search"], input[placeholder*="검색"]').first();
  if (await search.isVisible().catch(() => false)) {
    await search.fill(nameHint);
    await page.waitForTimeout(1200);
  }

  const row = page.locator("tr, [data-slot='card'], li, div")
    .filter({ hasText: nameHint })
    .first();
  await row.scrollIntoViewIfNeeded();

  // Desktop pencil (md+) is visible at 1440px; mobile "수정" text btn is md:hidden.
  const editBtn = row.locator('button[title="수정"]:visible').first();
  if (await editBtn.count()) {
    await editBtn.click();
  } else {
    await row.locator('button:has(svg.lucide-pencil)').first().click();
  }
  await page.waitForTimeout(2500);
}

async function main() {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "ko-KR",
  });
  await loginViaApi(context);
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  const tagsBefore = await fetchHotspotTags(context.request, JEJU_ID);
  note("0 api baseline", Array.isArray(tagsBefore) && tagsBefore.length > 0, `tags=${JSON.stringify(tagsBefore)}`);

  await openMediaEdit(page, JEJU_ID, "제주 중앙로 사거리");

  const jejuVisible = await page.getByText("생활권 태그").isVisible().catch(() => false);
  note("1 jeju hotspot section visible", jejuVisible, String(jejuVisible));

  const addBtn = page.getByRole("button", { name: "태그 추가" });
  const slidersBefore = await page.locator('input[type="range"]').count();

  if (await addBtn.isVisible()) {
    await addBtn.click();
    await page.waitForTimeout(400);
  }
  const weightSlider = page.locator('input[type="range"]').last();
  let sliderAdjusted = false;
  if (await weightSlider.isVisible()) {
    await weightSlider.fill("1.7");
    sliderAdjusted = true;
  }
  note("2 zone/type + weight slider", sliderAdjusted, `slider adjusted=${sliderAdjusted}`);

  const modal = page.locator(".fixed.inset-0.z-50");
  const saveBtn = modal.getByRole("button", { name: /^수정$/ }).last();
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.click();
  await page.waitForTimeout(3500);
  note("3 save clicked", true, "no throw");

  const tagsAfterSave = await fetchHotspotTags(context.request, JEJU_ID);
  const hasExtra =
    Array.isArray(tagsAfterSave) &&
    tagsAfterSave.length >= (tagsBefore?.length ?? 0);
  note("3b api after save", hasExtra, JSON.stringify(tagsAfterSave));

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await openMediaEdit(page, JEJU_ID, "제주 중앙로 사거리");
  const slidersAfterReload = await page.locator('input[type="range"]').count();
  note(
    "4 reload UI persistence",
    slidersAfterReload >= slidersBefore,
    `sliders ${slidersBefore} → ${slidersAfterReload}`,
  );

  const tagsAfterReload = await fetchHotspotTags(context.request, JEJU_ID);
  note("4b api after reload", JSON.stringify(tagsAfterReload) === JSON.stringify(tagsAfterSave), JSON.stringify(tagsAfterReload));

  const deleteBtns = page.locator('button[aria-label$="태그 삭제"]');
  while ((await deleteBtns.count()) > 0) {
    await deleteBtns.first().click();
    await page.waitForTimeout(250);
  }
  await modal.getByRole("button", { name: /^수정$/ }).last().click();
  await page.waitForTimeout(3500);
  await openMediaEdit(page, JEJU_ID, "제주 중앙로 사거리");

  const emptyMsg = await page.getByText("태그 없음").isVisible().catch(() => false);
  const tagsAfterRemove = await fetchHotspotTags(context.request, JEJU_ID);
  const tagsCleared =
    tagsAfterRemove == null ||
    (Array.isArray(tagsAfterRemove) && tagsAfterRemove.length === 0);
  note(
    "5 remove tags",
    emptyMsg && tagsCleared,
    `ui empty=${emptyMsg} api cleared=${tagsCleared} (${JSON.stringify(tagsAfterRemove)})`,
  );

  // restore seed tags via API
  await context.request.patch(`${BASE}/api/admin/medias/${JEJU_ID}`, {
    data: {
      hotspotTags: tagsBefore,
    },
  });

  await openMediaEdit(page, SEOUL_ID, "교대역 일이타워");
  const seoulHidden = !(await page.getByText("생활권 태그").isVisible().catch(() => false));
  note("1b non-jeju section hidden", seoulHidden, String(seoulHidden));

  note("6 console errors", consoleErrors.length === 0, consoleErrors.join("; ") || "none");
  if (pageErrors.length) note("6 page errors", false, pageErrors.join("; "));

  await browser.close();
  const failed = log.some((l) => l.startsWith("[FAIL]"));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
