import assert from "node:assert/strict";
import test from "node:test";

import { useBriefStore } from "../store.ts";

test("over-budget store: Option B dismisses banner without changing mix", () => {
  useBriefStore.setState({
    mixUnits: { a: 1, b: 2 },
    overBudgetChoiceDismissed: false,
    mixUndoBeforeOptionA: null,
  });
  useBriefStore.getState().dismissOverBudgetChoice();
  const s = useBriefStore.getState();
  assert.equal(s.overBudgetChoiceDismissed, true);
  assert.deepEqual(s.mixUnits, { a: 1, b: 2 });
});

test("over-budget store: Option A replaces mix and supports undo", () => {
  useBriefStore.setState({
    mixUnits: { pricey: 1, extra: 1 },
    overBudgetChoiceDismissed: false,
    mixUndoBeforeOptionA: null,
  });
  useBriefStore.getState().applyOverBudgetOptionA([
    { mediaId: "cheap", units: 1 },
  ]);
  let s = useBriefStore.getState();
  assert.deepEqual(s.mixUnits, { cheap: 1 });
  assert.deepEqual(s.mixUndoBeforeOptionA, { pricey: 1, extra: 1 });

  useBriefStore.getState().restoreMixBeforeOptionA();
  s = useBriefStore.getState();
  assert.deepEqual(s.mixUnits, { pricey: 1, extra: 1 });
  assert.equal(s.mixUndoBeforeOptionA, null);
  assert.equal(s.overBudgetChoiceDismissed, false);
});

test("over-budget store: manual mix edit clears dismiss + undo", () => {
  useBriefStore.setState({
    mixUnits: { a: 1 },
    overBudgetChoiceDismissed: true,
    mixUndoBeforeOptionA: { b: 1 },
  });
  useBriefStore.getState().addMediaToMix("c", 1);
  const s = useBriefStore.getState();
  assert.equal(s.overBudgetChoiceDismissed, false);
  assert.equal(s.mixUndoBeforeOptionA, null);
  assert.equal(s.mixUnits.c, 1);
});
