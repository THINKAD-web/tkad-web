import assert from "node:assert/strict";
import test from "node:test";
import {
  guardInsightMarkdownTimeRangeTildes,
  prepareInsightMarkdown,
} from "@/lib/insight-markdown-bold-guard";

test("time range tildes are escaped for markdown", () => {
  assert.equal(
    guardInsightMarkdownTimeRangeTildes("오전 8~10시 피크"),
    "오전 8\\~10시 피크",
  );
});

test("prepareInsightMarkdown applies tilde guard", () => {
  assert.match(prepareInsightMarkdown("피크 8~10시"), /8\\~10/);
});
