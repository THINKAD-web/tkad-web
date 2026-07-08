import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdvertiserLine,
  buildContractAmountLine,
  StandaloneContractPreviewBody,
  standaloneContractToPdfVars,
} from "@/lib/standalone-contract";

test("standalone contract pdf vars without pipeline", () => {
  const vars = standaloneContractToPdfVars(
    {
      clientCompany: "테스트 주식회사",
      clientName: "홍길동",
      clientRepName: "김대표",
      clientAddress: "서울시 강남구",
      clientPhone: "010-1111-2222",
      campaignName: "강남역 LED 광고",
      productionCost: "자체제작",
      mediaCount: "2기",
      paymentMethod: "계산서 발행 후 선결제",
      mediaLines: ["강남역 LED", "홍대입구 버스쉘터"],
      period: "2026-07-01 ~ 2026-07-31",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      totalAmountManwon: 5000,
      specialTerms: "소재 규격은 1920x1080 기준.",
      locale: "ko",
      download: false,
    },
    "DRAFT-ABC123",
  );
  assert.equal(vars.clientCompany, "테스트 주식회사");
  assert.equal(vars.clientRepName, "김대표");
  assert.equal(vars.campaignName, "강남역 LED 광고");
  assert.equal(vars.mediaCount, "2기");
  assert.match(vars.totalAmount, /VAT포함/);
  assert.equal(vars.amountKorean, "오천오백만원정");
  assert.equal(vars.contractId, "DRAFT-ABC123");
});

test("advertiser line without company", () => {
  assert.equal(
    buildAdvertiserLine({ clientCompany: "", clientName: "Jane" }, false),
    "Jane",
  );
});

test("standalone contract preview body accepts optional client email", () => {
  const parsed = StandaloneContractPreviewBody.safeParse({
    clientName: "홍길동",
    clientEmail: "client@example.com",
    period: "2026-07-01 ~ 2026-07-31",
    totalAmountManwon: 1000,
    locale: "ko",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.clientEmail, "client@example.com");
  }

  const emptyEmail = StandaloneContractPreviewBody.safeParse({
    clientName: "홍길동",
    period: "2026-07-01 ~ 2026-07-31",
    totalAmountManwon: 1000,
  });
  assert.equal(emptyEmail.success, true);

  const badEmail = StandaloneContractPreviewBody.safeParse({
    clientName: "홍길동",
    clientEmail: "not-an-email",
    period: "2026-07-01 ~ 2026-07-31",
    totalAmountManwon: 1000,
  });
  assert.equal(badEmail.success, false);
});

test("client email is not included in pdf vars", () => {
  const vars = standaloneContractToPdfVars(
    {
      clientCompany: "테스트",
      clientName: "홍길동",
      clientEmail: "hidden@example.com",
      mediaLines: [],
      period: "2026-07-01 ~ 2026-07-31",
      totalAmountManwon: 1000,
      locale: "ko",
      download: false,
    },
    "DRAFT-EMAIL",
  );
  assert.equal(vars.clientRepName, "홍길동");
  assert.equal(JSON.stringify(vars).includes("hidden@example.com"), false);
});
