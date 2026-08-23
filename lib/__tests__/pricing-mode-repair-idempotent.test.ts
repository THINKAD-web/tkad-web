/**
 * repair 마이그레이션 SQL 로직 — 3가지 초기 상태에서 동일 종료 상태 검증.
 */
import assert from "node:assert/strict";
import test from "node:test";

type Row = {
  id: string;
  isActive: boolean;
  mediaSubCategory: string | null;
  price: number;
  priceOptions: { price: number }[] | null;
  pricingMode: "fixed" | "quote_only" | null;
};

function shouldBeQuoteOnly(r: Row): boolean {
  if (!r.isActive || r.mediaSubCategory !== "wall_mural") return false;
  if (r.price > 0) return false;
  const opts = r.priceOptions ?? [];
  if (opts.some((o) => o.price > 0)) return false;
  return true;
}

/** repair migration.sql 과 동일: wall 전부 fixed → 조건 충족만 quote_only */
function applyRepair(rows: Row[]): Row[] {
  const out = rows.map((r) => ({ ...r }));
  for (const r of out) {
    if (r.mediaSubCategory === "wall_mural") {
      r.pricingMode = "fixed";
    }
  }
  for (const r of out) {
    if (shouldBeQuoteOnly(r)) {
      r.pricingMode = "quote_only";
    }
  }
  return out;
}

function wallCounts(rows: Row[]) {
  const wall = rows.filter(
    (r) => r.isActive && r.mediaSubCategory === "wall_mural",
  );
  return {
    quoteOnly: wall.filter((r) => r.pricingMode === "quote_only").length,
    fixed: wall.filter((r) => r.pricingMode === "fixed").length,
    pricedQuoteOnly: wall.filter(
      (r) => r.pricingMode === "quote_only" && r.price > 0,
    ).length,
  };
}

const nineIds = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
  "q8",
  "q9",
];

function makeFixture(): Row[] {
  const rows: Row[] = [];
  for (const id of nineIds) {
    rows.push({
      id,
      isActive: true,
      mediaSubCategory: "wall_mural",
      price: 0,
      priceOptions: null,
      pricingMode: "fixed",
    });
  }
  for (let i = 0; i < 36; i++) {
    rows.push({
      id: `p${i}`,
      isActive: true,
      mediaSubCategory: "wall_mural",
      price: 10_000_000 + i,
      priceOptions: [{ price: 10_000_000 + i }],
      pricingMode: "fixed",
    });
  }
  rows.push({
    id: "led",
    isActive: true,
    mediaSubCategory: "led",
    price: 5_000_000,
    priceOptions: null,
    pricingMode: "fixed",
  });
  return rows;
}

function assertEndState(rows: Row[], label: string) {
  const c = wallCounts(rows);
  assert.equal(c.quoteOnly, 9, `${label}: quote_only`);
  assert.equal(c.fixed, 36, `${label}: fixed`);
  assert.equal(c.pricedQuoteOnly, 0, `${label}: no priced quote_only`);
}

test("repair — 컬럼 없음(전부 null) → 9/36", () => {
  const rows = makeFixture().map((r) => ({ ...r, pricingMode: null }));
  const out = applyRepair(rows);
  assertEndState(out, "no column");
});

test("repair — 45건 오염(전부 quote_only) → 9/36", () => {
  const rows = makeFixture().map((r) => ({
    ...r,
    pricingMode: "quote_only" as const,
  }));
  const out = applyRepair(rows);
  assertEndState(out, "corrupted 45");
});

test("repair — 이미 9/36 정상 → 동일 유지", () => {
  const rows = makeFixture().map((r) => ({
    ...r,
    pricingMode: shouldBeQuoteOnly(r)
      ? ("quote_only" as const)
      : ("fixed" as const),
  }));
  const before = wallCounts(rows);
  assert.equal(before.quoteOnly, 9);
  const out = applyRepair(rows);
  assertEndState(out, "already correct");
  for (const r of out) {
    const orig = rows.find((x) => x.id === r.id)!;
    assert.equal(r.pricingMode, orig.pricingMode);
  }
});

test("repair — idempotent (두 번 적용해도 동일)", () => {
  const corrupted = makeFixture().map((r) => ({
    ...r,
    pricingMode: "quote_only" as const,
  }));
  const once = applyRepair(corrupted);
  const twice = applyRepair(once);
  assert.deepEqual(
    once.map((r) => [r.id, r.pricingMode]),
    twice.map((r) => [r.id, r.pricingMode]),
  );
});
