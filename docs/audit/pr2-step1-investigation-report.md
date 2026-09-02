# PR2 Step 1 — `PricingStrategy` 분리 선행 조사

**작성일**: 2026-09-02  
**브랜치 예정**: `feat/pr2-pricing-strategy`  
**상태**: 조사 완료 — **승인 전 코드 변경 없음**

---

## 0. 요약

| 항목 | 결론 |
|------|------|
| **리팩토링 대상** | `lib/quote-calculator.ts`의 `calculateQuote` / `calculateQuoteFromMediaIds` (서버 권위 견적 엔진) |
| **범위 외 (이 PR)** | `lib/planner/calc/engine.ts` — 금액 미계산(노출·예산 사용률만). `compare-quote.ts` — 매체 상세·비교 UI 별도 경로 |
| **DB 스키마 변경** | **없음** — `catalog_channel`·`media_online_spec`은 PR1a/PR1b-1에서 완료 |
| **전략 분기 축** | `catalog_channel`: `offline` → `FixedPeriodPricing`, `online` → `BudgetPricing`(스텁) |
| **가드 재배치** | `assertQuoteCalculatorDisplayType` → `FixedPeriodPricing` 진입 최상단 (offline 전용) |
| **골든 기준선** | `reports/pr0-prod-price-post.json`(30건×3) + `reports/pr1a-prod-price-check.json` classified(4건×3) = **102 rows** |
| **주의 — 시나리오 표현** | 지시서의 “1/3/5/7/15/30일 × 예산대”와 **실제 검증 자산은 불일치** — 아래 §1-3 |

---

## 1-1. CalcEngine(견적 가격) 진입점 및 호출부

### A. 명칭 정리 — “CalcEngine” vs 실제 코드

코드베이스에 **이름이 CalcEngine인 모듈이 두 갈래** 있다.

| 모듈 | 역할 | PR2 대상 |
|------|------|----------|
| `lib/quote-calculator.ts` | **원화 견적 breakdown** (`totalWon`, VAT, 라인별 supply) | **예 — 본 PR 핵심** |
| `lib/planner/calc/engine.ts` `calculatePlan()` | 포트폴리오 **노출·도달·예산 사용률** (금액은 호출자가 넘긴 `itemNet` 합산) | **아니오** |
| `lib/compare-quote.ts` | 매체 상세·비교 **클라이언트 견적** (`calculateMediaQuoteByDays` 등) | **아니오** (골든 미포함, 로직 이동 대상 아님) |
| `lib/quote-wizard-pricing.ts` `buildQuoteWizardLineContext` | 위저드·플랜카트·PDF **라인 단가 UI** (만원 단위) | **간접** — `calculateQuote`가 option-pricing 경로에서 호출; 본문 이동은 `calculateQuote` 측 |

PR2의 “CalcEngine”은 **`quote-calculator` 서버 견적 엔진**으로 해석하는 것이 `pr1a-prep-decisions.md`·골든 자산·`catalog_channel` 분기와 일치한다.

---

### B. `calculateQuote` / `calculateQuoteFromMediaIds` — 시그니처 (현행 그대로 인터페이스화)

**입력** (`CalculateQuoteInput`):

```ts
{
  media: QuoteCalculatorMedia[];  // id, name, location, type?, catalogChannel?, price, pricePeriod?, priceOptions?, partialPeriodRates?, dailyFootfall?, impressions?, lat/lng
  startDate: Date;
  endDate: Date;
  discountRate?: number;
  issuedAt?: Date;
  periodKey?: string;                    // 위저드 캠페인 기간 (1/3/5/7/15/30일 키 또는 비표준 "1month")
  mediaPriceOptionIndex?: Record<string, number>;
  mediaSelections?: QuoteMediaSelectionSnapshot[];
}
```

**출력** (`CalculateQuoteResult` = `QuoteBreakdown` +):

```ts
{
  lines: QuoteLineItem[];   // mediaId, mediaName, periodDays, unitPriceWon, lineSupplyWon, impressions, quantity?, ...
  subtotalWon, discountRate, discountWon, supplyWon, vatWon, totalWon,
  validUntil, issuedAt,
  totalAmountManwon, startDate, endDate, validUntilDate, periodDays
}
```

**DB 진입** (`calculateQuoteFromMediaIds`): `media` 테이블에서 `catalogChannel` 포함 select → `calculateQuote` 위임.

---

