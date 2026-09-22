import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContractMoney,
  supplyWonFromManwonField,
} from "@/lib/contract-money";

test("manwon field converts once", () => {
  assert.equal(supplyWonFromManwonField(1650), 16_500_000);
});

test("won stored in manwon field is not multiplied again", () => {
  assert.equal(supplyWonFromManwonField(16_500_000), 16_500_000);
  const money = buildContractMoney({ mediaSupplyWon: 16_500_000 });
  assert.equal(money.totalWon, 18_150_000);
  assert.notEqual(money.totalWon, 165_000_000_000);
});

test("extras add before VAT", () => {
  const money = buildContractMoney({
    mediaSupplyWon: 1_000_000,
    extraProductionWon: 200_000,
    extraInstallWon: 100_000,
  });
  assert.equal(money.supplyWon, 1_300_000);
  assert.equal(money.vatWon, 130_000);
  assert.equal(money.totalWon, 1_430_000);
});
