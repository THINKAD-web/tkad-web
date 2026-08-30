/**
 * 0단계 회귀 방지 — `lib/brand-palette.ts` 와 `app/globals.css` 의 액센트 램프가
 * 같은 값을 갖는지 검사한다.
 *
 * 캔버스·PDF·PPTX 는 CSS 변수를 못 읽어서 hex 를 TS 에도 둘 수밖에 없다.
 * 그 대가로 두 곳이 조용히 어긋날 수 있으므로, 어긋나면 여기서 깨지게 한다.
 * 색을 바꿀 때는 **양쪽을 함께** 고쳐야 이 테스트가 통과한다.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  BRAND_ACCENT,
  BRAND_ACCENT_BARE,
  BRAND_ACCENT_PALE,
  BRAND_ACCENT_RGB,
  BRAND_ACCENT_SHADE,
  BRAND_ACCENT_TINT,
} from "@/lib/brand-palette";

const css = readFileSync(
  resolve(process.cwd(), "app/globals.css"),
  "utf-8",
);

/** `:root` 의 `--name: #value;` 선언을 읽는다 (첫 정의 기준) */
function cssVar(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  assert.ok(m, `globals.css 에 --${name} 리터럴 정의가 있어야 한다`);
  return m![1].toLowerCase();
}

test("브랜드 램프 — TS 상수와 globals.css 토큰이 일치한다", () => {
  assert.equal(cssVar("hermes"), BRAND_ACCENT.toLowerCase());
  assert.equal(cssVar("hermes-tint"), BRAND_ACCENT_TINT.toLowerCase());
  assert.equal(cssVar("hermes-shade"), BRAND_ACCENT_SHADE.toLowerCase());
  assert.equal(cssVar("hermes-pale"), BRAND_ACCENT_PALE.toLowerCase());
});

test("파생 표기 — bare hex / RGB 배열이 BRAND_ACCENT 와 같은 색이다", () => {
  assert.equal(`#${BRAND_ACCENT_BARE}`.toLowerCase(), BRAND_ACCENT.toLowerCase());

  const [r, g, b] = BRAND_ACCENT_RGB;
  const fromRgb =
    "#" +
    [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
  assert.equal(fromRgb, BRAND_ACCENT.toLowerCase());
});

test("0단계 — globals.css 에 액센트 리터럴이 램프 정의 밖에 남아 있지 않다", () => {
  // 주석 안의 hex 는 설명용이라 제외한다. 줄 번호를 유지하려고
  // 주석 본문만 공백으로 지우고 줄바꿈은 남긴다.
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " "),
  );

  const offenders: string[] = [];
  stripped.split("\n").forEach((line, i) => {
    // 램프 정의 4줄은 리터럴을 갖는 것이 정상
    if (/--hermes(-tint|-shade|-pale)?:\s*#/.test(line)) return;
    if (/#(ff6200|ff8533|e65800|ffb38a)/i.test(line)) {
      offenders.push(`${i + 1}: ${line.trim()}`);
    }
  });
  assert.deepEqual(
    offenders,
    [],
    `액센트 리터럴은 --hermes* 램프에만 있어야 한다:\n${offenders.join("\n")}`,
  );
});
