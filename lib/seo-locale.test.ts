import assert from "node:assert/strict";
import test from "node:test";
import { pageAlternates, siteUrl } from "@/lib/seo";
import {
  buildHreflangLanguageMap,
  jsonLdInLanguage,
  openGraphLocaleTag,
} from "@/lib/seo-locale";
import { createSitemapBuildContext, sitemapEntry } from "@/lib/sitemap-build";

const ORIGIN = siteUrl.replace(/\/$/, "");

test("pageAlternates — ko/en hreflang matches routing.locales (regression)", () => {
  const alt = pageAlternates("ko", "/media/foo");
  assert.deepEqual(alt.languages, {
    ko: `${ORIGIN}/ko/media/foo`,
    en: `${ORIGIN}/en/media/foo`,
    "x-default": `${ORIGIN}/ko/media/foo`,
  });
  assert.equal(alt.canonical, "/ko/media/foo");
});

test("sitemapEntry alternates — same hreflang map as pageAlternates", () => {
  const ctx = createSitemapBuildContext();
  const entry = sitemapEntry(ctx, "/planner");
  assert.deepEqual(entry.alternates?.languages, {
    ko: `${ORIGIN}/ko/planner`,
    en: `${ORIGIN}/en/planner`,
    "x-default": `${ORIGIN}/ko/planner`,
  });
  assert.equal(entry.url, `${ORIGIN}/ko/planner`);
});

test("buildHreflangLanguageMap — expands when locales include ja/zh (PR7 preview)", () => {
  const map = buildHreflangLanguageMap(ORIGIN, "/media", [
    "ko",
    "en",
    "ja",
    "zh",
  ]);
  assert.equal(map.ja, `${ORIGIN}/ja/media`);
  assert.equal(map.zh, `${ORIGIN}/zh/media`);
  assert.equal(map["x-default"], `${ORIGIN}/ko/media`);
});

test("JSON-LD BCP47 vs Open Graph underscore locale", () => {
  assert.equal(jsonLdInLanguage("ja"), "ja-JP");
  assert.equal(openGraphLocaleTag("ja"), "ja_JP");
  assert.equal(jsonLdInLanguage("zh"), "zh-CN");
  assert.equal(openGraphLocaleTag("zh"), "zh_CN");
});
