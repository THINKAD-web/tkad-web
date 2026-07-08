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
      mediaLines: ["강남역 LED", "홍대입구 버스쉘터"],
      period: "2026-07-01 ~ 2026-07-31",
      totalAmountManwon: 5000,
      specialTerms: "소재 규격은 1920x1080 기준.",
      locale: "ko",
      download: false,
    },
    "DRAFT-ABC123",
  );
  assert.equal(vars.advertiserLine, "테스트 주식회사 (홍길동)");
  assert.equal(vars.mediaLines.length, 2);
  assert.match(vars.amountLine, /5,000/);
  assert.equal(vars.contractId, "DRAFT-ABC123");
  assert.equal(vars.specialTerms, "소재 규격은 1920x1080 기준.");
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
  assert.equal(vars.advertiserLine, "테스트 (홍길동)");
  assert.equal(JSON.stringify(vars).includes("hidden@example.com"), false);
});
