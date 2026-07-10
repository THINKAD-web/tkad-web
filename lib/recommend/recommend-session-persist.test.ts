import test from "node:test";
import assert from "node:assert/strict";
import {
  RECOMMEND_SESSION_STORAGE_KEY,
  readRecommendSessionSnapshot,
  writeRecommendSessionSnapshot,
  type RecommendSessionSnapshot,
} from "@/lib/recommend/recommend-session-persist";

test("recommend session v2: legacy v1 key is not restored", () => {
  const store = new Map<string, string>();
  const g = globalThis as typeof globalThis & {
    window?: { sessionStorage: Storage };
  };
  const prev = g.window;
  g.window = {
    sessionStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
      removeItem: (k) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    },
  };

  try {
    store.set(
      "tkad_recommend_session_v1",
      JSON.stringify({
        v: 1,
        phase: "dashboard",
        inputMode: "ai",
        lastPayload: { input: {}, regionCodes: [], searchQuery: "" },
        scored: [{ mediaId: "x", score: 90, reasons: [] }],
        analysisSeed: 0,
        recommendQuantities: {},
        recommendPriceOptionIndex: {},
        savedAt: Date.now(),
      }),
    );

    assert.equal(readRecommendSessionSnapshot(), null);
    assert.equal(store.has("tkad_recommend_session_v1"), false);

    const snap: RecommendSessionSnapshot = {
      v: 2,
      phase: "dashboard",
      inputMode: "ai",
      lastPayload: { input: {}, regionCodes: [], searchQuery: "" },
      scored: [
        {
          mediaId: "y",
          score: 95,
          reasons: [],
          rationaleLines: [{ ko: "테스트 근거", en: "Test reason" }],
        },
      ],
      analysisSeed: 0,
      recommendQuantities: {},
      recommendPriceOptionIndex: {},
      savedAt: Date.now(),
    };
    writeRecommendSessionSnapshot(snap);
    assert.equal(store.get(RECOMMEND_SESSION_STORAGE_KEY)?.includes('"v":2'), true);
    const restored = readRecommendSessionSnapshot();
    assert.equal(restored?.scored[0]?.rationaleLines?.[0]?.ko, "테스트 근거");
  } finally {
    if (prev === undefined) delete g.window;
    else g.window = prev;
  }
});
