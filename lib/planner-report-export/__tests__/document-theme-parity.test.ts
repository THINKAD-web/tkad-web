import assert from "node:assert/strict";
import test from "node:test";
import {
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

test("chart palette no longer uses legacy amber", () => {
  for (let i = 0; i < 5; i++) {
    const c = plannerChartColor(undefined, i).toUpperCase();
    assert.notEqual(c, "#F59E0B");
  }
});
