/**
 * 수동 검증 스크립트 — `npx tsx scripts/verify-quote-store.ts`.
 *
 * lib/quote/ 의 순수 함수(validation, selector, ISO 헬퍼)를 직접 어설트한다.
 * Zustand store 는 localStorage 의존이라 Node 에서 인스턴스화하지 않고, plain
 * state 객체를 만들어 selector / validator 에 주입한다.
 */

import {
  canProceedFromStep,
  maxCompletedStep,
  type QuoteErrorKey,
} from "@/lib/quote/validation";
import {
  dateToIso,
  isoToDate,
  selectHasDraftContent,
  selectIsDraftExpired,
  type QuoteStoreState,
} from "@/lib/quote/store";
import { QUOTE_DRAFT_TTL_MS } from "@/lib/quote/types";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(
      `  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`,
    );
  }
}

function section(title: string, fn: () => void): void {
  console.log(`\n[${title}]`);
  fn();
}

const baseState: QuoteStoreState = {
  step: 1,
  source: "direct",
  sourceId: null,
  selectedMediaIds: [],
  networkOptions: {},
  priceOptionIndices: {},
  startDateIso: null,
  endDateIso: null,
  timeSlot: "all_day",
  budgetKrw: null,
  creativeMode: "later",
  uploadedAssets: [],
  needsDesignService: false,
  designBrief: null,
  customer: { company: "", name: "", email: "", phone: "" },
  quoteNumber: null,
  draftSavedAt: null,
};

function withState(patch: Partial<QuoteStoreState>): QuoteStoreState {
  return { ...baseState, ...patch };
}

function expectErr(
  state: QuoteStoreState,
  step: 1 | 2 | 3 | 4,
  key: QuoteErrorKey,
  label: string,
): void {
  const r = canProceedFromStep(state, step);
  check(label, r.ok ? "ok" : r.errorKey, key);
}

function expectOk(
  state: QuoteStoreState,
  step: 1 | 2 | 3 | 4,
  label: string,
): void {
  const r = canProceedFromStep(state, step);
  check(label, r.ok, true);
}

section("ISO 날짜 헬퍼", () => {
  check("dateToIso UTC 안전", dateToIso(new Date(Date.UTC(2026, 4, 1))), "2026-05-01");
  check("isoToDate 정상", isoToDate("2026-05-01")?.toISOString().slice(0, 10), "2026-05-01");
  check("isoToDate null → null", isoToDate(null), null);
  check("isoToDate 빈 문자열 → null", isoToDate(""), null);
  check("isoToDate 잘못된 값 → null", isoToDate("not-a-date"), null);
});

section("Step 1 (매체 선택) 검증", () => {
  expectErr(withState({}), 1, "needMediaPick", "빈 선택 → needMediaPick");
  expectOk(withState({ selectedMediaIds: ["m1"] }), 1, "1개 선택 → ok");
  expectOk(
    withState({ selectedMediaIds: Array.from({ length: 10 }, (_, i) => `m${i}`) }),
    1,
    "10개 선택 → ok (한도)",
  );
  // 한도 초과는 store 가 막지만 안전장치
  expectErr(
    withState({ selectedMediaIds: Array.from({ length: 11 }, (_, i) => `m${i}`) }),
    1,
    "tooManyMedia",
    "11개 선택 → tooManyMedia",
  );
});

section("Step 2 (기간) 검증", () => {
  expectErr(withState({ selectedMediaIds: ["m1"] }), 2, "needDates", "날짜 누락");
  expectErr(
    withState({
      selectedMediaIds: ["m1"],
      startDateIso: "2026-05-10",
      endDateIso: "2026-05-01",
    }),
    2,
    "endBeforeStart",
    "종료 < 시작",
  );
  expectErr(
    withState({
      selectedMediaIds: ["m1"],
      startDateIso: "2026-05-01",
      endDateIso: "2026-05-05", // 5일 < 7일
    }),
    2,
    "campaignTooShort",
    "5일 → campaignTooShort",
  );
  expectErr(
    withState({
      selectedMediaIds: ["m1"],
      startDateIso: "2026-01-01",
      endDateIso: "2027-01-02", // 367일 > 365일
    }),
    2,
    "campaignTooLong",
    "367일 → campaignTooLong",
  );
  expectOk(
    withState({
      selectedMediaIds: ["m1"],
      startDateIso: "2026-05-01",
      endDateIso: "2026-05-07", // 7일 (포함)
    }),
    2,
    "7일 → ok (최소)",
  );
});

