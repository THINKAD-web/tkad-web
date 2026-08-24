import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePlanDisplayInfo } from "../subscription-plan-display.ts";

test("FREE user gets LITE upgrade link", () => {
  const info = resolvePlanDisplayInfo({ plan: "FREE" }, null, true);
  assert.equal(info.upgradeHref, "/pricing#lite-upgrade");
  assert.equal(info.planLabel, "FREE");
});

test("PRO_TRIAL shows expiry from trialEndsAt", () => {
  const info = resolvePlanDisplayInfo(
    {
      plan: "PRO_TRIAL",
      trialEndsAt: "2026-09-01T00:00:00.000Z",
      trialDaysLeft: 7,
    },
    null,
    true,
  );
  assert.match(info.expiryLabel ?? "", /체험 만료/);
});
