import assert from "node:assert/strict";
import test from "node:test";
import {
  packCampaignPlanBriefJson,
  unpackCampaignPlanBriefJson,
} from "@/lib/campaign-plan-report-copy";
import type { CampaignPlanBrief } from "@/lib/campaign-plan-schema";

const sampleBrief: CampaignPlanBrief = {
  budgetWon: 10_000_000,
  regionCodes: ["11"],
  flightStart: "2026-01-01",
  flightEnd: "2026-01-31",
};

test("campaign plan reportCopy — pack/unpack roundtrip", () => {
  const reportCopy = {
    clientName: "OO브랜드",
    documentTitle: "제안서",
    coverLogoUrl: "https://cdn.example/logo.png",
    greeting: "안녕하세요.",
    executiveSummary: "요약",
    greetingTouched: true,
    executiveSummaryTouched: false,
    copyFingerprint: "fp1",
  };
  const packed = packCampaignPlanBriefJson(sampleBrief, reportCopy);
  const unpacked = unpackCampaignPlanBriefJson(packed);
  assert.deepEqual(unpacked.brief, sampleBrief);
  assert.equal(unpacked.reportCopy?.clientName, "OO브랜드");
});

test("campaign plan reportCopy — legacy brief without key", () => {
  const unpacked = unpackCampaignPlanBriefJson(sampleBrief);
  assert.deepEqual(unpacked.brief, sampleBrief);
  assert.equal(unpacked.reportCopy, null);
});
