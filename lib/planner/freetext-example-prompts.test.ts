import test from "node:test";
import assert from "node:assert/strict";
import {
  FREETEXT_EXAMPLE_PROMPTS_KO,
  pickFreetextExamplePromptsExcluding,
} from "@/lib/planner/freetext-example-prompts";

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
