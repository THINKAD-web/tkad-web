import assert from "node:assert/strict";
import test from "node:test";
import { caseMatchesMedia } from "@/lib/success-case-media-match";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";

function stubCase(
  overrides: Partial<PublicSuccessCaseListItem> = {},
): PublicSuccessCaseListItem {
  return {
    id: "case-1",
    industry: "Entertainment",
    clientName: "Brand",
    titleKo: "코엑스 DOOH 캠페인",
    titleEn: null,
    summaryKo: "강남 코엑스 일대 집행",
    thumbnailUrl: null,
    mediaUsed: [],
    mediaIds: [],
    publishedAtIso: null,
    periodStartIso: null,
    periodEndIso: null,
    budgetRange: null,
    highlightMetrics: [],
    isExampleScenario: false,
    ...overrides,
  };
}

const ctx = {
  mediaId: "media-kpop",
  location: "코엑스",
  name: "케이팝스퀘어",
};

test("caseMatchesMedia fuzzy-matches place tokens for verified-style cases", () => {
  assert.equal(caseMatchesMedia(stubCase(), ctx), true);
});

test("caseMatchesMedia skips fuzzy match for example scenarios", () => {
  assert.equal(
    caseMatchesMedia(stubCase({ isExampleScenario: true }), ctx),
    false,
  );
});

test("caseMatchesMedia still links example scenarios via mediaIds", () => {
  assert.equal(
    caseMatchesMedia(
      stubCase({ isExampleScenario: true, mediaIds: ["media-kpop"] }),
      ctx,
    ),
    true,
  );
});
