import assert from "node:assert/strict";
import test from "node:test";
import {
  campaignReportPreviewHeader,
  selectedCampaignReportIdentity,
  type CampaignReportIdentitySource,
} from "@/lib/admin-campaign-report-identity";

function row(
  overrides: Partial<CampaignReportIdentitySource> &
    Pick<CampaignReportIdentitySource, "id" | "name">,
): CampaignReportIdentitySource {
  return {
    clientCompany: "회사",
    clientName: "담당",
    clientEmail: "a@example.com",
    status: "airing",
    notes: null,
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    budgetMin: 1,
    budgetMax: 2,
    ...overrides,
  };
}

test("selectedCampaignReportIdentity follows selectedId, not another row", () => {
  const list = [
    row({ id: "a", name: "알파", clientCompany: "에이" }),
    row({ id: "b", name: "베타", clientCompany: "비" }),
  ];
  assert.equal(selectedCampaignReportIdentity(list, "a")?.name, "알파");
  assert.equal(selectedCampaignReportIdentity(list, "b")?.name, "베타");
  assert.equal(selectedCampaignReportIdentity(list, "missing"), null);
  assert.equal(selectedCampaignReportIdentity(list, null), null);
});

test("preview header uses selected campaign fields, not create-form leftovers", () => {
  const createForm = {
    name: "새 캠페인 입력중",
    clientCompany: "폼고객사",
    clientName: "폼담당",
    clientEmail: "form@example.com",
  };
  const selected = row({
    id: "b",
    name: "슈퍼마리오",
    clientCompany: "웹스",
    clientName: "이재한",
    clientEmail: "jaehan@example.com",
    status: "completed",
    notes: "메모",
  });
  const header = campaignReportPreviewHeader(selected, "완료");
  assert.equal(header.campaignName, "슈퍼마리오");
  assert.equal(header.clientCompany, "웹스");
  assert.equal(header.clientName, "이재한");
  assert.equal(header.clientEmail, "jaehan@example.com");
  assert.equal(header.status, "완료");
  assert.equal(header.notes, "메모");
  assert.notEqual(header.campaignName, createForm.name);
  assert.notEqual(header.clientCompany, createForm.clientCompany);
});

test("switching campaigns updates header identity", () => {
  const list = [
    row({ id: "a", name: "테스트", clientCompany: "테스트" }),
    row({ id: "b", name: "슈퍼마리오", clientCompany: "웹스" }),
  ];
  const first = selectedCampaignReportIdentity(list, "a");
  const second = selectedCampaignReportIdentity(list, "b");
  assert.ok(first && second);
  const h1 = campaignReportPreviewHeader(first, "완료");
  const h2 = campaignReportPreviewHeader(second, "완료");
  assert.equal(h1.campaignName, "테스트");
  assert.equal(h2.campaignName, "슈퍼마리오");
  assert.notEqual(h1.campaignName, h2.campaignName);
});
