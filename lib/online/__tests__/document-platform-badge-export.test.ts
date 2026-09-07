import test from "node:test";
import assert from "node:assert/strict";
import {
  onlinePlatformBadgePdfColors,
  resolveOnlinePlatformBadgeExportSpec,
} from "@/lib/online/document-platform-badge-export";

test("resolveOnlinePlatformBadgeExportSpec — 네이버 검색광고는 N 이니셜과 단색 배경", () => {
  const spec = resolveOnlinePlatformBadgeExportSpec("Naver Search Ads");
  assert.equal(spec.initial, "N");
  assert.match(spec.backgroundHex, /^#[0-9A-Fa-f]{6}$/);
  assert.match(spec.colorHex, /^#[0-9A-Fa-f]{6}$/);
});

test("onlinePlatformBadgePdfColors — PDF rgb 튜플 반환", () => {
  const colors = onlinePlatformBadgePdfColors("YouTube");
  assert.equal(colors.initial, "YT");
  assert.equal(colors.bg.length, 3);
  assert.equal(colors.text.length, 3);
});
