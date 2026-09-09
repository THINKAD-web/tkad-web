import assert from "node:assert/strict";
import test from "node:test";
import {
  assembleCampaignReportPreviewData,
  campaignCompletionReportHref,
  campaignNotesAsProposalPaste,
} from "@/lib/admin-campaign-completion-client";

test("completion-report href matches campaigns 3-button", () => {
  assert.equal(
    campaignCompletionReportHref("abc"),
    "/api/admin/campaigns/abc/completion-report?style=brand",
  );
});

test("completion-report href forwards hub style", () => {
  assert.equal(
    campaignCompletionReportHref("abc", "minimal"),
    "/api/admin/campaigns/abc/completion-report?style=minimal",
  );
  assert.equal(
    campaignCompletionReportHref("abc", "corporate"),
    "/api/admin/campaigns/abc/completion-report?style=corporate",
  );
  assert.equal(
    campaignCompletionReportHref("abc", "nope"),
    "/api/admin/campaigns/abc/completion-report?style=brand",
  );
});

test("preview header still comes from selected campaign, not a form leftover", () => {
  const data = assembleCampaignReportPreviewData({
    campaign: {
      id: "b",
      name: "슈퍼마리오",
      clientCompany: "웹스",
      clientName: "이재한",
      clientEmail: "jaehan@example.com",
      status: "completed",
      notes: "메모",
    },
    statusLabel: "완료",
    proofPhotos: [{ imageUrl: "https://x/p.jpg", caption: "증빙" }],
    includeImages: true,
  });
  assert.equal(data.campaignName, "슈퍼마리오");
  assert.equal(data.clientCompany, "웹스");
  assert.equal(data.proofPhotos?.[0]?.imageUrl, "https://x/p.jpg");
});

test("includeImages false drops proof photos only", () => {
  const data = assembleCampaignReportPreviewData({
    campaign: {
      id: "b",
      name: "슈퍼마리오",
      clientCompany: "웹스",
      clientName: "이재한",
      clientEmail: "jaehan@example.com",
      status: "completed",
    },
    statusLabel: "완료",
    proofPhotos: [{ imageUrl: "https://x/p.jpg" }],
    includeImages: false,
  });
  assert.deepEqual(data.proofPhotos, []);
});

test("campaign notes become proposal paste without inventing mix logic", () => {
  const text = campaignNotesAsProposalPaste({
    name: "강남 캠페인",
    clientCompany: "웹스",
    notes: "강남 2030 브랜딩 3000만원",
  });
  assert.match(text, /강남 캠페인/);
  assert.match(text, /강남 2030/);
});
