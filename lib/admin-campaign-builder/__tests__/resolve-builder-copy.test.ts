import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultBuilderSectionTitles,
  resolveBuilderSectionCopy,
  resolveBuilderSectionNotices,
  resolveBuilderSectionTitles,
} from "@/lib/admin-campaign-builder/resolve-builder-copy";

describe("resolveBuilderSectionCopy", () => {
  it("returns defaults when override is absent", () => {
    const resolved = resolveBuilderSectionCopy("proposal", true);
    assert.equal(resolved.titles.digital, "디지털 채널 제안");
    assert.equal(resolved.titles.ooh, "OOH 매체");
    assert.ok(resolved.notices.digitalEstimateNotice.length > 0);
  });

  it("merges partial section title overrides", () => {
    const resolved = resolveBuilderSectionTitles("proposal", true, {
      sectionTitles: { digital: "커스텀 디지털 제목" },
    });
    assert.equal(resolved.digital, "커스텀 디지털 제목");
    assert.equal(resolved.ooh, "OOH 매체");
  });

  it("merges partial section notice overrides", () => {
    const resolved = resolveBuilderSectionNotices("report", {
      sectionNotices: { insightsHint: "커스텀 힌트" },
    });
    assert.equal(resolved.insightsHint, "커스텀 힌트");
    assert.ok(resolved.executionNotice.length > 0);
  });

  it("uses report section numbering aligned with render order", () => {
    const titles = defaultBuilderSectionTitles("report", true);
    assert.equal(titles.digital, "① 디지털 채널 (참고)");
    assert.equal(titles.custom, "③ 집행 내역");
    assert.equal(titles.ooh, "② OOH 매체");
  });

  it("returns default insight subtitles when override is absent", () => {
    const resolved = resolveBuilderSectionCopy("proposal", true);
    assert.equal(resolved.insightSubtitles.pacing, "소진 페이스");
    assert.equal(resolved.insightSubtitles.creative, "소재 방향");
    assert.equal(resolved.insightSubtitles.operational, "운영 메모");
  });

  it("merges partial insight subtitle overrides", () => {
    const resolved = resolveBuilderSectionCopy("proposal", true, {
      insightSubtitles: { pacing: "커스텀 페이스" },
    });
    assert.equal(resolved.insightSubtitles.pacing, "커스텀 페이스");
    assert.equal(resolved.insightSubtitles.creative, "소재 방향");
    assert.equal(resolved.insightSubtitles.operational, "운영 메모");
  });
});
