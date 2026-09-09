import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseCustomLineFromText,
  validateCustomLineDraft,
} from "@/lib/admin-campaign-builder/parse-custom-line";

describe("parseCustomLineFromText", () => {
  it("extracts media, budget, dates, and targeting from a brief line", () => {
    const draft = parseCustomLineFromText(
      "네이버 GFA — 3월 1일~3월 31일, 500만원 (20대 여성)",
    );
    assert.equal(draft.mediaName, "네이버 GFA");
    assert.equal(draft.budgetWon, 5_000_000);
    assert.match(draft.startDate ?? "", /^\d{4}-03-01$/);
    assert.match(draft.endDate ?? "", /^\d{4}-03-31$/);
    assert.equal(draft.targeting, "20대 여성");
  });

  it("returns empty draft for blank input", () => {
    assert.deepEqual(parseCustomLineFromText("   "), {});
  });
});

describe("validateCustomLineDraft", () => {
  it("returns dmpilot validation messages", () => {
    const result = validateCustomLineDraft({});
    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, [
      "매체명을 입력하세요.",
      "집행 예산을 입력하세요.",
      "시작일을 입력하세요.",
      "종료일을 입력하세요.",
    ]);
  });

  it("passes when required fields are present", () => {
    const result = validateCustomLineDraft({
      mediaName: "카카오",
      budgetWon: 1_000_000,
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });
});
