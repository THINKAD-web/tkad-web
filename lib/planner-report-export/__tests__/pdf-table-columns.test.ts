/**
 * PDF 표의 헤더 개수와 셀 개수가 맞는지.
 *
 * A-1 Wave 2 에서 지역·구 표의 도달 열을 제거할 때, 지역 표 헤더는
 * `["지역", ...]`, 구 세분화 표 헤더는 `["상권·권역", ...]` 로 문자열이 달라
 * 헤더 치환이 **한쪽만** 됐다. 셀 블록은 두 표가 동일해서 양쪽 다 지워졌고,
 * 그 결과 구 세분화 표에 헤더 5개 · 셀 4개가 남아 컬럼이 밀렸다.
 *
 * jsPDF 를 실제로 돌리지 않고 소스에서 열 정의를 읽어 대조한다.
 * 표 코드는 이 파일에만 있으므로 소스 검사로 충분하고, 렌더 없이 CI 에서 돈다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = readFileSync(
  join(process.cwd(), "lib/planner-report-export/build-pdf.ts"),
  "utf8",
);

/** `const <name> = isKo ? [...] : [...]` 의 한글 배열 길이 */
function headerCount(name: string): number {
  const re = new RegExp(
    `const ${name} = isKo\\s*\\n\\s*\\?\\s*\\[([^\\]]*)\\]`,
    "m",
  );
  const m = SRC.match(re);
  assert.ok(m, `${name} 헤더 정의를 찾지 못했다`);
  return m[1]!.split(",").filter((x) => x.trim().length > 0).length;
}

/** `const <name> = [..]` 숫자 배열 길이 */
function widthCount(name: string): number {
  const m = SRC.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
  assert.ok(m, `${name} 폭 정의를 찾지 못했다`);
  return m[1]!.split(",").filter((x) => x.trim().length > 0).length;
}

/** 지역 표 / 세분화 표의 cells 배열 길이 */
function cellCount(marker: string): number {
  const at = SRC.indexOf(marker);
  assert.ok(at > 0, `${marker} 를 찾지 못했다`);
  const from = SRC.indexOf("const cells = [", at);
  assert.ok(from > 0, `${marker} 뒤에 cells 배열이 없다`);
  const end = SRC.indexOf("];", from);
  const body = SRC.slice(from + "const cells = [".length, end);
  // 최상위 콤마만 센다 (toLocaleString(...) 안의 콤마 제외)
  let depth = 0;
  let n = 1;
  for (const ch of body) {
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
    else if (ch === "," && depth === 0) n += 1;
  }
  return body.trim().endsWith(",") ? n - 1 : n;
}

test("지역 표 — 헤더 · 폭 · 셀 개수가 모두 같다", () => {
  const h = headerCount("cols");
  assert.equal(widthCount("cw"), h, "폭 배열 길이가 헤더와 다르다");
  assert.equal(cellCount("const cols = isKo"), h, "셀 개수가 헤더와 다르다");
});

test("구 세분화 표 — 헤더 · 폭 · 셀 개수가 모두 같다", () => {
  const h = headerCount("subCols");
  assert.equal(widthCount("subCw"), h, "폭 배열 길이가 헤더와 다르다");
  assert.equal(cellCount("const subCols = isKo"), h, "셀 개수가 헤더와 다르다");
});

test("두 표 모두 도달 열이 없다 (C안)", () => {
  assert.ok(!SRC.includes('"도달"'), "도달 헤더가 남아 있다");
  assert.ok(!/\bReach"/.test(SRC), "Reach 헤더가 남아 있다");
  assert.ok(!SRC.includes("uniqueReach"), "uniqueReach 참조가 남아 있다");
});
