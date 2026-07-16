import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { mediaMatchesSeoulZones } from "@/lib/planner/seoul-zones";
import {
  buildScenarioPatchFromFreetextParse,
  parsePlannerFreetextBrief,
} from "@/lib/planner/parse-freetext-brief";

function mockMedia(partial: Partial<MediaItem> & { id: string }): MediaItem {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    location: partial.location ?? "",
    region: partial.region ?? "seoul",
    regionMain: partial.regionMain ?? "seoul",
    regionSub: partial.regionSub ?? null,
    type: partial.type ?? "digital",
    price: partial.price ?? 100,
    isActive: partial.isActive ?? true,
    ...partial,
  } as MediaItem;
}

test("mediaMatchesSeoulZones: guro zone matches 구로·가산 media", () => {
  const m = mockMedia({
    id: "guro1",
    name: "구로 경동나비엔 전광판 광고",
    location: "서울 구로구 경인로53길 15",
    regionSub: "seoul_guro",
  });
  assert.equal(mediaMatchesSeoulZones(m, ["guro"]), true);
  assert.equal(mediaMatchesSeoulZones(m, ["yeouido"]), false);
});

test("mediaMatchesSeoulZones: jamsil zone matches 강동·천호 media", () => {
  const m = mockMedia({
    id: "jamsil1",
    name: "천호대로 강동빌딩 전광판 광고",
    location: "서울 강동구 천호동 453-15",
    regionSub: "seoul_jamsil",
  });
  assert.equal(mediaMatchesSeoulZones(m, ["jamsil"]), true);
  assert.equal(mediaMatchesSeoulZones(m, ["gangnam"]), false);
});

test("mediaMatchesSeoulZones: gangbuk zone matches 노원·상봉 media", () => {
  const m = mockMedia({
    id: "nowon1",
    name: "노원역 지하철 7호선 CM보드",
    location: "서울 노원구 상계로 193 노원역 대합실",
    regionSub: "seoul_gangbuk",
  });
  assert.equal(mediaMatchesSeoulZones(m, ["gangbuk"]), true);
  assert.equal(mediaMatchesSeoulZones(m, ["gangnam"]), false);
});

test("mediaMatchesSeoulZones: gangseo zone matches 목동 media", () => {
  const m = mockMedia({
    id: "mokdong1",
    name: "목동역 지하철 5호선 CM보드",
    location: "서울 양천구 목동로 343 목동역 대합실",
    regionSub: "seoul_yeongdeungpo",
  });
  assert.equal(mediaMatchesSeoulZones(m, ["gangseo"]), true);
  assert.equal(mediaMatchesSeoulZones(m, ["yeouido"]), false);
});

test("mediaMatchesSeoulZones: 관악·사당 absorbed into gangnam adjacent", () => {
  const m = mockMedia({
    id: "sadang1",
    name: "사당역 삼진빌딩 전광판 광고",
    location: "서울 관악구 남부순환로 2082-25",
    regionSub: "seoul_gangnam",
  });
  assert.equal(mediaMatchesSeoulZones(m, ["gangnam"]), true);
});

test("mediaMatchesSeoulZones: misclassified 철산역 excluded from seoul zones", () => {
  const m = mockMedia({
    id: "cheolsan",
    name: "철산역 지하철 7호선 CM보드",
    location: "경기 광명시 철산로 21 철산역 대합실",
    regionSub: "seoul_guro",
  });
  assert.equal(mediaMatchesSeoulZones(m, ["guro"]), false);
  assert.equal(mediaMatchesSeoulZones(m, ["yeouido"]), false);
});

test("mediaMatchesSeoulZones: misclassified 부평역 excluded", () => {
  const m = mockMedia({
    id: "bupyeong",
    name: "지하철 1호선 부평역 스크린도어 광고",
    location: "인천 부평구 광장로 16 부평역",
    regionMain: "seoul",
  });
  assert.equal(mediaMatchesSeoulZones(m, ["gangnam"]), false);
});

test("mediaMatchesSeoulZones: misclassified 검암역 excluded", () => {
  const m = mockMedia({
    id: "geomam",
    name: "공항철도 검암역 개찰구 래핑 광고",
    location: "인천 서구 검암로 123 검암역",
    regionMain: "seoul",
    regionSub: "seoul_itaewon",
  });
  assert.equal(mediaMatchesSeoulZones(m, ["myeongdong"]), false);
});

test("mediaMatchesSeoulZones: legacy region bypass for non-seoul media", () => {
  const m = mockMedia({
    id: "busan1",
    name: "부산 해운대",
    region: "busan",
    regionMain: "busan",
    location: "부산 해운대",
  });
  assert.equal(mediaMatchesSeoulZones(m, ["gangnam"]), true);
});

test("mediaMatchesSeoulZones: gangnam core matching preserved", () => {
  const m = mockMedia({
    id: "gn",
    name: "강남 테헤란 타워",
    location: "서울 강남구 테헤란로",
  });
  assert.equal(mediaMatchesSeoulZones(m, ["gangnam"]), true);
  assert.equal(mediaMatchesSeoulZones(m, ["guro"]), false);
});

test("parsePlannerFreetextBrief: 구로 → guro zone", () => {
  const r = parsePlannerFreetextBrief("구로 디지털단지 브랜딩");
  assert.ok(r.fields.regions.value?.includes("seoul"));
  assert.ok(r.fields.seoulZones.value?.includes("guro"));
});

test("parsePlannerFreetextBrief: 강동 → jamsil zone", () => {
  const r = parsePlannerFreetextBrief("강동 천호 신규 오픈");
  assert.ok(r.fields.seoulZones.value?.includes("jamsil"));
});

test("parsePlannerFreetextBrief: 노원 → gangbuk zone", () => {
  const r = parsePlannerFreetextBrief("노원 상계 프로모션");
  assert.ok(r.fields.seoulZones.value?.includes("gangbuk"));
});

test("parsePlannerFreetextBrief: 목동 → gangseo zone", () => {
  const r = parsePlannerFreetextBrief("목동 양천 매장 홍보");
  assert.ok(r.fields.seoulZones.value?.includes("gangseo"));
});

test("buildScenarioPatchFromFreetextParse: guro zone only → seoul region", () => {
  const r = parsePlannerFreetextBrief("구로 가산 런칭");
  const patch = buildScenarioPatchFromFreetextParse(r);
  assert.ok(patch.regions.includes("seoul"));
  assert.ok(patch.seoulZones?.includes("guro"));
});