section("Step 3 (소재) 검증", () => {
  expectOk(
    withState({ creativeMode: "later" }),
    3,
    "later 모드 → ok",
  );
  expectOk(
    withState({ creativeMode: "composite" }),
    3,
    "composite 모드 → ok",
  );
  expectErr(
    withState({ creativeMode: "upload", uploadedAssets: [] }),
    3,
    "needCreativeAsset",
    "upload 모드 + 빈 자료 → needCreativeAsset",
  );
  expectOk(
    withState({
      creativeMode: "upload",
      uploadedAssets: [
        {
          id: "a1",
          url: "https://example.com/a.png",
          filename: "a.png",
          size: 1234,
          mimeType: "image/png",
        },
      ],
    }),
    3,
    "upload + 자료 1개 → ok",
  );
  expectErr(
    withState({ creativeMode: "design_request", designBrief: null }),
    3,
    "needDesignBrief",
    "design_request + 브리프 없음 → needDesignBrief",
  );
});

section("Step 4 (고객 정보) 검증", () => {
  expectErr(
    withState({}),
    4,
    "needCompany",
    "빈 customer → needCompany",
  );
  expectErr(
    withState({ customer: { company: "Acme", name: "", email: "", phone: "" } }),
    4,
    "needName",
    "회사만 입력 → needName",
  );
  expectErr(
    withState({
      customer: { company: "Acme", name: "Kim", email: "no-at-sign", phone: "" },
    }),
    4,
    "needValidEmail",
    "잘못된 이메일",
  );
  expectErr(
    withState({
      customer: { company: "Acme", name: "Kim", email: "k@a.com", phone: "12" },
    }),
    4,
    "needValidPhone",
    "전화 8자리 미만",
  );
  expectOk(
    withState({
      customer: {
        company: "Acme",
        name: "Kim",
        email: "k@a.com",
        phone: "010-1234-5678",
      },
    }),
    4,
    "전 항목 입력 → ok",
  );
});

section("maxCompletedStep", () => {
  check("아무것도 입력 안 됨 → 0", maxCompletedStep(baseState), 0);
  check(
    "step 1 통과 → 1",
    maxCompletedStep(withState({ selectedMediaIds: ["m1"] })),
    1,
  );
  // step 3 은 creativeMode 기본값 'later' 만으로 validator 통과 → 점프 가능 단계는 3
  check(
    "step 1+2 입력 + creativeMode 'later' → 3 (validator 기준)",
    maxCompletedStep(
      withState({
        selectedMediaIds: ["m1"],
        startDateIso: "2026-05-01",
        endDateIso: "2026-05-10",
      }),
    ),
    3,
  );
  // upload 모드 + 자료 없음 이면 step 3 막힘 → 점프 가능 단계는 2
  check(
    "step 1+2 입력 + upload 모드 + 자료 0 → 2",
    maxCompletedStep(
      withState({
        selectedMediaIds: ["m1"],
        startDateIso: "2026-05-01",
        endDateIso: "2026-05-10",
        creativeMode: "upload",
      }),
    ),
    2,
  );
});

section("draft selectors", () => {
  check("초기 상태 → 빈 draft", selectHasDraftContent(baseState), false);
  check(
    "매체 선택만 있어도 draft",
    selectHasDraftContent(withState({ selectedMediaIds: ["m1"] })),
    true,
  );
  check("draftSavedAt null → 만료 아님", selectIsDraftExpired(baseState), false);
  check(
    "draftSavedAt 25시간 전 → 만료",
    selectIsDraftExpired(
      withState({ draftSavedAt: Date.now() - QUOTE_DRAFT_TTL_MS - 1 }),
    ),
    true,
  );
  check(
    "draftSavedAt 23시간 전 → 만료 아님",
    selectIsDraftExpired(
      withState({ draftSavedAt: Date.now() - QUOTE_DRAFT_TTL_MS + 60_000 }),
    ),
    false,
  );
});

if (failures > 0) {
  console.error(`\n[FAIL] ${failures} 항목 불일치.`);
  process.exit(1);
}
console.log("\n[OK] quote store / validation 검증 통과.");
