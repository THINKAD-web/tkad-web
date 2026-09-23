import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContractMoney,
  parseWonFromLooseAdminInput,
  resolveContractExtraWons,
  supplyWonFromManwonField,
} from "@/lib/contract-money";
import {
  mergeOohContractMetaIntoAdminNote,
  parseOohContractMeta,
} from "@/lib/ooh-contract-meta";

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

test("G1 negotiated media plus production", () => {
  const money = buildContractMoney({
    mediaLines: [
      {
        name: "코엑스 케이팝 스퀘어",
        location: "강남",
        spec: "",
        supplyWon: 100_000_000,
      },
      {
        name: "명동 미디어폴",
        location: "중구",
        spec: "",
        supplyWon: 10_000_000,
      },
    ],
    contractMediaSupplyWon: 100_000_000,
    extraProductionWon: 2_000_000,
    productionCostText: "제작비",
  });
  assert.equal(money.mediaSubtotalWon, 110_000_000);
  assert.equal(money.adjustmentWon, -10_000_000);
  assert.equal(money.supplyWon, 102_000_000);
  assert.equal(money.vatWon, 10_200_000);
  assert.equal(money.totalWon, 112_200_000);
  assert.equal(money.amountKorean, "일억일천이백이십만원정");
  assert.match(money.totalAmountDisplay, /112,200,000/);
  assert.match(money.adUnitPriceDisplay, /매체별 내역 참조/);
  assert.match(money.productionDisplay, /2,000,000/);
  assert.equal(money.productionDisplay.includes("제작비"), false);
});

test("G2 production note without amount", () => {
  const money = buildContractMoney({
    mediaLines: [
      { name: "홍대", location: "", spec: "", supplyWon: 15_000_000 },
    ],
    contractMediaSupplyWon: 15_000_000,
    extraProductionWon: 0,
    productionCostText:
      "광고주 직접 제작 – 9월21일 오전까지 sales@tkad.co.kr로 전달",
  });
  assert.match(money.productionDisplay, /광고주 직접 제작/);
  assert.equal(money.adjustmentWon, 0);
});

test("meta JSON keeps braces inside strings", () => {
  const note = mergeOohContractMetaIntoAdminNote("memo", {
    otherNotes: "특약에 } 와 {중괄호} 포함",
    extraProductionWon: 2_000_000,
  });
  const parsed = parseOohContractMeta(note);
  assert.equal(parsed.otherNotes, "특약에 } 와 {중괄호} 포함");
  assert.equal(parsed.extraProductionWon, 2_000_000);
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
