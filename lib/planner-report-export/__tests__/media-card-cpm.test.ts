import assert from "node:assert/strict";
import test from "node:test";
import {
  collectMediaCardSpecs,
  formatPlannerExportCpmValue,
} from "@/lib/planner-report-export/media-card-layout";

test("collectMediaCardSpecs always includes CPM for catalog rows", () => {
  const specs = collectMediaCardSpecs(
    {
      name: "테스트",
      cpmWon: 6_667,
      cpmBenchmarkLabel: "이 매체 CPM ₩6,667 — 서울 지하철 …",
    },
    true,
  );
  const cpm = specs.find((s) => s.label === "CPM");
  const bench = specs.find((s) => s.label === "CPM 벤치마크");
  assert.ok(cpm);
  assert.match(cpm.value, /₩/);
  assert.ok(bench);
});

test("collectMediaCardSpecs skips CPM row for custom lines", () => {
  const specs = collectMediaCardSpecs(
    {
      kind: "custom",
      name: "custom",
      metricsUnavailableLabel: "산정 불가",
    },
    true,
  );
  assert.equal(
    specs.find((s) => s.label === "CPM"),
    undefined,
  );
});

test("formatPlannerExportCpmValue uses pending label when null", () => {
  assert.equal(formatPlannerExportCpmValue({ cpmWon: null }, true), "CPM 산정 중");
});
