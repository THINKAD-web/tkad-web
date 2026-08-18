import assert from "node:assert/strict";
import test from "node:test";
import {
  allocationSourceToExportBadge,
  exportBadgeLabel,
  metricBasisToExportBadge,
} from "@/lib/planner-report-export/export-badge";

test("metricBasisToExportBadge matches DataQualityBadge labels", () => {
  assert.equal(metricBasisToExportBadge("measured"), "measured");
  assert.equal(metricBasisToExportBadge("derived"), "estimated");
  assert.equal(metricBasisToExportBadge("default"), "estimated");
  assert.equal(metricBasisToExportBadge(null), "pending");
  assert.equal(exportBadgeLabel("measured", true), "실측");
  assert.equal(exportBadgeLabel("estimated", true), "추정");
  assert.equal(exportBadgeLabel("pending", true), "산정 중");
});

test("allocationSourceToExportBadge matches AllocationSourceBadge", () => {
  assert.equal(allocationSourceToExportBadge("live"), "measured");
  assert.equal(allocationSourceToExportBadge("benchmark"), "benchmark");
  assert.equal(exportBadgeLabel("benchmark", true), "벤치마크 기반");
});

test("estimated vs benchmark labels differ", () => {
  assert.notEqual(
    exportBadgeLabel("estimated", true),
    exportBadgeLabel("benchmark", true),
  );
});