### C. 진입점 매트릭스

| 표면 | 파일 | 호출 함수 | 비고 |
|------|------|-----------|------|
| **견적 PDF/PPTX export** | `lib/quote-export/build-payload.ts` | `calculateQuoteFromMediaIds` + `buildQuoteWizardLineContext`(라인 표시 보조) | 서버 |
| **문의 → OoHQuote 초안** | `lib/inquiry-quote-draft.ts` | `calculateQuoteFromMediaIds` | 서버 |
| **OoHQuote breakdown 동기화** | `lib/ooh-quote-sync-breakdown.ts` | `calculateQuoteFromMediaIds` | 서버 |
| **협상 견적 플로우** | `lib/negotiation-quote-flow.ts` | `calculateQuoteFromMediaIds` | 서버 |
| **채팅 견적 플로우** | `lib/chat-quote-flow.ts` | `calculateQuoteFromMediaIds` | 서버 |
| **감사 스크립트** | `scripts/audit/pr1a-prod-price-check.mts` | `calculateQuote` (in-memory media) | 골든 회귀 |
| **단위 테스트** | `lib/quote-calculator.test.ts` | `calculateQuote` | type=null 가드 |
| **견적 위저드 UI** | `app/.../quote/quote-page-client.tsx` | `buildQuoteWizardLineContext` | 클라이언트 — `calculateQuote` **미호출** |
| **플랜 카트 금액** | `lib/plan-cart-pricing.ts` | `buildQuoteWizardLineContext` via `plannerMediaPeriodTotalWon` | 클라이언트 |
| **통합 플래너 / recommend 카트** | `lib/planner/planner-media-quantity.ts`, `recommend-page-client.tsx` | `buildQuoteWizardLineContext` / `planCartLinePeriodTotalWon` | dmpilot 호출은 PR5 |
| **플래너 포트폴리오** | `lib/planner/calc/engine.ts` | `calculatePlan` — **가격 없음** | PR2 비대상 |
| **매체 상세 스티키 견적** | `lib/media-detail-quantity.ts` | `calculateMediaQuoteByDays` / `calculateMediaQuoteFromOption` (`compare-quote`) | PR2 비대상 |
| **매체 비교** | `components/compare/compare-quote-calculator.tsx` | `calculateMediaQuoteFromOption` | PR2 비대상 |
| **홈/카탈로그 카드 가격** | `lib/metrics/media-price-adapter.ts` `resolveMediaPriceForDisplay` | 30일 기준 표시 | PR2 비대상 |
| **Admin 견적 작성** | `lib/admin-quote-lines.ts` | 자체 partial-rate·pro-rata (`compare-quote` lookup key) | `calculateQuote` **미사용** — admin 경로는 별도; PR2 후에도 동작 동일해야 함(간접 검증) |

**단일 분기 지점 (Step 2 목표)**: `calculateQuote` (또는 thin wrapper) 내부에서 `catalog_channel` → `PricingStrategy` 선택 **한 곳**.

---

### D. `buildQuoteWizardLineContext` — 병렬 경로 (PR1b-2)

위저드·플랜카트는 **`calculateQuote`를 거치지 않고** `buildQuoteWizardLineContext`로 라인 금액을 만든다.

- PR1b-2: `isQuoteWizardPriceOnInquiry()` — `type` null / `price` null / 단가 ≤0 → `priceOnInquiry: true`, 합계 제외, 「가격 문의」
- 서버 API는 `calculateQuote` → `assertQuoteCalculatorDisplayType` **throw** (잘못된 API 호출자용)

PR2에서 `FixedPeriodPricing`로 로직 이동 시, option-pricing 분기가 쓰는 `buildQuoteWizardLineContext` 호출은 **FixedPeriodPricing 구현 내부에 그대로 잔류**하면 위저드·서버 breakdown 정합성이 유지된다 (현재 `calculateQuote` L300-324).

---

## 1-2. `assertQuoteCalculatorDisplayType` 가드 — 현재 위치 및 이동 계획

### 현재 (PR1b-2 merge 기준)

| 위치 | 파일 | 호출 시점 |
|------|------|-----------|
| export + 함수 정의 | `lib/quote-calculator.ts` L40-49 | — |
| `toMediaItemForQuote()` L141 | 모든 `calculateQuote` 라인 계산 **공통** | `type` null이면 throw |
| `lineImpressions()` L187 | impressions 계산 **공통** | 동일 throw |

