import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INVENTORY_SNAPSHOT_DISCLAIMER_KO,
  parseCatalogListingNotices,
  withInventoryDisclaimer,
  withListingPendingSection,
} from "./catalog-listing-pending";

const REAL_CASE = `희망 매체: 택배차량 광고, 지하철 광고(지하철 있는 지역만), 시외버스터미널 광고,
          시외·고속버스터미널 광고, 기차역/KTX역 역사 광고, 버스 정류장 광고`;

test("parseCatalogListingNotices: pending + partial, not available", () => {
  const notices = parseCatalogListingNotices(REAL_CASE);
  const kinds = notices.map((n) => n.kind);
  assert.ok(kinds.includes("intercity_bus_terminal"));
  assert.ok(kinds.includes("express_bus_terminal"));
  assert.ok(kinds.includes("delivery_vehicle"));
  assert.ok(kinds.includes("train_station"));
  assert.ok(!kinds.includes("subway"));
  assert.ok(!kinds.includes("bus_shelter"));

  const pending = notices.find((n) => n.kind === "intercity_bus_terminal")!;
  assert.equal(pending.status, "pending");
  assert.match(pending.lineKo, /입점대기/);
  assert.match(pending.lineKo, /시외버스터미널/);

  const partial = notices.find((n) => n.kind === "express_bus_terminal")!;
  assert.equal(partial.status, "partial");
  assert.match(partial.lineKo, /일부만 매칭/);
  assert.match(partial.lineKo, /입점대기/);
});

test("withListingPendingSection appends 입점대기 block", () => {
  const payload = withListingPendingSection(
    { sections: [{ title: "전략 요약", lines: ["기존"] }] },
    "시외버스터미널 광고",
    true,
  );
  assert.equal(payload.sections?.length, 2);
  assert.equal(payload.sections?.[1]?.title, "입점대기 매체");
  assert.match(payload.sections?.[1]?.lines[0] ?? "", /입점대기/);
});

test("withInventoryDisclaimer appends once", () => {
  const base =
    "노출·도달은 THINKAD 내부 추정 모델 기반이며, 실제 집행 시 매체 재고·계약 조건에 따라 달라질 수 있습니다.";
  const once = withInventoryDisclaimer(base, true);
  assert.match(once, /작성 시점 기준/);
  assert.match(once, /입점 현황/);
  const twice = withInventoryDisclaimer(once, true);
  assert.equal(twice, once);
  assert.equal(
    twice.split(INVENTORY_SNAPSHOT_DISCLAIMER_KO).length - 1,
    1,
  );
});
