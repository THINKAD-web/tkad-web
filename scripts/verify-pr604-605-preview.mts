#!/usr/bin/env node
/**
 * PR #604 / #605 Preview 실검증 (Playwright + API).
 * Usage:
 *   set -a && source /tmp/tkad-preview.env && set +a
 *   npx tsx scripts/verify-pr604-605-preview.mts
 */
import { config } from "dotenv";
import { chromium, type BrowserContext, type Page } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });
config({ path: "/tmp/tkad-preview.env", override: true });

const BASE604 =
  process.env.PREVIEW_604?.replace(/\/$/, "") ??
  "https://tkad-web-git-fix-plan-cart-report-09f55b-mannote-6701s-projects.vercel.app";
const BASE605 =
  process.env.PREVIEW_605?.replace(/\/$/, "") ??
  "https://tkad-web-git-feat-my-plan-campaigns-list-mannote-6701s-projects.vercel.app";

const OUT = join(process.cwd(), "reports/preview-pr604-605-verify");
mkdirSync(OUT, { recursive: true });

const vercelHeaders: Record<string, string> = {};
if (process.env.VERCEL_OIDC_TOKEN?.trim()) {
  vercelHeaders["x-vercel-trusted-oidc-idp-token"] =
    process.env.VERCEL_OIDC_TOKEN.trim();
}

const logLines: string[] = [];
function note(section: string, line: string) {
  const row = `[${section}] ${line}`;
  logLines.push(row);
  console.log(row);
}

const consoleErrors604: string[] = [];
const consoleErrors605: string[] = [];

function attachConsole(page: Page, bucket: string[]) {
  page.on("console", (msg) => {
    if (msg.type() === "error") bucket.push(msg.text());
  });
  page.on("pageerror", (err) => bucket.push(String(err)));
}

async function fetchJson(
  base: string,
  path: string,
  init: RequestInit = {},
): Promise<{ res: Response; json: unknown }> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...vercelHeaders,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

function cookieFromResponse(res: Response): string {
  const set =
    res.headers.getSetCookie?.() ??
    (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")!] : []);
  const hit = set.find((c) => c.startsWith("tkad_user_session="));
  return hit ? hit.split(";")[0]! : "";
}

async function registerUser(base: string, tag: string) {
  const email = `pr605-${tag}-${Date.now()}@tkad-e2e.invalid`;
  const password = `E2e_${Date.now()}_Aa1`;
  const { res, json } = await fetchJson(base, "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      name: `E2E ${tag}`,
      locale: "ko",
      startRole: "ADVERTISER",
    }),
  });
  const cookie = cookieFromResponse(res);
  if (!res.ok || !cookie) {
    throw new Error(`register ${tag} failed ${res.status} ${JSON.stringify(json)}`);
  }
  return { email, password, cookie, userId: (json as { data?: { id?: string } })?.data?.id };
}

