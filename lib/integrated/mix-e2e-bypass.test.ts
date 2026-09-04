import assert from "node:assert/strict";
import test from "node:test";
import {
  INTEGRATED_MIX_E2E_BYPASS_HEADER,
  isIntegratedMixE2eBypass,
} from "@/lib/integrated/mix-e2e-bypass";

test("isIntegratedMixE2eBypass: false when secret unset", () => {
  const prev = process.env.TKAD_E2E_MIX_BYPASS_SECRET;
  delete process.env.TKAD_E2E_MIX_BYPASS_SECRET;
  try {
    const req = new Request("http://localhost/api/integrated/mix", {
      headers: { [INTEGRATED_MIX_E2E_BYPASS_HEADER]: "any" },
    });
    assert.equal(isIntegratedMixE2eBypass(req), false);
  } finally {
    if (prev !== undefined) process.env.TKAD_E2E_MIX_BYPASS_SECRET = prev;
  }
});

test("isIntegratedMixE2eBypass: true when header matches secret", () => {
  const prev = process.env.TKAD_E2E_MIX_BYPASS_SECRET;
  process.env.TKAD_E2E_MIX_BYPASS_SECRET = "test-secret";
  try {
    const req = new Request("http://localhost/api/integrated/mix", {
      headers: { [INTEGRATED_MIX_E2E_BYPASS_HEADER]: "test-secret" },
    });
    assert.equal(isIntegratedMixE2eBypass(req), true);
  } finally {
    if (prev !== undefined) process.env.TKAD_E2E_MIX_BYPASS_SECRET = prev;
    else delete process.env.TKAD_E2E_MIX_BYPASS_SECRET;
  }
});