**문제**: `catalog_channel=online`에서 `type=null`은 **정상** (PR1b-2). 그러나 현재는 `calculateQuote`가 채널 분기 **전에** 가드를 호출하므로, online 매체가 API로 들어오면 offline 가드에 걸린다 (의도된 throw — PR1b-2 preview 검증).

### 이동 계획 (지시서 “후자” 확정)

```
calculateQuote(input)
  └─ for each media m:
       strategy = resolvePricingStrategy(m.catalogChannel)   ← 단일 분기
       strategy.calculateLine(...) / strategy.calculate(...)   ← per-line or batch

FixedPeriodPricing (offline):
  1. assertQuoteCalculatorDisplayType(m)   ← 최상단
  2. 기존 calculateQuote 라인 body 그대로

BudgetPricing (online):
  throw NOT_IMPLEMENTED (mediaId, PR2/PR5 메시지)
  — assertQuoteCalculatorDisplayType 호출하지 않음
```

**`catalogChannel` 미전달 legacy 호출** (감사 스크립트·일부 테스트): prod 34 표본은 전부 offline. selector는 **`catalogChannel !== 'online'` → FixedPeriodPricing** (undefined/null = offline 취급)로 하면 골든·legacy plan cart와 호환.

**위저드 경로**: `buildQuoteWizardLineContext`는 **`isQuoteWizardPriceOnInquiry`만** 사용 — 가드 이동과 **무관** (PR1b-2 report 확인).

---

## 1-3. 골든 스냅샷 표본 (기존 자산 재사용)

### 표본 구성 (34건)

| 출처 | ID 수 | 비고 |
|------|-------|------|
| PR0 prod post | 30 | `reports/pr0-prod-price-post.json` `sampleIds` |
| PR1a classified A2/A3/A3b | 4 | `scripts/audit/pr1a-prod-price-check.mts` `CLASSIFIED` 배열 |

**유형 분포 (PR0 results 집계)**: dooh 21 / static 5 / mobile 4 (×3 scenarios = 90 rows). 지시서 “dooh 20 / static 5 / mobile 5”와 1건 차이 — **PR0 prod post JSON이 SSOT**.

**A-6 부분 요율 보간**: PR0 표본 내 partial-rate 매체 포함; 3 시나리오 baseline에 이미 반영됨.

### 시나리오 — 지시서 vs 실제 자산 **불일치 (보고)**

| | 지시서 문구 | 실제 3회 PR 검증 자산 |
|---|------------|----------------------|
| 기간 키 | 1/3/5/7/15/30일 × 예산대 × 보간 | **3 시나리오만** |
| 시나리오 이름 | (미명시) | `calendar_14d`, `wizard_14days`, `wizard_1month` |
| 입력 | Mar 1–14 2026, `periodKey` undefined / `14days` / `1month` | `pr1a-prod-price-check.mts` L39-45 |
| row 수 | — | **102** (= 34 × 3) |

**Step 2 골든 파일 권장**:

1. **재계산 금지** — 아래에서 복사:
   - 30건 × 3: `reports/pr0-prod-price-post.json` → `results[]` (`totalWon` SSOT; `lineSupplyWon` 등 풀 필드 보유)
   - 4건 × 3: `reports/pr1a-prod-price-check.json` → `classified[]` (`totalWon`만 있음 — pr0와 동일 필드로 merge 시 pr0 형식 맞춤)
2. 커밋 경로 예: `lib/pricing/__tests__/golden/pr2-quote-snapshot.json`
3. 회귀 테스트: 리팩토링 후 `calculateQuote` 동일 입력 → `totalWon` (및 선택적으로 full breakdown) **바이트级 일치**

**승인 요청**: Step 2에서 **102×3 시나리오(기존 3종)** 로 골든 고정. 지시서의 6 period key × 예산대 확장은 **PR2 범위 밖** (새 baseline 생성 = 재계산)으로 보고.

---

## 1-4. `BudgetPricing` 스텁 계약

### `MediaOnlineSpec` (PR1b-1, 변경 없음)

```
platform, minBudget, cpcMin?, cpcMax?, cpmMin?, cpmMax?,
targetingOptions[], strengths[], kpiHints[], bestFor[]
```

1:1 `Media` (`catalog_channel='online'`).

### 스텁 입력 (제안 — 기존 `QuoteCalculatorMedia` 확장)

