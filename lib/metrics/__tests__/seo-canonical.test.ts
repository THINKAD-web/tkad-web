import assert from "node:assert/strict";
import test from "node:test";
import {
  mediaItemDetailPath,
  mediaPublicSlug,
  shouldRedirectMediaIdToSlug,
} from "@/lib/media-slug";
import {
  buildMediaMetaKeywordsList,
  isLocationBoundMedia,
} from "@/lib/media-seo";
import type { MediaItem } from "@/lib/media-data";

// ── ⑤ slug 정규화 + cuid 리다이렉트 (D-17) ─────────────────────

const WITH_SLUG = { id: "cmnzdtqyf0001abcdefghijkl", slug: "euljiro-media-pole" };
const WITHOUT_SLUG = { id: "cmnzdtqyf0002abcdefghijkl", slug: undefined };

test("⑤ canonical 은 항상 slug — cuid 가 아니다", () => {
  assert.equal(mediaItemDetailPath(WITH_SLUG), "/media/euljiro-media-pole");
  assert.equal(mediaPublicSlug(WITH_SLUG), "euljiro-media-pole");
});

test("⑤ slug 가 없으면 cuid 가 canonical (리다이렉트 루프 방지)", () => {
  assert.equal(mediaItemDetailPath(WITHOUT_SLUG), `/media/${WITHOUT_SLUG.id}`);
  assert.equal(shouldRedirectMediaIdToSlug(WITHOUT_SLUG.id, WITHOUT_SLUG), false);
});

test("⑤ cuid 로 들어오면 slug 로 영구 리다이렉트한다", () => {
  assert.equal(shouldRedirectMediaIdToSlug(WITH_SLUG.id, WITH_SLUG), true);
});

test("⑤ 이미 slug 로 들어왔으면 리다이렉트하지 않는다", () => {
  assert.equal(shouldRedirectMediaIdToSlug("euljiro-media-pole", WITH_SLUG), false);
});

// ── ⑥ meta-keywords 오염 (D-18) ────────────────────────────────

function media(o: Partial<MediaItem>): MediaItem {
  return {
    id: "m1",
    name: "테스트 매체",
    location: "서울 중구",
    region: "서울",
    type: "static",
    price: 1_000_000,
    dailyFootTraffic: 10_000,
    tags: [],
    ...o,
  } as MediaItem;
}

test("⑥ 이동형 매체는 위치 파생 키워드를 쓰지 않는다", () => {
  const bus = media({
    id: "bus-1",
    name: "서울 시내버스 외부광고",
    type: "mobile",
    subCategory: "bus_exterior",
    location: "서울 전역",
    // 좌표 기반 자동 수집이 남긴 타 매체 고유명사
    nearbyLandmarks: "롯데백화점 본점, 보비움, 서우당",
    nearbyStations: "을지로입구역, 을지로3가역",
    nearbyFacilities: "AQ테일러, 소셜홀딩스",
  });

  const kws = buildMediaMetaKeywordsList(bus, "ko");
  for (const polluted of [
    "롯데백화점 본점",
    "보비움",
    "서우당",
    "을지로입구역",
    "AQ테일러",
    "소셜홀딩스",
  ]) {
    assert.equal(kws.includes(polluted), false, `혼입 잔존: ${polluted}`);
  }
});

test("⑥ 고정 매체는 주변 시설 키워드를 그대로 유지한다", () => {
  const billboard = media({
    id: "bb-1",
    name: "을지로 미디어폴",
    type: "static",
    subCategory: "media_pole",
    nearbyStations: "을지로입구역",
    nearbyLandmarks: "롯데백화점 본점",
  });
  const kws = buildMediaMetaKeywordsList(billboard, "ko");
  assert.ok(kws.includes("을지로입구역"));
  assert.ok(kws.includes("롯데백화점 본점"));
});

test("⑥ isLocationBoundMedia 판정", () => {
  assert.equal(isLocationBoundMedia({ type: "mobile", subCategory: undefined }), false);
  assert.equal(
    isLocationBoundMedia({ type: "static", subCategory: "bus_exterior" }),
    false,
  );
  assert.equal(
    isLocationBoundMedia({ type: "digital", subCategory: "digital_signage" }),
    true,
  );
  assert.equal(isLocationBoundMedia({ type: "static", subCategory: undefined }), true);
});

test("⑥ 수집기는 순수 — 호출 순서가 결과를 바꾸지 않는다", () => {
  const a = media({ id: "a", name: "A 전광판", tags: ["강남"], nearbyStations: "강남역" });
  const b = media({
    id: "b",
    name: "B 버스",
    type: "mobile",
    subCategory: "bus_exterior",
    nearbyStations: "종로3가역",
  });

  const a1 = buildMediaMetaKeywordsList(a, "ko");
  buildMediaMetaKeywordsList(b, "ko");
  const a2 = buildMediaMetaKeywordsList(a, "ko");
  assert.deepEqual(a1, a2, "이전 호출이 다음 호출에 영향을 줌 = 전역 상태 오염");
});
