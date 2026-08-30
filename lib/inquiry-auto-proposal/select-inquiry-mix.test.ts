import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildInquiryAppendixMediaSpecs,
  isDesignatedInquiryMatch,
  selectInquiryBodyMix,
} from "./select-inquiry-mix";
import type { MatchedProposalMedia } from "./match-and-options";

function match(
  partial: Partial<MatchedProposalMedia> & Pick<MatchedProposalMedia, "id" | "name">,
): MatchedProposalMedia {
  return {
    monthlyWon: 12_000_000,
    matchKind: "named",
    eligible: true,
    reasons: [],
    sellingUnitUndeclared: false,
    cpmWon: 5454,
    mediaClass: "airport",
    ...partial,
  };
}

test("isDesignatedInquiryMatch excludes category expansion", () => {
  assert.equal(isDesignatedInquiryMatch(match({ id: "a", name: "T1", matchKind: "named" })), true);
  assert.equal(isDesignatedInquiryMatch(match({ id: "b", name: "T2", matchKind: "pilot" })), true);
  assert.equal(
    isDesignatedInquiryMatch(match({ id: "c", name: "휴게소", matchKind: "category" })),
    false,
  );
});

test("selectInquiryBodyMix: CPM asc greedy within 30M budget", () => {
  const designated = [
    match({ id: "checkin", name: "체크인", monthlyWon: 25_000_000, cpmWon: 6579 }),
    match({ id: "welcome", name: "웰컴", monthlyWon: 20_000_000, cpmWon: 6667 }),
    match({ id: "t1", name: "T1", monthlyWon: 12_000_000, cpmWon: 5455 }),
    match({ id: "t2", name: "T2", monthlyWon: 12_000_000, cpmWon: 5217 }),
  ];
  const sel = selectInquiryBodyMix({
    designated,
    budgetWon: 30_000_000,
    months: 1,
  });
  assert.deepEqual(sel.mixUnits, { t2: 1, t1: 1 });
  assert.equal(sel.bodyTotalWon, 24_000_000);
});

test("buildInquiryAppendixMediaSpecs lists all designated with status notes", () => {
  const designated = [
    match({ id: "t1", name: "T1", eligible: true, cpmWon: 5455 }),
    match({
      id: "pkg",
      name: "Package",
      eligible: false,
      reasons: ["cpm_class_bounds"],
      cpmWon: 4444,
    }),
    match({
      id: "checkin",
      name: "체크인",
      eligible: true,
      monthlyWon: 25_000_000,
      cpmWon: 6579,
    }),
  ];
  const specs = buildInquiryAppendixMediaSpecs({
    designated,
    selectedIds: new Set(["t1"]),
    catalogById: new Map([
      [
        "t1",
        {
          id: "t1",
          name: "T1",
          isActive: true,
          reviewStatus: "clean",
          type: "digital",
          mediaSubCategory: "airport",
          price: 12_000_000,
          impressions: 2_000_000,
          dailyFootfall: 80_000,
          location: "인천 T1",
          item: { id: "t1", name: "T1", location: "인천 T1" } as never,
        },
      ],
    ]),
    namedNeedles: ["T1", "Package", "체크인"],
    isKo: true,
  });
  assert.equal(specs.length, 3);
  assert.equal(specs.find((s) => s.id === "t1")?.inBody, true);
  assert.equal(specs.find((s) => s.id === "t1")?.statusNote, "—");
  assert.equal(specs.find((s) => s.id === "pkg")?.inBody, false);
  assert.ok(specs.find((s) => s.id === "pkg")?.statusNote.includes("CPM 기준 이탈"));
  assert.ok(specs.find((s) => s.id === "checkin")?.statusNote.includes("예산 내 포함 불가"));
});
