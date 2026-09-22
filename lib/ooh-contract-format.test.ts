import assert from "node:assert/strict";
import test from "node:test";
import {
  dedupeCampaignAdSuffix,
  formatContractCampaignName,
  formatContractAmountKorean,
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
});
