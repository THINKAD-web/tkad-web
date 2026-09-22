import assert from "node:assert/strict";
import test from "node:test";
import {
  computeKoSignatureSealLayout,
  koSignatureTextBottomY,
  sealsClearOfTextRows,
} from "@/lib/ooh-contract-signature-layout";
import { CONTRACT_LAYOUT } from "@/lib/contract-layout";

test("computeKoSignatureSealLayout: seals below four text rows", () => {
  const boxTop = 180;
  const margin = 25;
  const colW = 77;
  const leftX = margin;
  const rightX = margin + colW + CONTRACT_LAYOUT.sigColGap;
  const ly = koSignatureTextBottomY(boxTop);
  const ry = ly;

  const layout = computeKoSignatureSealLayout({
    boxTop,
    leftX,
    rightX,
    colW,
    ly,
    ry,
    hasClientStamp: true,
  });

  assert.ok(sealsClearOfTextRows(layout));
  assert.ok(layout.partyBStamp.y >= ly + 2);
  assert.ok(layout.partyAStamp.y >= ly + 2);
  assert.ok(
    layout.partyBStamp.y + layout.partyBStamp.h <= boxTop + layout.sigBoxH + 0.5,
  );
  assert.ok(layout.signature.y >= layout.sealTopY - 1);
});
