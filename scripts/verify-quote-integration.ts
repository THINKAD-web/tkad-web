/**
 * 통합 검증 — 견적 마법사의 4단계 전이를 store + validation + pricing 으로 시뮬레이션.
 *
 * 한 사용자 시나리오를 끝까지 돌려 보고, 각 단계의 gate(canProceedFromStep) 와
 * 가격 합계(computeQuoteTotals) 가 의도대로 작동하는지 어설트한다.
 *
 * 실행: `npx tsx scripts/verify-quote-integration.ts`
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
(globalThis as { localStorage?: Storage }).localStorage =
  new MemoryStorage() as unknown as Storage;
const _origWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const first = typeof args[0] === "string" ? args[0] : "";
  if (first.includes("[zustand persist middleware]")) return;
  _origWarn(...args);
};

import { useQuoteStore } from "@/lib/quote/store";
import { canProceedFromStep, maxCompletedStep } from "@/lib/quote/validation";
import { computeQuoteTotals, type LineInput } from "@/lib/pricing";
import type { MediaItem } from "@/lib/media-data";
import { isoToDate } from "@/lib/quote/store";

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

const baseMedia: MediaItem = {
  id: "m1",
  name: "강남역 디지털 사이니지",
  nameEn: "Gangnam Digital Signage",
  location: "Gangnam-gu",
  locationEn: "Gangnam-gu",
  region: "seoul",
  type: "digital",
  price: 30_000_000,
  pricePeriod: "month",
  lat: 37.5,
  lng: 127.0,
  dailyFootTraffic: 100_000,
  sampleImages: [],
};

console.log("\n[시나리오 1] Planner → Quote 자동 채움 + 4단계 진행");

const store = useQuoteStore;
store.getState().resetAll();

// 진입: source=planner + 매체 1건 사전 선택
store.getState().setSource("planner", "plan-abc-123");
store.getState().setSelectedMediaIds(["m1"]);
check(
  "source=planner 적용",
  store.getState().source,
  "planner",
);
check("sourceId 저장", store.getState().sourceId, "plan-abc-123");
check("매체 사전 선택", store.getState().selectedMediaIds, ["m1"]);

// Step 1 통과 → Step 2 미입력 차단 확인
check(
  "Step 1 통과",
  canProceedFromStep(store.getState(), 1).ok,
  true,
);
check(
  "Step 2 입력 전 차단 — needDates",
  canProceedFromStep(store.getState(), 2),
  { ok: false, errorKey: "needDates" },
);

// Step 2: 30일 캠페인 + 출퇴근 시간대
store.getState().setStartDate("2026-05-01");
store.getState().setEndDate("2026-05-30");
store.getState().setTimeSlot("rush_hour");
store.getState().setBudget(50_000_000);
check(
  "Step 2 통과",
  canProceedFromStep(store.getState(), 2).ok,
  true,
);

// Step 3: composite 모드
store.getState().setCreativeMode("composite");
check(
  "Step 3 composite 모드 통과",
  canProceedFromStep(store.getState(), 3).ok,
  true,
);

// Step 4 미입력 차단 → 입력 후 통과
check(
  "Step 4 차단 — needCompany",
  canProceedFromStep(store.getState(), 4),
  { ok: false, errorKey: "needCompany" },
);
store.getState().updateCustomer({
  company: "Acme Inc.",
  name: "김철수",
  email: "kim@acme.kr",
  phone: "010-1234-5678",
});
check(
  "Step 4 통과",
  canProceedFromStep(store.getState(), 4).ok,
  true,
);

// 모든 단계 통과
check("maxCompletedStep == 4", maxCompletedStep(store.getState()), 4);

console.log("\n[시나리오 2] 가격 일관성 — 동일 입력 → 동일 합계");

const start = isoToDate("2026-05-01")!;
const end = isoToDate("2026-05-30")!;
const lines: LineInput[] = [{ media: baseMedia }];

const t1 = computeQuoteTotals({ lines, start, end, hint: "won" });
const t2 = computeQuoteTotals({ lines, start, end, hint: "won" });
check("동일 입력 → 동일 subtotal", t1.subtotalKrw, t2.subtotalKrw);
check("동일 입력 → 동일 grand total", t1.totalKrw, t2.totalKrw);
check("30일 → 5% 장기 할인", t1.discount.rate, 0.05);
check(
  "lineKrw 합 == subtotal",
  t1.lines.reduce((s, l) => s + l.lineKrw, 0),
  t1.subtotalKrw,
);

console.log("\n[시나리오 3] Step 2/3 검증 게이트 — 단계별 차단");

store.getState().resetAll();
store.getState().setSelectedMediaIds(["m1"]);
store.getState().setStartDate("2026-05-01");
store.getState().setEndDate("2026-05-03"); // 3일 < 7일 최소
check(
  "캠페인 < 7일 차단 — campaignTooShort",
  canProceedFromStep(store.getState(), 2),
  { ok: false, errorKey: "campaignTooShort" },
);

store.getState().setEndDate("2026-05-30");
store.getState().setCreativeMode("upload");
check(
  "upload 모드 + 자료 0 차단 — needCreativeAsset",
  canProceedFromStep(store.getState(), 3),
  { ok: false, errorKey: "needCreativeAsset" },
);
store.getState().addUploadedAsset({
  id: "a1",
  url: "https://example.com/a.png",
  filename: "a.png",
  size: 12345,
  mimeType: "image/png",
});
check(
  "자료 1개 추가 후 Step 3 통과",
  canProceedFromStep(store.getState(), 3).ok,
  true,
);

console.log("\n[시나리오 4] draft 자동 저장 + 만료");

store.getState().resetAll();
store.getState().setSelectedMediaIds(["m1"]);
const savedAt = store.getState().draftSavedAt;
check("draftSavedAt 자동 갱신 (not null)", typeof savedAt === "number", true);

// 25시간 전으로 강제 만료
useQuoteStore.setState({
  draftSavedAt: Date.now() - 25 * 60 * 60 * 1000,
});
const wasExpired = store.getState().clearDraftIfExpired();
check("25시간 후 → 만료 처리", wasExpired, true);
check(
  "만료 시 selection 초기화",
  store.getState().selectedMediaIds,
  [],
);

if (failures > 0) {
  console.error(`\n[FAIL] ${failures} 항목 불일치.`);
  process.exit(1);
}
console.log("\n[OK] 견적 마법사 통합 시나리오 모두 통과.");
