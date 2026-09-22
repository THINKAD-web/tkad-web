#!/usr/bin/env node
/**
 * PR7 — locale indexing readiness (messages 100% vs en + active media translation coverage ≥95%).
 *
 * Usage:
 *   npx tsx scripts/check-locale-readiness.mts
 *   npx tsx scripts/check-locale-readiness.mts --write-snapshot
 */
import { config } from "dotenv";
config();
config({ path: ".env.local" });

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPrisma, isDatabaseConfigured } from "../lib/prisma.ts";
import {
  compareMessageKeySets,
  computeMediaTranslationCoverage,
  evaluateLocaleReadiness,
  INDEXED_CONTENT_LOCALES,
  LOCALE_READINESS_MEDIA_THRESHOLD,
  LOCALE_READINESS_MESSAGE_THRESHOLD,
  type LocaleReadinessSnapshot,
} from "../lib/locale-readiness.ts";

const WRITE = process.argv.includes("--write-snapshot");
const ROOT = process.cwd();

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, "messages", name), "utf8"));
}

async function main() {
  const en = loadJson("en.json");
  const ja = loadJson("ja.json");
  const zh = loadJson("zh.json");

  const snapshot: LocaleReadinessSnapshot = {
    generatedAt: new Date().toISOString(),
    messageKeyThreshold: LOCALE_READINESS_MESSAGE_THRESHOLD,
    mediaCoverageThreshold: LOCALE_READINESS_MEDIA_THRESHOLD,
    locales: {},
  };

  let db = null;
  if (isDatabaseConfigured()) {
    db = getPrisma();
  }

  for (const locale of INDEXED_CONTENT_LOCALES) {
    const target = locale === "ja" ? ja : zh;
    const msg = compareMessageKeySets(en, target);
    let media = {
      total: 0,
      withTranslation: 0,
      ratio: 0,
      pass: false,
    };
    if (db) {
      media = await computeMediaTranslationCoverage(db, locale);
    }

    const metrics = evaluateLocaleReadiness(locale, {
      messageKeyCountEn: msg.enCount,
      messageKeyCountTarget: msg.targetCount,
      messageKeyRatio: msg.enCount ? msg.targetCount / msg.enCount : 0,
      messagesComplete: msg.complete,
      missingMessageKeys: msg.missing.slice(0, 40),
      mediaActiveTotal: media.total,
      mediaWithTranslation: media.withTranslation,
      mediaCoverageRatio: media.ratio,
      mediaCoveragePass: media.pass,
      indexAllowed: false,
    });

    snapshot.locales[locale] = metrics;

    console.log(`\n=== ${locale} ===`);
    console.log(
      `Messages: ${(metrics.messageKeyRatio * 100).toFixed(1)}% (${metrics.messageKeyCountTarget}/${metrics.messageKeyCountEn} keys) — ${metrics.messagesComplete ? "PASS" : "FAIL"}`,
    );
    if (!metrics.messagesComplete && metrics.missingMessageKeys.length > 0) {
      console.log(
        `  Missing sample (${metrics.missingMessageKeys.length} shown max 40):`,
      );
      for (const k of metrics.missingMessageKeys.slice(0, 8)) {
        console.log(`    - ${k}`);
      }
      if (msg.missing.length > 8) {
        console.log(`    … and ${msg.missing.length - 8} more`);
      }
    }
    console.log(
      `MediaTranslation coverage: ${(metrics.mediaCoverageRatio * 100).toFixed(1)}% (${metrics.mediaWithTranslation}/${metrics.mediaActiveTotal}) — ${metrics.mediaCoveragePass ? "PASS" : "FAIL"}`,
    );
    console.log(`Index allowed: ${metrics.indexAllowed ? "YES" : "NO"}`);
  }

  if (WRITE) {
    const out = join(ROOT, "lib/locale-readiness.snapshot.json");
    writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    console.log(`\nWrote ${out}`);
  }

  if (db) await db.$disconnect();

  const allPass = INDEXED_CONTENT_LOCALES.every(
    (l) => snapshot.locales[l]?.indexAllowed,
  );
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
