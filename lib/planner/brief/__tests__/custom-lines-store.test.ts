import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBriefCustomLines } from "../custom-lines.ts";
import { useBriefStore } from "../store.ts";

test("customLines store: add / update / remove", () => {
  useBriefStore.setState({ mixUnits: {}, customLines: [] });

  useBriefStore.getState().addCustomLine({
    name: "협의 매체",
    quantity: 2,
    unitPriceWon: 500_000,
    notes: "일회성",
  });
  let s = useBriefStore.getState();
  assert.equal(s.customLines.length, 1);
  assert.equal(s.customLines[0]!.name, "협의 매체");
  assert.match(s.customLines[0]!.lineId, /^custom-/);

  const id = s.customLines[0]!.lineId;
  useBriefStore.getState().updateCustomLine(id, {
    quantity: 3,
    unitPriceWon: 400_000,
  });
  s = useBriefStore.getState();
  assert.equal(s.customLines[0]!.quantity, 3);
  assert.equal(s.customLines[0]!.unitPriceWon, 400_000);

  useBriefStore.getState().removeCustomLine(id);
  assert.equal(useBriefStore.getState().customLines.length, 0);
});

test("clearMix clears catalog + custom", () => {
  useBriefStore.setState({
    mixUnits: { a: 1 },
    customLines: [
      {
        lineId: "custom-x",
        name: "X",
        quantity: 1,
        unitPriceWon: 100,
      },
    ],
  });
  useBriefStore.getState().clearMix();
  const s = useBriefStore.getState();
  assert.deepEqual(s.mixUnits, {});
  assert.deepEqual(s.customLines, []);
});

test("normalizeBriefCustomLines drops invalid persisted rows", () => {
  const lines = normalizeBriefCustomLines([
    { lineId: "custom-ok", name: "OK", quantity: 1, unitPriceWon: 100 },
    { lineId: "bad", name: "", quantity: 1, unitPriceWon: 50 },
  ]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]!.name, "OK");
});