async function loginUser(base: string, email: string, password: string) {
  const { res, json } = await fetchJson(base, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookie = cookieFromResponse(res);
  if (!res.ok || !cookie) {
    throw new Error(`login failed ${res.status} ${JSON.stringify(json)}`);
  }
  return cookie;
}

async function getCatalogMediaId(base: string): Promise<string> {
  const { res, json } = await fetchJson(base, "/api/public/media-catalog");
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  const items = Array.isArray(json)
    ? (json as { id: string; price?: number }[])
    : ((json as { data?: { items?: { id: string; price?: number }[] } })?.data
        ?.items ??
      (json as { data?: { id: string; price?: number }[] })?.data ??
      []);
  const picked = items.find((m) => (m.price ?? 0) > 0) ?? items[0];
  if (!picked?.id) throw new Error("no media in catalog");
  return picked.id;
}

async function saveCampaignPlan(base: string, cookie: string, mediaId: string, label: string) {
  const body = {
    brief: {
      budgetInputWon: 30_000_000,
      budgetMode: "total",
      regionCodes: ["11"],
      genders: ["male", "female"],
      ageBands: ["20s", "30s"],
      goal: "brand",
      flightStart: "2026-10-01",
      flightEnd: "2026-10-31",
      freeText: label,
    },
    mixUnits: { [mediaId]: 1 },
    mixPriceOptionIndex: {},
    customLines: [],
    reportCopy: {
      documentTitle: label,
      clientName: "",
      greeting: "",
      executiveSummary: "",
      greetingTouched: false,
      executiveSummaryTouched: false,
    },
  };
  const { res, json } = await fetchJson(base, "/api/campaign-plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`save plan failed ${res.status} ${JSON.stringify(json)}`);
  return json as { id: string };
}

async function listCampaignPlans(base: string, cookie: string) {
  const { res, json } = await fetchJson(base, "/api/my/plan/campaigns?locale=ko", {
    headers: { Cookie: cookie },
  });
  if (!res.ok) throw new Error(`list failed ${res.status}`);
  const items =
    (json as { data?: { items?: { id: string; title: string }[] } })?.data?.items ?? [];
  return items;
}

async function seedPlanCart(page: Page, mediaId: string, mediaName: string) {
  await page.goto("/ko/media", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ mediaId, mediaName }) => {
      const item = {
        mediaId,
        mediaName,
        mediaType: "dooh",
        region: "서울",
        price: 1_000_000,
        quantity: 1,
        addedFrom: "search",
        addedAt: new Date().toISOString(),
      };
      const cart = { items: [item], updatedAt: new Date().toISOString() };
      localStorage.setItem("tkad_plan_cart", JSON.stringify(cart));
    },
    { mediaId, mediaName: mediaName || "E2E media" },
  );
}

