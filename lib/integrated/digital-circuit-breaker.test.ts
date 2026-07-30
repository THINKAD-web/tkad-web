import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  digitalMixCircuitOpenUntilForTests,
  isDigitalMixCircuitOpen,
  recordDigitalMixFailure,
  recordDigitalMixSuccess,
  resetDigitalMixCircuitForTests,
} from "@/lib/integrated/digital-circuit-breaker";

describe("digital mix circuit breaker", () => {
  it("opens after three consecutive 503 failures", () => {
    resetDigitalMixCircuitForTests();
    assert.equal(isDigitalMixCircuitOpen(), false);
    assert.equal(recordDigitalMixFailure(503), false);
    assert.equal(recordDigitalMixFailure(503), false);
    assert.equal(recordDigitalMixFailure(503), true);
    assert.equal(isDigitalMixCircuitOpen(), true);
    assert.ok(digitalMixCircuitOpenUntilForTests() > Date.now());
  });

  it("resets on success", () => {
    resetDigitalMixCircuitForTests();
    recordDigitalMixFailure(503);
    recordDigitalMixFailure(503);
    recordDigitalMixSuccess();
    assert.equal(recordDigitalMixFailure(503), false);
    assert.equal(isDigitalMixCircuitOpen(), false);
  });

  it("4xx client errors reset failure streak", () => {
    resetDigitalMixCircuitForTests();
    recordDigitalMixFailure(503);
    recordDigitalMixFailure(503);
    recordDigitalMixFailure(400);
    assert.equal(recordDigitalMixFailure(503), false);
  });
});
