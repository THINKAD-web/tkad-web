import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import {
  mediaMatchesIncheonZones,
  suggestIncheonZones,
} from "@/lib/planner/incheon-zones";
import {
  buildScenarioPatchFromFreetextParse,
  parsePlannerFreetextBrief,
} from "@/lib/planner/parse-freetext-brief";

function mockMedia(partial: Partial<MediaItem> & { id: string }): MediaItem {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    location: partial.location ?? "",
    region: partial.region ?? "incheon",
    regionMain: partial.regionMain ?? "incheon",
    regionSub: partial.regionSub ?? null,
    type: partial.type ?? "digital",
    price: partial.price ?? 100,
    isActive: partial.isActive ?? true,
    ...partial,
  } as MediaItem;
}

test("mediaMatchesIncheonZones: airport zone matches terminal media", () => {
  const m = mockMedia({
    id: "t1",
    name: "인천국제공항 제1터미널 체크인 스퀘어 광고",
    regionSub: "incheon_airport",
  });
  assert.equal(mediaMatchesIncheonZones(m, ["airport"]), true);
  assert.equal(mediaMatchesIncheonZones(m, ["songdo"]), false);
});

test("mediaMatchesIncheonZones: songdo zone matches 송도 media", () => {
  const m = mockMedia({
    id: "songdo",
    name: "인천 송도 트리플스트리트 미디어터널 광고",
    regionSub: "incheon_songdo",
  });
  assert.equal(mediaMatchesIncheonZones(m, ["songdo"]), true);
  assert.equal(mediaMatchesIncheonZones(m, ["airport"]), false);
});

test("mediaMatchesIncheonZones: downtown matches 부평", () => {
  const m = mockMedia({
    id: "bupyeong",
    name: "인천 부평 에이플러스에셋빌딩 전광판 광고",
    location: "인천 부평구 부평대로 16",
    regionSub: "incheon_downtown",
  });
  assert.equal(mediaMatchesIncheonZones(m, ["downtown"]), true);
});

test("mediaMatchesIncheonZones: network limousine pass-through on airport filter", () => {
  const m = mockMedia({
    id: "limo",
    name: "도심공항 리무진버스 내부동영상 광고",
    regionSub: "incheon_airport",
  });
  assert.equal(mediaMatchesIncheonZones(m, ["songdo"]), true);
});

test("mediaMatchesIncheonZones: airbusan in-flight pass-through", () => {
  const m = mockMedia({
    id: "airbusan",
    name: "에어부산 기내 윈도우 미디어 광고",
    regionSub: "incheon_airport",
  });
  assert.equal(mediaMatchesIncheonZones(m, ["downtown"]), true);
});

test("mediaMatchesIncheonZones: 검단 is downtown not airport", () => {
  const m = mockMedia({
    id: "geomdan",
    name: "인천 검단 라페온 빌딩 벽면 광고",
    location: "인천광역시 서구 원당대로 1029",
    regionSub: "incheon_downtown",
  });
  assert.equal(mediaMatchesIncheonZones(m, ["downtown"]), true);
  assert.equal(mediaMatchesIncheonZones(m, ["airport"]), false);
});

test("suggestIncheonZones: event → airport + songdo", () => {
  assert.deepEqual(suggestIncheonZones("event", "indOther"), [
    "airport",
    "songdo",
  ]);
});

test("parsePlannerFreetextBrief: 인천공항 → incheon airport zone", () => {
  const r = parsePlannerFreetextBrief("인천공항 브랜딩 프로모션");
  assert.ok(r.fields.regions.value?.includes("incheon"));
  assert.ok(r.fields.incheonZones.value?.includes("airport"));
});

test("parsePlannerFreetextBrief: 송도 → incheon songdo zone", () => {
  const r = parsePlannerFreetextBrief("송도 신규 오픈 홍보");
  assert.ok(r.fields.regions.value?.includes("incheon"));
  assert.ok(r.fields.incheonZones.value?.includes("songdo"));
});

test("buildScenarioPatchFromFreetextParse: incheon zone only → incheon region", () => {
  const r = parsePlannerFreetextBrief("인천공항 런칭");
  const patch = buildScenarioPatchFromFreetextParse(r);
  assert.ok(patch.regions.includes("incheon"));
  assert.ok(patch.incheonZones?.includes("airport"));
});