```ts
type BudgetPricingInput = {
  media: QuoteCalculatorMedia & {
    catalogChannel: 'online';
    onlineSpec?: Pick<MediaOnlineSpec,
      'platform' | 'minBudget' | 'cpcMin' | 'cpcMax' | 'cpmMin' | 'cpmMax'
    > | null;
  };
  campaign: Pick<CalculateQuoteInput, 'startDate' | 'endDate' | 'periodKey' | 'discountRate'>;
};
```

- `calculateQuoteFromMediaIds`: `catalogChannel='online'` row에 `onlineSpec` join select 추가 (Step 2)
- **`type`/`price` null 허용** — FixedPeriod 가드 미적용
- **출력**: throw `BUDGET_PRICING_NOT_IMPLEMENTED` (메시지에 `mediaId`, `PR2 미구현 · PR5 예정`)

### 에러 ↔ 위저드 「가격 문의」 (Step 3 설계)

| 경로 | online / type=null 동작 |
|------|-------------------------|
| 위저드 UI | `buildQuoteWizardLineContext` → `priceOnInquiry: true` — **throw 없음** |
| `calculateQuote` API | `BudgetPricing` throw |
| PDF export / inquiry draft | `calculateQuoteFromMediaIds` → throw — **현재도 online smoke 시 동일**; export는 offline-only quote 전제 |

PR3 전까지 online은 위저드 catalog에서 차단 예정 — PR2 스모크는 PR1b-2와 동일 (임시 row insert → `calculateQuote` throw 확인 → delete).

---

## 2. 스키마 / DB 마이그레이션

**PR2 신규 migration 없음.**

- `Media.catalogChannel` — PR1a
- `Media.type` / `Media.price` nullable — PR1b-2 (`20260902103000_pr1b2_nullable_type_price`)
- `media_online_spec` — PR1b-1

prod deploy 전 Neon backup은 merge 관례대로 수행 (스키마 변경 없어도 hotfix 교훈).

---

## 3. Step 2 구현 초안 (승인 후)

| # | 작업 |
|---|------|
| 2-1 | `main`에서 `feat/pr2-pricing-strategy` 분기 |
| 2-1 | 골든 JSON 커밋 (§1-3, 리팩토링 **전**) |
| 2-2 | `lib/pricing/strategy.ts` — `PricingStrategy` interface |
| 2-2 | `lib/pricing/resolve-pricing-strategy.ts` — **유일한** `catalog_channel` 분기 |
| 2-3 | `lib/pricing/fixed-period-pricing.ts` — `calculateQuote` body 이동 + 가드 최상단 |
| 2-4 | `lib/pricing/budget-pricing.ts` — 스텁 throw |
| 2-5 | `quote-calculator.ts` — thin router + 기존 export 유지 |
| — | `lib/pricing/index.ts` — 기존 re-export barrel과 namespace 정리 (충돌 방지) |

**건드리지 않음**: `compare-quote`, `buildQuoteWizardLineContext` 본문, admin-quote-lines, planner engine, `media_online_spec` schema.

---

## 4. 리스크 / 승인 시 확인할 점

1. **시나리오 범위**: 102 rows (3 scenarios) 로 골든 고정해도 되는지?
2. **`compare-quote` / 위저드 경로**: PR2는 `calculateQuote`만 Strategy화 — UI parity는 `buildQuoteWizardLineContext` 공유로 유지. 별도 Strategy 통합은 **후속 PR**?
3. **Admin 견적** (`admin-quote-lines.ts`): `calculateQuote` 미사용 — PR2 회귀 테스트에 **미포함**. Step 3 수동 admin spot-check 권장.
4. **`wizard_1month` periodKey**: `isQuoteCampaignPeriodKey('1month')` === false → calendar 경로와 동일 breakdown (골든에 반영됨). 이동 시 **동작 변경 금지**.

---

## 5. 완료 체크 (Step 1)

- [x] CalcEngine(quote-calculator) 진입점 전수
- [x] 현행 입출력 시그니처 정리
- [x] `assertQuoteCalculatorDisplayType` 위치 및 FixedPeriod 이동 계획
- [x] 34건 골든 표본·기준 파일·시나리오 불일치 보고
- [x] BudgetPricing ↔ `media_online_spec` 계약
- [x] DB migration 필요 없음 확인

**→ Step 1 보고 완료. 승인 후 Step 2 (골든 커밋 → 리팩토링) 진행.**
