import assert from "node:assert/strict";
import test from "node:test";
import {
  CPM_DISPLAY_MAX_WON,
  CPM_DISPLAY_MIN_WON,
  formatCPM,
  formatCpmForAdmin,
  formatImpressions,
  formatMediaPrice,
  formatProductPeriod,
  resolveCpmDisplay,
} from "../format";

// ── ⑧ CPM 극단값 가드 ───────────────────────────────────────────

test("⑧ 관측 결함이 광고주 화면에서 사라진다", () => {
  // 버스 외부광고 — 1대 가격 ÷ 전 노선 노출
  assert.equal(formatCPM(32), "CPM 산정 중");
  // M-CITY 홈 카드 — 일 단가 × 30 ÷ 월 노출
  assert.equal(formatCPM(954_545), "CPM 산정 중");
});

test("⑧ 정상 범위 CPM 은 그대로 표시된다", () => {
  assert.equal(formatCPM(4_233), "₩4,233");
  assert.equal(formatCPM(31_818), "₩31,818");
  assert.equal(formatCPM(11_364), "₩11,364");
});

test("⑧ JP 매체 CPM 은 ¥ 표시 (KRW CPM × 환율)", () => {
  process.env.KRW_JPY_RATE = "0.1126";
  assert.equal(formatCPM(1_814, "ko-KR", "JP"), "¥204");
  assert.equal(formatCPM(1_814, "ko-KR", "KR"), "₩1,814");
});

test("⑧ 경계값 — 임계값 자체는 표시한다", () => {
  assert.equal(resolveCpmDisplay(CPM_DISPLAY_MIN_WON).displayable, true);
  assert.equal(resolveCpmDisplay(CPM_DISPLAY_MAX_WON).displayable, true);
  assert.equal(resolveCpmDisplay(CPM_DISPLAY_MIN_WON - 1).displayable, false);
  assert.equal(resolveCpmDisplay(CPM_DISPLAY_MAX_WON + 1).displayable, false);
});

test("⑧ 임계값은 정식 CPM_BOUNDS 보다 느슨하다 (감사 전 과잉 차단 방지)", () => {
  // dooh_large 정식 하한 8,000 / subway_light 정식 하한 2,000 →
  // 정식 범위였다면 걸렸을 값들이 지금은 통과해야 한다
  assert.equal(resolveCpmDisplay(2_500).displayable, true);
  assert.equal(resolveCpmDisplay(80_000).displayable, true);
  // bus_exterior 정식 상한 12,000 을 넘는 값도 아직은 통과
  assert.equal(resolveCpmDisplay(15_000).displayable, true);
});

test("⑧ 값이 없으면 산정 중 + reason", () => {
  for (const v of [null, undefined, 0, -1, Number.NaN]) {
    const d = resolveCpmDisplay(v as number | null);
    assert.equal(d.displayable, false);
    assert.equal(d.reason, "NO_VALUE");
    assert.equal(d.rawWon, null);
  }
});

test("⑧ 차단해도 원값은 보존된다 (관리자·감사용)", () => {
  const low = resolveCpmDisplay(32);
  assert.equal(low.displayable, false);
  assert.equal(low.reason, "TOO_LOW");
  assert.equal(low.rawWon, 32);

  const high = resolveCpmDisplay(954_545);
  assert.equal(high.displayable, false);
  assert.equal(high.reason, "TOO_HIGH");
  assert.equal(high.rawWon, 954_545);
});

test("⑧ 관리자 화면은 실값과 경고를 그대로 노출한다", () => {
  assert.equal(formatCpmForAdmin(32), "₩32 ⚠ 하한 미달");
  assert.equal(formatCpmForAdmin(954_545), "₩954,545 ⚠ 상한 초과");
  assert.equal(formatCpmForAdmin(4_233), "₩4,233");
  assert.equal(formatCpmForAdmin(null), "—");
});

test("⑧ 영문 로케일", () => {
  assert.equal(formatCPM(32, "en-US"), "CPM under review");
  assert.ok(formatCpmForAdmin(32, "en-US").includes("below floor"));
});

// ── ② 가격 표기 = 금액 / 실제 상품 기간 ─────────────────────────

test("② 금액과 기간은 분리되지 않는다", () => {
  assert.equal(formatMediaPrice(70_000_000, 30), "₩7,000만 / 30일");
  assert.equal(formatMediaPrice(25_000_000, 7), "₩2,500만 / 7일");
});

test("② 7일 상품을 1일로 표기하지 않는다 (D-05)", () => {
  const seven = formatMediaPrice(25_000_000, 7);
  assert.ok(seven.includes("7일"));
  assert.equal(seven.includes("1일"), false);
});

test("② 추정 단가는 배지를 단다", () => {
  assert.equal(
    formatMediaPrice(43_000_000, 14, "ko-KR", { isEstimate: true }),
    "₩4,300만 / 14일 (추정)",
  );
  assert.equal(
    formatMediaPrice(43_000_000, 14, "ko-KR", { isEstimate: false }),
    "₩4,300만 / 14일",
  );
});

test("② 가격 미상은 문의 표기", () => {
  assert.equal(formatMediaPrice(0, 30), "가격 문의");
  assert.equal(formatMediaPrice(null, 30), "가격 문의");
});

test("formatProductPeriod — 비표준 일수도 그대로 보여준다", () => {
  assert.equal(formatProductPeriod(1), "1일");
  assert.equal(formatProductPeriod(7), "7일");
  assert.equal(formatProductPeriod(90), "90일");
  assert.equal(formatProductPeriod(0), "기간 문의");
});

// ── 노출 ────────────────────────────────────────────────────────

test("formatImpressions — 한글은 만 단위, 영문은 K/M", () => {
  assert.equal(formatImpressions(2_200_000), "2.2M");
  assert.equal(formatImpressions(189_000), "19만");
  assert.equal(formatImpressions(189_000, "en-US"), "189.0K");
  assert.equal(formatImpressions(0), null);
  assert.equal(formatImpressions(null), null);
});
