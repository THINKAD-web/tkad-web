import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeMediaDetailTextLocale,
  pickMediaTranslationField,
  resolveMediaText,
} from "@/lib/media-i18n";

test("normalizeMediaDetailTextLocale", () => {
  assert.equal(normalizeMediaDetailTextLocale("ko"), "ko");
  assert.equal(normalizeMediaDetailTextLocale("ko-KR"), "ko");
  assert.equal(normalizeMediaDetailTextLocale("en"), "en");
  assert.equal(normalizeMediaDetailTextLocale("en-US"), "en");
  assert.equal(normalizeMediaDetailTextLocale("ja"), "ja");
  assert.equal(normalizeMediaDetailTextLocale("zh-CN"), "zh");
});

test("resolveMediaText — ko locale", () => {
  assert.equal(
    resolveMediaText({ locale: "ko", ko: "한국", en: "Korea" }),
    "한국",
  );
  assert.equal(
    resolveMediaText({ locale: "ko", ko: "", en: "Korea" }),
    "Korea",
  );
  assert.equal(resolveMediaText({ locale: "ko", ko: "한국", en: "" }), "한국");
});

test("resolveMediaText — en locale", () => {
  assert.equal(
    resolveMediaText({ locale: "en", ko: "한국", en: "Korea" }),
    "Korea",
  );
  assert.equal(
    resolveMediaText({ locale: "en", ko: "한국", en: "" }),
    "한국",
  );
});

test("resolveMediaText — ja locale with fallbacks", () => {
  assert.equal(
    resolveMediaText({
      locale: "ja",
      ko: "한국",
      en: "Korea",
      translation: "韓国",
    }),
    "韓国",
  );
  assert.equal(
    resolveMediaText({
      locale: "ja",
      ko: "한국",
      en: "Korea",
      translation: "",
    }),
    "Korea",
  );
  assert.equal(
    resolveMediaText({
      locale: "ja",
      ko: "한국",
      en: "",
      translation: "",
    }),
    "한국",
  );
});

test("resolveMediaText — zh locale with fallbacks", () => {
  assert.equal(
    resolveMediaText({
      locale: "zh",
      ko: "강남",
      en: "Gangnam",
      translation: "江南",
    }),
    "江南",
  );
  assert.equal(
    resolveMediaText({
      locale: "zh-Hans",
      ko: "강남",
      en: "Gangnam",
      translation: "  ",
    }),
    "Gangnam",
  );
});

test("pickMediaTranslationField + resolveMediaText end-to-end", () => {
  const translations = [
    { locale: "ja", name: "JA名", description: null, location: "JA場所" },
    { locale: "zh", name: "中文名", description: "中文说明", location: null },
  ];
  const jaName = pickMediaTranslationField(translations, "ja", "name");
  assert.equal(
    resolveMediaText({
      locale: "ja",
      ko: "KO名",
      en: "EN name",
      translation: jaName,
    }),
    "JA名",
  );
  const zhDesc = pickMediaTranslationField(translations, "zh", "description");
  assert.equal(
    resolveMediaText({
      locale: "zh",
      ko: "KO説明",
      en: "EN desc",
      translation: zhDesc,
    }),
    "中文说明",
  );
  const zhLoc = pickMediaTranslationField(translations, "zh", "location");
  assert.equal(
    resolveMediaText({
      locale: "zh",
      ko: "서울",
      en: "Seoul",
      translation: zhLoc,
    }),
    "Seoul",
  );
});
