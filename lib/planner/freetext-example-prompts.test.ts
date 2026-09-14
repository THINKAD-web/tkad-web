import test from "node:test";
import assert from "node:assert/strict";
import {
  FREETEXT_CHIP_PROMPTS_EN,
  FREETEXT_CHIP_PROMPTS_KO,
  FREETEXT_EXAMPLE_PROMPTS_EN,
  FREETEXT_EXAMPLE_PROMPTS_KO,
  pickFreetextExamplePromptsExcluding,
} from "@/lib/planner/freetext-example-prompts";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";

test("pickFreetextExamplePromptsExcluding: no overlap when pool allows", () => {
  const previous = FREETEXT_EXAMPLE_PROMPTS_KO.slice(0, 4);
  const next = pickFreetextExamplePromptsExcluding(
    FREETEXT_EXAMPLE_PROMPTS_KO,
    4,
    42,
    previous,
  );
  assert.equal(next.length, 4);
  for (const item of next) {
    assert.ok(!previous.includes(item));
  }
});

test("pickFreetextExamplePromptsExcluding: deterministic for same seed", () => {
  const previous = ["강남 2030 브랜딩 3000만원"];
  const a = pickFreetextExamplePromptsExcluding(
    FREETEXT_EXAMPLE_PROMPTS_KO,
    4,
    99,
    previous,
  );
  const b = pickFreetextExamplePromptsExcluding(
    FREETEXT_EXAMPLE_PROMPTS_KO,
    4,
    99,
    previous,
  );
  assert.deepEqual(a, b);
});

// ─── 확장된 예시 풀 회귀: 파서 실측 검증 ─────────────────────────────
// site-owner 요청: "확장한 예시 풀을 실제 파서가 전부 정상 처리하는지 회귀 테스트로 확인."

function hasAnySignal(prompt: string): boolean {
  const r = parsePlannerFreetextBrief(prompt);
  return (
    r.fields.campaignGoal.value != null ||
    r.fields.regions.value != null ||
    r.fields.industryKey.value != null ||
    r.fields.budgetMan.value != null
  );
}

test("KO example pool: every entry parses without throwing and yields a signal", () => {
  for (const prompt of FREETEXT_EXAMPLE_PROMPTS_KO) {
    assert.doesNotThrow(() => parsePlannerFreetextBrief(prompt), prompt);
    assert.ok(
      hasAnySignal(prompt),
      `expected at least one of region/industry/budget/goal for: "${prompt}"`,
    );
  }
});

test("EN example pool: every entry parses without throwing and yields a signal", () => {
  for (const prompt of FREETEXT_EXAMPLE_PROMPTS_EN) {
    assert.doesNotThrow(() => parsePlannerFreetextBrief(prompt), prompt);
    assert.ok(
      hasAnySignal(prompt),
      `expected at least one of region/industry/budget/goal for: "${prompt}"`,
    );
  }
});

test("chip prompts are drawn from their respective example pool", () => {
  for (const chip of FREETEXT_CHIP_PROMPTS_KO) {
    assert.ok(
      (FREETEXT_EXAMPLE_PROMPTS_KO as readonly string[]).includes(chip),
      `KO chip not in pool: "${chip}"`,
    );
  }
  for (const chip of FREETEXT_CHIP_PROMPTS_EN) {
    assert.ok(
      (FREETEXT_EXAMPLE_PROMPTS_EN as readonly string[]).includes(chip),
      `EN chip not in pool: "${chip}"`,
    );
  }
});
