/**
 * Vercel Preview deployment protection bypass for Playwright / fetch.
 *
 * Patterns used elsewhere in this repo:
 * - Cookie priming via `/?_vercel_share=…` (capture-pr4-baseline-admin.mjs)
 * - Optional `x-vercel-protection-bypass` when VERCEL_AUTOMATION_BYPASS_SECRET is set
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env.preview.local" });
config({ path: ".env" });

export const VERCEL_PROTECTION_BYPASS_HEADER = "x-vercel-protection-bypass";

export function resolvePreviewBase(rawBase) {
  const trimmed = (rawBase ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  return {
    origin: url.origin,
    /** Path prefix when BASE includes locale (e.g. /ko/quote). */
    pathPrefix: url.pathname.replace(/\/$/, "") || "",
  };
}

export function resolveVercelShareToken(argv = process.argv) {
  const fromArg = argv.includes("--share")
    ? argv[argv.indexOf("--share") + 1]
    : "";
  return (
    fromArg ||
    process.env.VERCEL_SHARE_TOKEN?.trim() ||
    process.env.VERCEL_SHARE?.trim() ||
    ""
  );
}

export function resolveProtectionBypassSecret() {
  return (
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() ||
    process.env.VERCEL_PROTECTION_BYPASS?.trim() ||
    ""
  );
}

/** Playwright `extraHTTPHeaders` for preview protection bypass. */
export function vercelProtectionBypassHeaders() {
  const secret = resolveProtectionBypassSecret();
  if (!secret) return {};
  return { [VERCEL_PROTECTION_BYPASS_HEADER]: secret };
}

/** Prime `_vercel_share` cookie in a Playwright context (same pattern as PR4 capture). */
export async function primeVercelShareCookie(page, baseOrigin, shareToken) {
  if (!shareToken) return { primed: false, reason: "no-share-token" };
  await page.goto(`${baseOrigin}/?_vercel_share=${encodeURIComponent(shareToken)}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(800);
  const title = await page.title();
  const body = await page.locator("body").innerText().catch(() => "");
  const blocked =
    /Authentication Required|Log in to Vercel|Deployment Protection/i.test(
      `${title}\n${body.slice(0, 400)}`,
    );
  return { primed: !blocked, blocked, title: title.slice(0, 80) };
}

export async function createPreviewBrowserContext(browser, { locale = "ko-KR", viewport } = {}) {
  const headers = vercelProtectionBypassHeaders();
  return browser.newContext({
    locale,
    viewport: viewport ?? { width: 390, height: 844 },
    ...(Object.keys(headers).length ? { extraHTTPHeaders: headers } : {}),
  });
}
