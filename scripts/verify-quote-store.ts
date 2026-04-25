/**
 * 수동 검증 스크립트 — `npx tsx scripts/verify-quote-store.ts`.
 *
 * lib/quote/ 의 순수 함수(validation, selector, ISO 헬퍼)와 store action 의 cleanup
 * 동작을 어설트한다. store action 을 실제 호출하기 위해 localStorage 인메모리 목업을
 * 설치한 뒤 모듈을 import 한다.
 */

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
  clear(): void {
    this.store.clear();
  }
  get length(): number {
    return this.store.size;
  }
  key(i: number): string | null {
    return [...this.store.keys()][i] ?? null;
  }
}
// localStorage 목업 — zustand persist 가 import 시 storage factory 를 호출하기 전에 설치.
// ES module hoisting 으로 import 가 본 라인보다 먼저 평가되지만, persist 의 첫 setItem 호출은
// 첫 setState 시점이므로 본 시점 설치만으로도 충분하다. import 전 출력되는 cosmetic 경고는
// console.warn 패치로 억제(아래).
(globalThis as { localStorage?: Storage }).localStorage =
  new MemoryStorage() as unknown as Storage;
const _origWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (first.includes("[zustand persist middleware]")) return;
  _origWarn(...args);
};

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
  useQuoteStore,
  type QuoteStoreState,
} from "@/lib/quote/store";
import { QUOTE_DRAFT_TTL_MS } from "@/lib/quote/types";
import {
  deriveLegacyPeriodKey,
  deriveLegacyPeriodMonths,
  LEGACY_PERIOD_DAYS,
} from "@/lib/quote/period-derive";

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

section("store action: toggleMedia 한도/cleanup", () => {
  const store = useQuoteStore;
  // 사전 셋업
  store.getState().resetAll();
  store.getState().toggleMedia("m1");
  store.getState().setNetworkOption("m1", { units: 5, regionScope: "all" });
  store.getState().setPriceOptionIndex("m1", 2);
  check("초기 선택 1개", store.getState().selectedMediaIds, ["m1"]);
  check("network 옵션 set", !!store.getState().networkOptions["m1"], true);
  check("price 옵션 set", store.getState().priceOptionIndices["m1"], 2);

  // 토글로 해제 → 의존 맵도 같이 제거
  store.getState().toggleMedia("m1");
  check("해제 후 빈 selection", store.getState().selectedMediaIds, []);
  check(
    "해제 후 networkOptions 키 제거",
    "m1" in store.getState().networkOptions,
    false,
  );
  check(
    "해제 후 priceOptionIndices 키 제거",
    "m1" in store.getState().priceOptionIndices,
    false,
  );

  // QUOTE_MAX_MEDIA 한도
  store.getState().resetAll();
  for (let i = 1; i <= 10; i += 1) store.getState().toggleMedia(`m${i}`);
  check("10개 선택", store.getState().selectedMediaIds.length, 10);
  store.getState().toggleMedia("m11"); // 한도 초과
  check("11번째 선택 시도 → 무시", store.getState().selectedMediaIds.length, 10);
});

section("store action: setSelectedMediaIds cleanup + cap", () => {
  const store = useQuoteStore;
  store.getState().resetAll();
  // 옵션 미리 세팅
  store.getState().toggleMedia("a");
  store.getState().toggleMedia("b");
  store.getState().setNetworkOption("a", { units: 3, regionScope: "all" });
  store.getState().setNetworkOption("b", { units: 7, regionScope: "all" });
  // a 만 남기고 c 추가 → b 의 옵션은 정리되어야 함
  store.getState().setSelectedMediaIds(["a", "c"]);
  check("선택 ['a','c']", store.getState().selectedMediaIds, ["a", "c"]);
  check(
    "b 의 networkOption 제거",
    "b" in store.getState().networkOptions,
    false,
  );
  check(
    "a 의 networkOption 유지",
    "a" in store.getState().networkOptions,
    true,
  );

  // cap 적용
  store.getState().resetAll();
  store
    .getState()
    .setSelectedMediaIds(Array.from({ length: 15 }, (_, i) => `x${i}`));
  check(
    "15개 입력 → 10개로 cap",
    store.getState().selectedMediaIds.length,
    10,
  );
});

section("period-derive (legacy 호환)", () => {
  check("음수/0 → 1month", deriveLegacyPeriodKey(0), "1month");
  check("7일 → 1month", deriveLegacyPeriodKey(7), "1month");
  check("30일 → 1month", deriveLegacyPeriodKey(30), "1month");
  check("45일 → 1month (경계)", deriveLegacyPeriodKey(45), "1month");
  check("46일 → 3months", deriveLegacyPeriodKey(46), "3months");
  check("90일 → 3months", deriveLegacyPeriodKey(90), "3months");
  check("136일 → 6months", deriveLegacyPeriodKey(136), "6months");
  check("180일 → 6months", deriveLegacyPeriodKey(180), "6months");
  check("271일 → 12months", deriveLegacyPeriodKey(271), "12months");
  check("365일 → 12months", deriveLegacyPeriodKey(365), "12months");

  check("월수: 7일 → 1", deriveLegacyPeriodMonths(7), 1);
  check("월수: 60일 → 2", deriveLegacyPeriodMonths(60), 2);
  check("월수: 90일 → 3", deriveLegacyPeriodMonths(90), 3);
  check(
    "정확 매핑: legacy 30/90/180/365 → 키 일치",
    Object.entries(LEGACY_PERIOD_DAYS).every(
      ([k, d]) => deriveLegacyPeriodKey(d) === k,
    ),
    true,
  );
});

section("store action: clearDraftIfExpired", () => {
  const store = useQuoteStore;
  store.getState().resetAll();
  store.getState().toggleMedia("m1");
  // 25시간 전으로 강제 변경
  useQuoteStore.setState({ draftSavedAt: Date.now() - QUOTE_DRAFT_TTL_MS - 1 });
  const wasExpired = store.getState().clearDraftIfExpired();
  check("만료 감지 → true", wasExpired, true);
  check("만료 시 selection 초기화", store.getState().selectedMediaIds, []);

  // 만료되지 않은 경우
  store.getState().toggleMedia("m1");
  const wasExpired2 = store.getState().clearDraftIfExpired();
  check("정상 → false", wasExpired2, false);
  check("정상 시 selection 유지", store.getState().selectedMediaIds, ["m1"]);
});

if (failures > 0) {
  console.error(`\n[FAIL] ${failures} 항목 불일치.`);
  process.exit(1);
}
console.log("\n[OK] quote store / validation 검증 통과.");
