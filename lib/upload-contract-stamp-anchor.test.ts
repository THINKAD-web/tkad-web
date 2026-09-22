import assert from "node:assert/strict";
import test from "node:test";
import {
  lowerSealMatrices,
  partyASealRect,
  UPLOAD_PARTY_A_SEAL_PT,
  type PdfTextRun,
} from "@/lib/upload-contract-stamp-anchor";

/** reference-original.pdf 2페이지 pdfjs 좌표 (원점 좌하단) */
const PAGE = { width: 595.32, height: 841.92 };

function run(
  str: string,
  x: number,
  y: number,
  width = 12,
  height = 9,
): PdfTextRun {
  return { str, x, y, width, height };
}

const GEARSECOND_SIG: PdfTextRun[] = [
  run("전화번호", 73.5, 195.1, 32, 8),
  run(":", 109.5, 195.1, 4, 8),
  run("02-718-6348", 114, 195.1, 40, 8),
  run("대표", 72.3, 173.1, 18, 9),
  run("자", 90.3, 173.1, 9, 9),
  run(":", 99.3, 173.1, 4, 9),
  run("김", 110.7, 173.1, 12, 9),
  run("민", 124.1, 173.1, 12, 9),
  run("상", 137.7, 173.1, 12, 9),
  run("(", 151.1, 173.1, 4, 9),
  run("인", 153.9, 173.1, 9, 9),
  run(")", 162.9, 173.1, 4, 9),
  run("전화번호", 330.8, 195.1, 32, 8),
  run(": 02", 366.8, 195.1, 14, 8),
  run("2772", 399.9, 195.1, 18, 8),
  run("대표", 329.6, 173.1, 18, 9),
  run("자", 347.6, 173.1, 9, 9),
  run("이", 368, 173.1, 12, 9),
  run("재", 381.4, 173.1, 12, 9),
  run("한", 395, 173.1, 12, 9),
  run("(", 408.4, 173.1, 4, 9),
  run("인", 411.2, 173.1, 9, 9),
  run(")", 420.2, 173.1, 4, 9),
];

test("갑 seal covers (인) and stays under the phone line", () => {
  const seal = partyASealRect(PAGE, GEARSECOND_SIG);
  assert.ok(seal);
  assert.equal(seal.h, UPLOAD_PARTY_A_SEAL_PT);

  const phoneBaseline = 195.1;
  assert.ok(
    seal.y + seal.h <= phoneBaseline - 2,
    `seal top ${seal.y + seal.h} overlaps phone baseline ${phoneBaseline}`,
  );

  const nameTop = 173.1 + 9;
  assert.ok(seal.y < nameTop, "seal should overlap the representative name");
  assert.ok(seal.y + seal.h > 173.1);

  const inCenter = 153.9 + 4.5;
  assert.ok(Math.abs(seal.x + seal.w / 2 - inCenter) < 8);

  assert.ok(seal.x + seal.w < PAGE.width * 0.5, "seal stays in the 갑 column");
  assert.ok(seal.y > 120, "seal is not on the page footer");
});

test("lowers an embedded seal that covers the phone line", () => {
  const snippet =
    "53.971 0 0 53.3 405.75 157.87 cm\r\n/Image24 Do\r\n";
  const next = lowerSealMatrices(snippet, GEARSECOND_SIG);
  assert.match(next, /405\.75 138\.80 cm/);
  assert.doesNotMatch(next, /157\.87/);
  const again = lowerSealMatrices(next, GEARSECOND_SIG);
  assert.equal(again, next);
});

test("returns null when the page has no 갑 대표자 line", () => {
  assert.equal(
    partyASealRect(PAGE, [run("hello", 40, 100, 20, 9)]),
    null,
  );
});
