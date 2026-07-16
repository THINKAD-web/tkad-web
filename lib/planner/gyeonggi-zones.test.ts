import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import { mediaMatchesGyeonggiZones } from "@/lib/planner/gyeonggi-zones";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";

function mockMedia(partial: Partial<MediaItem> & { id: string }): MediaItem {
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    location: partial.location ?? "",
    region: partial.region ?? "gyeonggi",
    regionMain: partial.regionMain ?? "gyeonggi",
    regionSub: partial.regionSub ?? null,
    type: partial.type ?? "digital",
    price: partial.price ?? 100,
    isActive: partial.isActive ?? true,
    ...partial,
  } as MediaItem;
}

test("mediaMatchesGyeonggiZones: anyang zone matches 안양역", () => {
  const m = mockMedia({
    id: "anyang",
    name: "지하철 1호선 안양역 스크린도어 광고",
    location: "경기 안양시 만안구 안양로 281 안양역",
    regionSub: "gyeonggi_anyang",
  });
  assert.equal(mediaMatchesGyeonggiZones(m, ["anyang"]), true);
  assert.equal(mediaMatchesGyeonggiZones(m, ["suwon"]), false);
});

test("mediaMatchesGyeonggiZones: yongin zone matches via regionSub", () => {
  const m = mockMedia({
    id: "yongin",
    name: "약국 와이드 미디어 DS 광고",
    location: "서울, 경기, 인천",
    regionSub: "gyeonggi_yongin",
  });
  assert.equal(mediaMatchesGyeonggiZones(m, ["yongin"]), true);
});

test("mediaMatchesGyeonggiZones: hwaseong zone matches 동탄", () => {
  const m = mockMedia({
    id: "dongtan",
    name: "동탄역 미디어",
    location: "경기 화성시 동탄",
    regionSub: "gyeonggi_hwaseong",
  });
  assert.equal(mediaMatchesGyeonggiZones(m, ["hwaseong"]), true);
});

test("mediaMatchesGyeonggiZones: gwangmyeong zone matches 철산", () => {
  const m = mockMedia({
    id: "cheolsan",
    name: "철산역 광고",
    location: "경기 광명시 철산로 21",
    regionSub: "gyeonggi_gwangmyeong",
  });
  assert.equal(mediaMatchesGyeonggiZones(m, ["gwangmyeong"]), true);
});

test("mediaMatchesGyeonggiZones: existing seongnam unchanged", () => {
  const m = mockMedia({
    id: "bundang",
    name: "판교 빌딩",
    location: "경기 성남시 분당구",
    regionSub: "gyeonggi_seongnam",
  });
  assert.equal(mediaMatchesGyeonggiZones(m, ["seongnam"]), true);
});

test("parsePlannerFreetextBrief: 안양 → anyang gyeonggi", () => {
  const r = parsePlannerFreetextBrief("안양역 브랜딩 프로모션");
  assert.ok(r.fields.regions.value?.includes("gyeonggi"));
  assert.ok(r.fields.gyeonggiZones.value?.includes("anyang"));
});

test("parsePlannerFreetextBrief: 용인 → yongin gyeonggi", () => {
  const r = parsePlannerFreetextBrief("용인 기흥 신규 오픈");
  assert.ok(r.fields.regions.value?.includes("gyeonggi"));
  assert.ok(r.fields.gyeonggiZones.value?.includes("yongin"));
});

test("parsePlannerFreetextBrief: 동탄 → hwaseong gyeonggi", () => {
  const r = parsePlannerFreetextBrief("동탄 화성 매장 홍보");
  assert.ok(r.fields.gyeonggiZones.value?.includes("hwaseong"));
});

test("parsePlannerFreetextBrief: 광명 → gwangmyeong gyeonggi", () => {
  const r = parsePlannerFreetextBrief("광명 철산 프로모션");
  assert.ok(r.fields.gyeonggiZones.value?.includes("gwangmyeong"));
});
