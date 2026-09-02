# PR2 Step 2 — dry-run 보고

**작성일**: 2026-09-03  
**브랜치**: `feat/pr2-pricing-strategy`

---

## 1. 표본 카운트 검증

| 항목 | 값 |
|------|-----|
| `pr0-prod-price-post.json` sampleIds | **30** |
| PR1a classified (A2/A3/A3b) | **4** (pr0와 overlap **0**) |
| Union unique | **34** |
| 시나리오 | `calendar_14d`, `wizard_14days`, `wizard_1month` |
| Expected rows | **102 = 34 × 3** ✓ |

### dooh 20/5/5 vs dooh 21/5/4 — 원인

PR0 샘플 스크립트(`scripts/audit/pr0-preview-price-snapshot.mjs`) **의도**:

```
prod: subway 8 + digital(partial/options) 8 + digital(plain) 6 + static 5 + mobile 5 → dedupe → slice(30)
```

실제 `pr0-prod-price-post.json` results 집계: **dooh 21 / static 5 / mobile 4**.

- **원인**: `subway`·`digital`·`digitalPlain` 쿼리가 모두 `type IN ('digital','dooh')`로 **겹침** → `Set` dedupe 후 `slice(0,30)`으로 mobile 1건이 탈락, dooh 1건이 추가됨.
- **결론**: 문서 “20/5/5”는 **쿼리 limit 합산 오.summary**이며, **prod JSON(21/5/4)이 SSOT**. 골든 진행에 문제 없음.

골든 JSON `typeCounts` (fixture 빌드 시): dooh 23 / static 6 / mobile 5 — pr0 30건 type + classified 4건 type 합산 (classified에 dooh 2·mobile 1·static 1 추가).

---

## 2. 골든 스냅샷

| 파일 | 설명 |
|------|------|
| `lib/pricing/__tests__/golden/pr2-quote-snapshot.json` | 34 media + 102 expected (pr0/pr1a에서 **복사**) |
| `lib/pricing/__tests__/golden/prod-only-media-fixtures.json` | `cmtd4wpic…` (preview DB 없음) |
| `lib/pricing/__tests__/golden/classified-media-fixtures.json` | A3 dooh 2건 prod `unitPriceWon` override |
| `scripts/audit/pr2-build-golden-snapshot.mts` | 재생성·self-check 스크립트 |

**Fixture 원칙**: `expected.totalWon`은 pr0/pr1a에서 복사(재계산 없음). `media.price`는 prod baseline `unitPriceWon`(pr0 post) — preview DB raw price는 prod와 encoding drift(10×) 있어 **golden 입력으로 사용하지 않음**.

빌드 시 `calculateQuote`로 102건 self-check 후 JSON write.

---

## 3. 코드 변경 요약

| 파일 | 변경 |
|------|------|
| `lib/pricing/strategy-types.ts` | `PricingStrategy`, `QuoteCalculatorMedia`, `QuoteLineItem` |
| `lib/pricing/resolve-pricing-strategy.ts` | **유일한** `catalog_channel` 분기 |
| `lib/pricing/fixed-period-pricing.ts` | 기존 OOH 로직 이동 + `assertQuoteCalculatorDisplayType` 최상단 |
| `lib/pricing/budget-pricing.ts` | `BUDGET_PRICING_NOT_IMPLEMENTED` throw |
| `lib/quote-calculator.ts` | thin router; `onlineSpec` join on `calculateQuoteFromMediaIds` |
| `lib/quote-calculator.test.ts` | online → BudgetPricing throw |
| `lib/pricing/__tests__/pr2-golden-snapshot.test.ts` | 102-row 회귀 |
| `docs/audit/pr1b2-pr3-online-quote-gate.md` | PR3 정문 차단: compare + media detail 추가 |

`undefined | null | 'offline'` → `FixedPeriodPricing`. `'online'` → `BudgetPricing`.

---

## 4. 검증 결과 (local dry-run)

| Check | Result |
|-------|--------|
| `pr2-golden-snapshot.test.ts` | **8/8 pass** (102 rows exact `totalWon`) |
| `quote-calculator.test.ts` | pass |
| `npm run build` | **pass** (exit 0) |

---

## 5. 다음 (Step 3)

- Preview push + golden CI
- BudgetPricing smoke (임시 online row insert → throw → delete)
- UI spot-check (위저드·플랜카트·PDF)
- 3-account legacy plan cart (prod merge 후)
