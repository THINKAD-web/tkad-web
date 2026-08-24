#!/usr/bin/env npx tsx
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../docs/screenshots/pr461-qp-preview");
const BASE = process.env.BASE_URL ?? "http://localhost:3000/ko";

const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile-375", width: 375, height: 812 },
] as const;

const pages = [
  { path: "/register", label: "register" },
  { path: "/login", label: "login" },
  { path: "/forgot-password", label: "forgot-password" },
  { path: "/verify-email", label: "verify-email" },
  { path: "/pricing", label: "pricing" },
  { path: "/register/google", label: "oauth-google" },
] as const;

const themes = ["light", "dark"] as const;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

for (const theme of themes) {
  for (const vp of viewports) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: theme,
    });
    const page = await ctx.newPage();
    for (const p of pages) {
      await page.goto(`${BASE}${p.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.evaluate((t) => {
        document.documentElement.classList.toggle("dark", t === "dark");
      }, theme);
      await page.waitForTimeout(2000);
      const file = join(OUT, `${theme}-${vp.name}-${p.label}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log("wrote", file);
    }
    await ctx.close();
  }
}

await browser.close();
