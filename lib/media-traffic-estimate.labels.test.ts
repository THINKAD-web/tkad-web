import assert from "node:assert/strict";
import { test } from "node:test";
import {
  trafficMonthAxisLabel,
  trafficMonthTooltipSuffix,
  trafficWeekdayChartLabel,
} from "@/lib/media-traffic-estimate";

test("trafficMonthAxisLabel — ko uses numeric month", () => {
  assert.equal(trafficMonthAxisLabel(0, "ko"), "1");
  assert.equal(trafficMonthAxisLabel(11, "ko-KR"), "12");
});

test("trafficMonthAxisLabel — en uses short month name", () => {
  const jan = trafficMonthAxisLabel(0, "en");
  assert.match(jan, /Jan/i);
});

test("trafficMonthTooltipSuffix — ko only", () => {
  assert.equal(trafficMonthTooltipSuffix("ko"), "월");
  assert.equal(trafficMonthTooltipSuffix("en"), "");
});

test("trafficWeekdayChartLabel — ja locale", () => {
  const mon = trafficWeekdayChartLabel(0, "ja");
  assert.ok(mon.length > 0);
  assert.notEqual(mon, "Mon");
});
