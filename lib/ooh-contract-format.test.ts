import assert from "node:assert/strict";
import test from "node:test";
import {
  dedupeCampaignAdSuffix,
  formatContractCampaignName,
  formatContractAmountKorean,
  formatContractArticle1PeriodValue,
  formatContractDesignProductionLine,
  formatKoreanPhoneDisplay,
} from "@/lib/ooh-contract-format";

test("formatContractCampaignName — 다중 매체 외 N건", () => {
  const names = [
    "코엑스 케이팝 스퀘어 전광판",
    "홍대 A",
    "홍대 B",
    "강남 C",
    "잠실 D",
  ];
  assert.equal(
    formatContractCampaignName(names),
    "코엑스 케이팝 스퀘어 전광판 광고 외 4건",
  );
});

test("formatContractCampaignName — 매체명에 광고 포함 시 중복 없음", () => {
  assert.equal(
    formatContractCampaignName(["교보문고 사이니지 광고"]),
    "교보문고 사이니지 광고",
  );
  assert.equal(
    formatContractCampaignName(["교보문고"], "교보문고 광고 광고"),
    "교보문고 광고",
  );
});

test("dedupeCampaignAdSuffix", () => {
  assert.equal(dedupeCampaignAdSuffix("기어세컨드 광고 광고"), "기어세컨드 광고");
});

test("formatContractAmountKorean — 대액", () => {
  assert.equal(formatContractAmountKorean(110_000_000), "일억천만원정");
  assert.equal(formatContractAmountKorean(132_000_000), "일억삼천이백만원정");
});

test("formatContractArticle1PeriodValue keeps 일 suffix", () => {
  const v = formatContractArticle1PeriodValue(
    "2026년 9월 22일",
    "2026년 10월 21일",
    "1개월",
  );
  assert.match(v, /22일 ~ 2026년 10월 21일/);
});

test("formatContractDesignProductionLine shows won amounts", () => {
  const line = formatContractDesignProductionLine("제작비", [
    { label: "제작비", amountWon: 20_000_000 },
  ]);
  assert.match(line, /￦ 20,000,000원\(VAT별도\)/);
});

test("formatKoreanPhoneDisplay", () => {
  assert.equal(formatKoreanPhoneDisplay("01064325577"), "010-6432-5577");
});