async function run604(context: BrowserContext, mediaId: string) {
  const page = await context.newPage();
  attachConsole(page, consoleErrors604);
  page.setDefaultTimeout(90_000);

  const user604 = await registerUser(BASE604, "604");
  await context.addCookies([
    {
      name: "tkad_user_session",
      value: user604.cookie.split("=")[1]!,
      domain: new URL(BASE604).hostname,
      path: "/",
    },
  ]);

  await seedPlanCart(page, mediaId, "PR604 media");
  await page.goto("/ko/my/plan/report", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  if (page.url().includes("/login")) {
    note("604", `FAIL — redirected to login (${page.url()})`);
    await page.close();
    return false;
  }

  const greeting = page.locator('[data-testid="report-greeting-edit"] textarea');
  const exec = page.locator('[data-testid="report-executive-edit"] textarea');
  const hasGreeting = (await greeting.count()) > 0;
  const hasExec = (await exec.count()) > 0;
  note("604", `report edit fields — greeting=${hasGreeting} executive=${hasExec}`);
  if (!hasGreeting || !hasExec) {
    note("604", "FAIL — could not find greeting/executive textareas on report page");
    await page.screenshot({ path: join(OUT, "604-report-no-editors.png"), fullPage: true });
    await page.close();
    return false;
  }

  const markerG = `PR604-G-${Date.now()}`;
  const markerE = `PR604-E-${Date.now()}`;
  if (hasGreeting) await greeting.fill(markerG);
  if (hasExec) await exec.fill(markerE);
  await page.waitForTimeout(1500);

  // cart change → auto-draft deps
  await page.goto("/ko/my/plan", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const raw = localStorage.getItem("tkad_plan_cart");
    if (!raw) return;
    const cart = JSON.parse(raw) as { items: { quantity?: number }[] };
    if (cart.items[0]) cart.items[0].quantity = 2;
    localStorage.setItem("tkad_plan_cart", JSON.stringify(cart));
  });
  await page.goto("/ko/my/plan/report", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const gAfter = hasGreeting ? await greeting.inputValue() : "";
  const eAfter = hasExec ? await exec.inputValue() : "";
  const okG = gAfter.includes(markerG);
  const okE = eAfter.includes(markerE);
  note(
    "604",
    okG && okE
      ? `PASS — 인사말/전략요약 유지 (greeting ok=${okG}, exec ok=${okE})`
      : `FAIL — reset detected greeting="${gAfter.slice(0, 80)}" exec="${eAfter.slice(0, 80)}"`,
  );
  note(
    "604",
    `console errors: ${consoleErrors604.length ? consoleErrors604.slice(0, 5).join(" | ") : "none"}`,
  );
  await page.screenshot({ path: join(OUT, "604-report-after-cart-change.png"), fullPage: true });
  await page.close();
  return okG && okE;
}

async function run605(context: BrowserContext, mediaId: string) {
  const page = await context.newPage();
  attachConsole(page, consoleErrors605);
  page.setDefaultTimeout(120_000);

  note("605-1", "register user A, save 2 plans (same API as brief 「플랜 저장」)");
  const userA = await registerUser(BASE605, "A");
  const planA1 = await saveCampaignPlan(BASE605, userA.cookie, mediaId, "E2E Plan A1");
  const planA2 = await saveCampaignPlan(BASE605, userA.cookie, mediaId, "E2E Plan A2");
  note("605-1", `saved ids ${planA1.id}, ${planA2.id}`);

  await context.addCookies([
    {
      name: "tkad_user_session",
      value: userA.cookie.split("=")[1]!,
      domain: new URL(BASE605).hostname,
      path: "/",
    },
  ]);

  note("605-2", "open /ko/my/plan/campaigns as A");
  await page.goto("/ko/my/plan/campaigns", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const bodyA = await page.locator("body").innerText();
  const seesA1 = bodyA.includes("E2E Plan A1") || bodyA.includes(planA1.id.slice(0, 8));
  const seesA2 = bodyA.includes("E2E Plan A2") || bodyA.includes(planA2.id.slice(0, 8));
  note("605-2", seesA1 && seesA2 ? "PASS — A sees both saved plans" : `FAIL — page text missing plans`);

  note("605-3", "register user B, list isolation");
  const userB = await registerUser(BASE605, "B");
  await saveCampaignPlan(BASE605, userB.cookie, mediaId, "E2E Plan B1");
  const listA = await listCampaignPlans(BASE605, userA.cookie);
  const listB = await listCampaignPlans(BASE605, userB.cookie);
  const aIds = new Set(listA.map((x) => x.id));
  const bIds = new Set(listB.map((x) => x.id));
  const leakToB = [...aIds].some((id) => bIds.has(id));
  const bHasOwn = listB.some((x) => x.title.includes("E2E Plan B1"));
  note(
    "605-3",
    !leakToB && bHasOwn
      ? `PASS — B list ${listB.length} item(s), no A ids (${listA.length} on A)`
      : `FAIL — leakToB=${leakToB} bHasOwn=${bHasOwn} A=${listA.length} B=${listB.length}`,
  );

  await context.clearCookies();
  await context.addCookies([
    {
      name: "tkad_user_session",
      value: userB.cookie.split("=")[1]!,
      domain: new URL(BASE605).hostname,
      path: "/",
    },
  ]);
  await page.goto("/ko/my/plan/campaigns", { waitUntil: "domcontentloaded" });
  const bodyB = await page.locator("body").innerText();
  const bSeesA = bodyB.includes("E2E Plan A1") || bodyB.includes("E2E Plan A2");
  note("605-3-ui", bSeesA ? "FAIL — B UI shows A plans" : "PASS — B UI does not show A plans");

  note("605-4", "open plan link");
  const openHref = `/planner?plan=${encodeURIComponent(planA1.id)}`;
  await context.clearCookies();
  await context.addCookies([
    {
      name: "tkad_user_session",
      value: userA.cookie.split("=")[1]!,
      domain: new URL(BASE605).hostname,
      path: "/",
    },
  ]);
  await page.goto(openHref, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const plannerUrl = page.url();
  const plannerBody = await page.locator("body").innerText();
  const restored =
    plannerUrl.includes(`plan=${planA1.id}`) &&
    (plannerBody.includes("E2E Plan A1") || plannerBody.includes("저장") || plannerBody.includes("Saved"));
  note("605-4", restored ? `PASS — planner opened ${plannerUrl}` : `FAIL — url=${plannerUrl}`);

  note("605-5", "guest save not in A list, id GET still works");
  const { res: guestSaveRes, json: guestPlan } = await fetchJson(BASE605, "/api/campaign-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brief: {
        budgetInputWon: 10_000_000,
        budgetMode: "total",
        regionCodes: ["11"],
        goal: "brand",
        flightStart: "2026-11-01",
        flightEnd: "2026-11-30",
        freeText: "guest-only",
      },
      mixUnits: { [mediaId]: 1 },
      mixPriceOptionIndex: {},
      customLines: [],
    }),
  });
  const guestId = (guestPlan as { id?: string })?.id;
  const guestOk = guestSaveRes.ok && !!guestId;
  const listAfterGuest = await listCampaignPlans(BASE605, userA.cookie);
  const guestInList = guestId ? listAfterGuest.some((x) => x.id === guestId) : true;
  const { res: getRes } = await fetchJson(
    BASE605,
    `/api/campaign-plan/${encodeURIComponent(guestId ?? "")}`,
  );
  note(
    "605-5",
    guestOk && !guestInList && getRes.ok
      ? `PASS — guest plan ${guestId} not in A list, GET ${getRes.status}`
      : `FAIL — guestOk=${guestOk} guestInList=${guestInList} get=${getRes.status}`,
  );

  note("605-6", "nav links to campaigns");
  await page.goto("/ko/my/plan", { waitUntil: "domcontentloaded" });
  const hubLink = page.getByRole("link", { name: /저장 플랜|Saved plans/i }).first();
  await hubLink.click();
  await page.waitForURL(/\/my\/plan\/campaigns/);
  note("605-6", `PASS — my/plan link → ${page.url()}`);

  await page.goto("/ko/planner", { waitUntil: "domcontentloaded" });
  const sidebarLink = page.locator('a[href*="/my/plan/campaigns"]').first();
  if ((await sidebarLink.count()) > 0) {
    await sidebarLink.click();
    await page.waitForURL(/\/my\/plan\/campaigns/);
    note("605-6", `PASS — sidebar → ${page.url()}`);
  } else {
    note("605-6", "SKIP — sidebar link not found on planner (layout may differ)");
  }

  note(
    "605-7",
    `console errors: ${consoleErrors605.length ? consoleErrors605.slice(0, 8).join(" | ") : "none"}`,
  );
  await page.screenshot({ path: join(OUT, "605-campaigns-list.png"), fullPage: true });
  await page.close();
}

async function main() {
  note("env", `604 base=${BASE604}`);
  note("env", `605 base=${BASE605}`);
  note("env", `vercel oidc header=${Boolean(vercelHeaders["x-vercel-trusted-oidc-idp-token"])}`);

  const mediaId604 = await getCatalogMediaId(BASE604);
  const mediaId605 = await getCatalogMediaId(BASE605);

  const browser = await chromium.launch({ headless: true });
  const ctx604 = await browser.newContext({
    baseURL: BASE604,
    extraHTTPHeaders: vercelHeaders,
    locale: "ko-KR",
  });
  const ctx605 = await browser.newContext({
    baseURL: BASE605,
    extraHTTPHeaders: vercelHeaders,
    locale: "ko-KR",
  });

  let ok604 = false;
  try {
    ok604 = await run604(ctx604, mediaId604);
  } catch (e) {
    note("604", `ERROR ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    await run605(ctx605, mediaId605);
  } catch (e) {
    note("605", `ERROR ${e instanceof Error ? e.message : String(e)}`);
  }

  await browser.close();
  writeFileSync(join(OUT, "report.txt"), logLines.join("\n"), "utf8");
  note("done", `wrote ${join(OUT, "report.txt")}`);
  if (!ok604) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
