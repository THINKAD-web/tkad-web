import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContractMoney,
  parseWonFromLooseAdminInput,
  resolveContractExtraWons,
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

test("parseWonFromLooseAdminInput reads won and 만", () => {
  assert.equal(parseWonFromLooseAdminInput("20,000,000"), 20_000_000);
  assert.equal(parseWonFromLooseAdminInput("2000만"), 20_000_000);
});

test("resolveContractExtraWons uses productionCost text", () => {
  const extras = resolveContractExtraWons(
    { productionCost: "20000000" },
    null,
  );
  assert.equal(extras.extraProductionWon, 20_000_000);
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
