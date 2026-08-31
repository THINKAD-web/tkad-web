import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCompoundVehicleFace,
  parseExplicitVehicleCounts,
  resolveR01PerUnitTraffic,
} from "../r01-per-unit-traffic.ts";

const GBUS_DESC =
  "G버스 TV는 경기도 및 서울, 인천을 통과하는 버스 내부에 설치된 23인치 디지털 영상광고 매체입니다. 하루 약 423만 명의 승객이 이용하는 대중교통 광고로, 8,000대의 버스에 2면씩 총 16,000면이 운영됩니다.";

test("parseCompoundVehicleFace — G버스 8,000대 (면 아닌 대 기준)", () => {
  const c = parseCompoundVehicleFace(GBUS_DESC);
  assert.ok(c);
  assert.equal(c.vehicleCount, 8000);
  assert.equal(c.facesPerVehicle, 2);
});

test("resolveR01PerUnitTraffic — G버스 vehicle 529/대·일", () => {
  const r = resolveR01PerUnitTraffic({
    mediaClass: "bus_exterior",
    dailyFootfall: 4_230_000,
    description: GBUS_DESC,
    priceNote: null,
  });
  assert.equal(r.track, "evidence_parsed");
  assert.equal(r.confidence, "confirmed");
  if (r.track === "evidence_parsed") {
    assert.equal(r.proposedDailyFootfall, 529);
    assert.equal(r.proposedSellingUnit, "vehicle");
  }
});

test("면/구좌만 있고 대 없으면 Track D", () => {
  const r = resolveR01PerUnitTraffic({
    mediaClass: "bus_exterior",
    dailyFootfall: 868_000,
    description: "16구좌로 운영되는 아트캔버스",
    priceNote: null,
  });
  assert.equal(r.track, "excluded_track_d");
});

test("좌우측면 오탐 — 차량 수 없으면 fallback", () => {
  const r = resolveR01PerUnitTraffic({
    mediaClass: "bus_exterior",
    dailyFootfall: 460_000,
    description:
      "버스 좌우측면(차도면+인도면) 및 후면 래핑을 통해 도심 주요 도로",
    priceNote: null,
  });
  assert.equal(r.track, "fallback_estimate");
});

test("parseExplicitVehicleCounts — 5,000대", () => {
  const v = parseExplicitVehicleCounts("서울 시내 5,000대 버스 TV");
  assert.equal(v[0]?.count, 5000);
});
