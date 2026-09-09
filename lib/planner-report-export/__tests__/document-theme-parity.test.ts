import assert from "node:assert/strict";
import test from "node:test";
import {
  campaignReportPdfPalette,
  campaignReportPreviewColors,
  getReportDocumentTheme,
  parsePlannerReportStyle,
  PLANNER_REPORT_STYLES,
} from "@/lib/planner-report-export/document-theme";
import { plannerChartColor } from "@/lib/planner-chart-colors";

test("parsePlannerReportStyle falls back to brand", () => {
  assert.equal(parsePlannerReportStyle(undefined), "brand");
  assert.equal(parsePlannerReportStyle("minimal"), "minimal");
  assert.equal(parsePlannerReportStyle("invalid"), "brand");
});

test("all report styles expose pdf and pptx accent", () => {
  for (const style of PLANNER_REPORT_STYLES) {
    const theme = getReportDocumentTheme(style);
    assert.ok(theme.accent.startsWith("#"));
    assert.equal(theme.pdf.accentRgb.length, 3);
    assert.ok(theme.pptx.accent.length >= 6);
  }
});

test("brand style uses deep teal accent", () => {
  const theme = getReportDocumentTheme("brand");
  assert.equal(theme.accent.toUpperCase(), "#0D9488");
});

test("campaign completion palette drops legacy orange", () => {
  for (const style of PLANNER_REPORT_STYLES) {
    const pdf = campaignReportPdfPalette(style);
    const preview = campaignReportPreviewColors(style);
    assert.notDeepEqual(pdf.accent, [255, 102, 0]);
    assert.notEqual(preview.accent.toUpperCase(), "#FF6600");
    assert.equal(preview.accent.toUpperCase(), "#0D9488");
    assert.deepEqual(pdf.accent, [13, 148, 136]);
  }
  const brand = campaignReportPdfPalette("brand");
  assert.deepEqual(brand.coverBg, brand.ink);
  const minimal = campaignReportPdfPalette("minimal");
  assert.deepEqual(minimal.coverBg, [255, 255, 255]);
  assert.notDeepEqual(minimal.coverText, [255, 255, 255]);
});

test("chart palette no longer uses legacy amber", () => {
  for (let i = 0; i < 5; i++) {
    const c = plannerChartColor(undefined, i).toUpperCase();
    assert.notEqual(c, "#F59E0B");
  }
});
