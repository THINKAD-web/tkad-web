import assert from "node:assert/strict";
import test from "node:test";
import { resolveAllocationSource } from "@/lib/planner/brief/resolve-allocation-source";

const mix = { meta: { channelType: "integrated" as const } } as never;

test("resolveAllocationSource: loading without prior mix → null", () => {
  assert.equal(
    resolveAllocationSource({ mix: null, mixLoading: true, mixError: null }),
    null,
  );
});

test("resolveAllocationSource: successful mix → live", () => {
  assert.equal(
    resolveAllocationSource({ mix, mixLoading: false, mixError: null }),
    "live",
  );
});

test("resolveAllocationSource: stale mix after NEED_LOGIN refresh → live", () => {
  assert.equal(
    resolveAllocationSource({
      mix,
      mixLoading: false,
      mixError: { ok: false, status: 401, error: "NEED_LOGIN", message: "" },
    }),
    "live",
  );
});

test("resolveAllocationSource: stale mix while refetching → live", () => {
  assert.equal(
    resolveAllocationSource({
      mix,
      mixLoading: true,
      mixError: null,
    }),
    "live",
  );
});

test("resolveAllocationSource: no mix + NEED_LOGIN → benchmark", () => {
  assert.equal(
    resolveAllocationSource({
      mix: null,
      mixLoading: false,
      mixError: { ok: false, status: 401, error: "NEED_LOGIN", message: "" },
    }),
    "benchmark",
  );
});

test("resolveAllocationSource: no mix + RATE_LIMITED → benchmark", () => {
  assert.equal(
    resolveAllocationSource({
      mix: null,
      mixLoading: false,
      mixError: { ok: false, status: 429, error: "RATE_LIMITED", message: "" },
    }),
    "benchmark",
  );
});
