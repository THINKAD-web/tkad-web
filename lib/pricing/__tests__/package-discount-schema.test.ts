import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const SCHEMA_PATH = join(ROOT, "prisma/schema.prisma");

function schemaSource(): string {
  return readFileSync(SCHEMA_PATH, "utf8");
}

test("PackageDiscountRule 모델 필드가 스키마에 정의되어 있다", () => {
  const src = schemaSource();
  assert.match(src, /model PackageDiscountRule \{/);
  for (const field of [
    "minMediaCount",
    "maxMediaCount",
    "minSupplyWon",
    "maxSupplyWon",
    "discountPercent",
    "stackable",
    "validFrom",
    "validTo",
  ]) {
    assert.match(src, new RegExp(`\\b${field}\\b`), `missing ${field}`);
  }
  assert.match(src, /@@map\("package_discount_rules"\)/);
});

test("OoHQuote 패키지 할인 스냅샷 필드 기본값·관계", () => {
  const src = schemaSource();
  const quoteBlock = src.slice(
    src.indexOf("model OoHQuote"),
    src.indexOf("model OoHQuote") + 4000,
  );
  assert.match(quoteBlock, /packageDiscountRuleId/);
  assert.match(quoteBlock, /packageDiscountPercent\s+Float\s+@default\(0\)/);
  assert.match(quoteBlock, /packageDiscountWon\s+Int\s+@default\(0\)/);
  assert.match(
    quoteBlock,
    /packageDiscountSource\s+String\s+@default\("none"\)/,
  );
  assert.match(quoteBlock, /discountRate\s+Float\s+@default\(0\)/);
});

test("prisma schema validate 통과", () => {
  execSync("npx prisma validate", {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
  });
});
