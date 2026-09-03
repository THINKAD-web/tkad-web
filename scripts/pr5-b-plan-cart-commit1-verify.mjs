#!/usr/bin/env npx tsx
/**
 * PR5-b plan cart commit 1 — payload schema (gate still closed).
 * Usage: node scripts/pr5-b-plan-cart-commit1-verify.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  planCartItemFromCatalog,
  planCartOnlineLineTotalWonSnapshot,
} from "../lib/plan-cart-item-builders.ts";
import { addToPlanCart, clearPlanCart, getPlanCart } from "../lib/plan-cart.ts";
import { canAddMediaToPlanCart } from "../lib/pricing-unavailable.ts";

const goldenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../lib/pricing/__tests__/golden/pr5-online-budget-snapshot.json",
);

if (typeof globalThis.window === "undefined") {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
      removeItem: (k) => {
        store.delete(k);
      },
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

function main() {
  const golden = JSON.parse(readFileSync(goldenPath, "utf8"));
  const sample = golden.media[0];
  assert.ok(sample?.onlineSpec?.minBudget, "golden sample missing minBudget");

  const snapshot = planCartOnlineLineTotalWonSnapshot(sample);
  assert.equal(snapshot, sample.onlineSpec.minBudget);

  const built = planCartItemFromCatalog(
    {
      id: sample.id,
      name: sample.name,
      type: sample.type ?? "online",
      region: "online",
      price: sample.price ?? 0,
      catalogChannel: sample.catalogChannel,
      onlineSpec: sample.onlineSpec,
    },
    "search",
  );
  assert.equal(built.lineTotalWon, sample.onlineSpec.minBudget);
  assert.equal(built.catalogChannel, "online");

  assert.equal(canAddMediaToPlanCart({ catalogChannel: "online" }), false);

  clearPlanCart();
  const blocked = addToPlanCart(built);
  assert.deepEqual(blocked, { ok: false, reason: "online_blocked" });
  assert.equal(getPlanCart().items.length, 0);

  console.log("[PASS] plan cart commit 1 — lineTotalWon snapshot + gate still closed");
}

main();
