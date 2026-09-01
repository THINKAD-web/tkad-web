import assert from "node:assert/strict";
import test from "node:test";
import {
  mapQuickAddToDb,
  mediaDbRowToQuickAddJson,
  quickAddJsonWithAliasKeys,
  splitQuickAddInstallLocations,
  validateQuickAddItem,
  type QuickAddMediaJson,
} from "./media-quick-add";

const baseFields = {
  media_name: "테스트 매체",
  description: "",
  sub_category: "디지털사이니지",
  tags: [],
  full_address: "부산광역시 부산진구",
  district: "부산진구",
  city: "부산",
  latitude: null,
  longitude: null,
  price_per_month: 1_000_000,
  price_note: "",
  width_m: null,
  height_m: null,
  resolution: null,
  operating_hours: "",
  daily_footfall: null,
  weekday_footfall: null,
  target_age: "",
  impressions: null,
  reach: null,
  frequency: null,
  cpm: null,
  engagement_rate: null,
  visibility_score: 50,
  effect_memo: "",
  extracted_images: [],
  nearby_facilities: "",
  nearby_stations: "",
  nearby_landmarks: "",
  past_advertisers: "",
};

test("validateQuickAddItem accepts installLocations and install_locations alias", () => {
  const camel = validateQuickAddItem(
    {
      ...baseFields,
      installLocations: [
        {
          label: "A",
          location: "addr-a",
          latitude: 35.1,
          longitude: 129.1,
        },
        {
          label: "B",
          location: "addr-b",
          latitude: 35.3,
          longitude: 129.3,
        },
      ],
    },
    0,
  );
  assert.equal(camel.ok, true);
  if (!camel.ok) return;
  assert.equal(camel.item.installLocations?.length, 2);

  const snake = validateQuickAddItem(
    {
      ...baseFields,
      install_locations: [
        { label: "C", latitude: 35.0, longitude: 129.0 },
      ],
    },
    0,
  );
  assert.equal(snake.ok, true);
  if (!snake.ok) return;
  assert.equal(snake.item.installLocations?.[0]?.label, "C");
});

test("validateQuickAddItem omits installLocations when key absent (no wipe)", () => {
  const r = validateQuickAddItem({ ...baseFields, latitude: 35.1, longitude: 129.1 }, 0);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.item.installLocations, undefined);
});

test("mapQuickAddToDb sets centroid lat/lng from installLocations", () => {
  const item: QuickAddMediaJson = {
    ...baseFields,
    installLocations: [
      { label: "A", latitude: 35.0, longitude: 129.0 },
      { label: "B", latitude: 35.2, longitude: 129.2 },
    ],
  };
  const mapped = mapQuickAddToDb(item);
  assert.equal(mapped.installLocations?.length, 2);
  assert.ok(mapped.latitude != null && mapped.longitude != null);
  assert.ok(Math.abs(mapped.latitude! - 35.1) < 1e-9);
  assert.ok(Math.abs(mapped.longitude! - 129.1) < 1e-9);
});

test("mapQuickAddToDb without installLocations leaves field undefined", () => {
  const mapped = mapQuickAddToDb({
    ...baseFields,
    latitude: 37.5,
    longitude: 127.0,
  });
  assert.equal(mapped.installLocations, undefined);
  assert.equal(mapped.latitude, 37.5);
  assert.equal(mapped.longitude, 127.0);
  assert.equal(splitQuickAddInstallLocations(mapped).installLocations, undefined);
});

test("mediaDbRowToQuickAddJson + alias round-trip includes installs", () => {
  const quick = mediaDbRowToQuickAddJson({
    name: "매체",
    type: "dooh",
    description: null,
    subCategory: null,
    tags: [],
    location: "부산",
    district: null,
    city: "부산",
    latitude: 35.1,
    longitude: 129.1,
    price: 1000,
    priceNote: null,
    widthM: null,
    heightM: null,
    resolution: null,
    operatingHours: null,
    dailyFootfall: null,
    weekdayFootfall: null,
    targetAge: null,
    impressions: null,
    reach: null,
    frequency: null,
    cpm: null,
    engagementRate: null,
    visibilityScore: 0,
    effectMemo: null,
    extractedImages: [],
    nearbyFacilities: null,
    nearbyStations: null,
    nearbyLandmarks: null,
    pastAdvertisers: null,
    installLocations: [
      { label: "지점1", location: "주소1", latitude: 35.0, longitude: 129.0 },
    ],
  });
  assert.equal(quick.installLocations?.length, 1);
  const aliased = quickAddJsonWithAliasKeys(quick);
  assert.deepEqual(aliased.install_locations, quick.installLocations);
});
