import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDefaultPlannerReportEmailBody,
  buildPlannerReportEmailCover,
  buildPlannerReportEmailSubject,
} from "@/lib/planner-report-export/email-cover";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";

const basePayload = {
  kind: "ooh",
  isKo: true,
  documentTitle: "강남 런칭 캠페인 제안서",
  clientName: "ACME 코리아",
  generatedAt: "2026-08-23",
  goalTitle: "브랜드 인지도",
  budgetMan: 3000,
  periodDisplay: "3개월",
  regionsText: "강남",
  categoriesText: "옥외",
  ageText: "20-30대",
  industryText: "F&B",
  kpis: [],
  portfolio: [{ name: "매체 A" }],
} as PlannerReportExportPayload;

test("buildDefaultPlannerReportEmailBody includes client and title", () => {
  const body = buildDefaultPlannerReportEmailBody(basePayload);
  assert.match(body, /ACME 코리아/);
  assert.match(body, /강남 런칭 캠페인 제안서/);
});

test("buildPlannerReportEmailSubject uses document title", () => {
  assert.equal(
    buildPlannerReportEmailSubject(basePayload),
    "[THINKAD] 미디어 제안서 - 강남 런칭 캠페인 제안서",
  );
});

test("buildPlannerReportEmailCover respects custom body", () => {
  const cover = buildPlannerReportEmailCover({
    payload: basePayload,
    bodyText: "맞춤 본문입니다.",
  });
  assert.match(cover.text, /맞춤 본문입니다\./);
  assert.match(cover.html, /맞춤 본문입니다\./);
  assert.match(cover.pdfFilename, /\.pdf$/);
  assert.match(cover.subject, /강남 런칭/);
});

test("buildPlannerReportEmailCover defaults body when empty", () => {
  const cover = buildPlannerReportEmailCover({ payload: basePayload });
  assert.match(cover.text, /ACME 코리아/);
  assert.match(cover.text, /첨부:/);
});
