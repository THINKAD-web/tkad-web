import assert from "node:assert/strict";
import { test } from "node:test";

/** planner-report-step auto-draft — 편집 중이면 서버/유도 초안으로 덮어쓰지 않음 */
function shouldSkipAutoReportCopyDraft(
  greetingTouched: boolean,
  executiveSummaryTouched: boolean,
): boolean {
  return greetingTouched || executiveSummaryTouched;
}

test("plan cart report — touched greeting/summary blocks auto draft overwrite", () => {
  assert.equal(shouldSkipAutoReportCopyDraft(true, false), true);
  assert.equal(shouldSkipAutoReportCopyDraft(false, true), true);
  assert.equal(shouldSkipAutoReportCopyDraft(false, false), false);
});
