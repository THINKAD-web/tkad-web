import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesMediaTextQuery, type MediaItem } from "@/lib/media-data";
import {
  buildPrismaMediaTextSearchWhere,
  collapsedTextContains,
  normalizeSearchText,
} from "@/lib/media-search-text";

function fixture(name: string, extra?: Partial<MediaItem>): MediaItem {
  return {
    id: "test",
    name,
    location: "서울",
    region: "seoul",
    type: "dooh",
    price: 1_000_000,
    mediaCategory: [],
    targetCategory: [],
    ...extra,
  };
}

describe("media search regression", () => {
  const sangjin = fixture("홍대 상진빌딩 전광판 광고");
  const gangnam = fixture("강남역 미디어월");
  const cm = fixture("CM보드 강남");

  const cases: Array<{ q: string; m: MediaItem; expect: boolean }> = [
    { q: "상진빌딩", m: sangjin, expect: true },
    { q: "상진 빌딩", m: sangjin, expect: true },
    { q: "홍대 상진빌딩", m: sangjin, expect: true },
    { q: "홍대상진빌딩", m: sangjin, expect: true },
    { q: "강남역", m: gangnam, expect: true },
    { q: "강남 역", m: gangnam, expect: true },
    { q: "강남역미디어월", m: gangnam, expect: true },
    { q: "강남역 미디어월", m: gangnam, expect: true },
    { q: "CM보드", m: cm, expect: true },
    { q: "CM 보드", m: cm, expect: true },
    { q: "cm보드", m: cm, expect: true },
  ];

  for (const { q, m, expect: ok } of cases) {
    it(`matchesMediaTextQuery "${q}" on ${m.name}`, () => {
      assert.equal(matchesMediaTextQuery(m, q.toLowerCase()), ok);
    });
  }

  it("normalizeSearchText collapses spaces", () => {
    assert.equal(
      normalizeSearchText("홍대 상진 빌딩"),
      normalizeSearchText("홍대상진빌딩"),
    );
  });

  it("collapsedTextContains cross-space", () => {
    assert.equal(
      collapsedTextContains("홍대 상진빌딩 전광판", "홍대상진빌딩"),
      true,
    );
  });

  it("buildPrismaMediaTextSearchWhere uses token AND for multi-word", () => {
    const where = buildPrismaMediaTextSearchWhere("강남 역");
    assert.ok(where);
    assert.ok("AND" in where);
    const and = (where as { AND: unknown[] }).AND;
    assert.equal(and.length, 2);
  });
});
