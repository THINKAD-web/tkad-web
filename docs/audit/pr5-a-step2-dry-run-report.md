# PR5-a Step 2 — Dry-run 보고

**작성일**: 2026-09-03  
**브랜치**: `feat/pr5-a-budget-pricing` (base `633209cc`)  
**상태**: 구현 + 자동 검증 완료 — **merge/Preview 승인 전**

---

## 0. Executive Summary

| 항목 | 결과 |
|------|------|
| `BudgetPricing` | ✅ 14건 계산 / 9건 inquiry zero-line |
| `hasOnlinePricingSpec()` / `isPricingUnavailable()` | ✅ 재정의 — **list payload에 `onlineSpec` 없음 → browse/compare/wizard 회귀 없음** |
| L1 상세 UI | ✅ calculable 14: 참고 CPC/CPM + 월 예산 + 성과 추정 / inquiry 9: 「가격 문의」만 |
| 예산 전달 | ✅ A-plan — `QuoteMediaSelectionSnapshot.lineTotalWon` |
| Golden | ✅ **14 slugs × 3** (`at_min` / `2x_min` / `large`=10M) = 42 rows |
| PR2 offline golden | ✅ **102/102 pass** (회귀 없음) |
| `npm run build` | ✅ pass |
| Admin 5분 grep | ✅ 수행 — **신규 500 위험 없음** (잔여 low-risk 2건 기록) |

---

## 1. 구현 범위 (PR5-a)

### 1-1. 신규·변경 파일

| 파일 | 역할 |
|------|------|
| `lib/pricing/online-performance-estimate.ts` | dmpilot `estimatePerformance` / `pricingLabel` 이식 |
| `lib/pricing/budget-pricing.ts` | `BudgetPricing.calculateLine()` — `lineTotalWon` + minBudget 검증 |
| `lib/pricing-unavailable.ts` | `hasOnlinePricingSpec()` + `isPricingUnavailable()` 재정의 |
| `lib/media-data.ts` | `MediaOnlineSpecView`, `MediaItem.onlineSpec` |
| `lib/public-media-catalog.ts` | **detail 전용** `onlineSpec` join (`public-media-detail-v2` cache key) |
| `components/media-detail/online-media-sticky-quote-section.tsx` | L1 UI |
| `components/media-detail/media-detail-sticky-quote-panel.tsx` | online 분기 |
| `lib/pricing/__tests__/golden/pr5-online-budget-snapshot.json` | 14×3 golden |
| `scripts/audit/pr5-build-online-golden.mts` | golden 재생성 |

### 1-2. PR5-b에서 하지 않음 (의도적)

- `isQuoteWizardSelectableMedia` / `canAddMediaToPlanCart` — online 차단 유지
- Browse 카드 참고 단가 — `formatBrowseCardPriceLabel` early `isOnlineCatalogMedia` → 전원 「가격 문의」
- Compare / wizard / planner gate 해제

---

## 2. `isPricingUnavailable()` 재정의 — 8개 호출처 회귀 분석

**재정의**:

```typescript
// online: onlineSpec에 CPC/PM 중 하나라도 있으면 billable (false)
// onlineSpec 없음 → unavailable (true) — list/compare/wizard payload와 동일
if (isOnlineCatalogMedia(media)) return !hasOnlinePricingSpec(media);
```

**핵심 안전장치**: `onlineSpec`은 **`loadMediaDetailRowFromDb`만** join. list/browse/compare/wizard `MediaItem`에는 **필드 자체가 없음** → calculable 14도 list 경로에서는 여전히 `unavailable=true`.

| # | 표면 | 파일 | PR5-a 영향 | 회귀 |
|---|------|------|------------|------|
| 1 | Browse 카드 (online early return) | `lib/media-card-display.ts:80` | `isOnlineCatalogMedia` → 무조건 inquiry | **없음** |
| 2 | Browse 카드 (offline SSOT) | `lib/media-card-display.ts:88` | offline만 `isPricingUnavailable` | **없음** |
| 3 | Quote wizard inquiry | `lib/quote-wizard-pricing.ts:119` (`isQuoteWizardPriceOnInquiry`) | wizard media에 `onlineSpec` 없음 → online 전원 inquiry | **없음** |
| 4 | Compare line cost | `lib/compare-quote.ts:116` | compare catalog에 `onlineSpec` 없음 | **없음** |
| 5 | Compare unit price | `lib/compare-quote.ts:142` | 동일 | **없음** |
| 6 | Compare by days | `lib/compare-quote.ts:261` | 동일 — null price offline path 진입 안 함 | **없음** |
| 7 | Detail sticky est. cost | `lib/media-display-currency.ts:162` | **detail만** `onlineSpec` 포함 → calculable 14 ₩ 표시 | **의도된 변경 (L1)** |
| 8 | Compare format (간접) | `lib/compare-quote.ts:545` `formatCompareQuoteLineCost` | `line.pricingUnavailable` 플래그 — #4–6에서 설정, online unchanged | **없음** |

**PR5-b 주의**: list DTO에 `onlineSpec`을 넣는 순간 #3–6이 바뀌므로, gate 해제 PR에서 compare/wizard 전용 online budget path 필요.

---

## 3. Admin 5분 grep (null `type` / `price` — PR525 재발 방지)

### 3-1. `type.toLowerCase()` (admin + lib)

| 위치 | null-safe? | online 23건 |
|------|------------|-------------|
| `admin-medias-client.tsx:249–254` `typeBadgeLabel` | ✅ `!type?.trim()` → 「온라인」 (PR525) | safe |
| `admin-medias-client.tsx:277–280` `matchesCategoryFilter` | ✅ early `!type?.trim()` return false | safe |
| `admin-quote-new-client.tsx:324` | ⚠️ `m.type.toLowerCase()` — type null이면 throw | online은 quote picker에 **gate**되어 진입 경로 제한적 |
| `media-hub/page.tsx:634` | ⚠️ `m.price.toLocaleString()` — price null이면 throw | online row가 hub 목록에 노출될 때만 위험 |
| 기타 map/planner/creatives | offline type 전제 | N/A |

### 3-2. Admin list price 표시

| 위치 | 처리 |
|------|------|
| `admin-medias-client.tsx` `formatAdminListPrice(price)` | ✅ null → 「가격 문의」 (PR525) |
| `lib/admin-media-dto.ts` | ✅ nullable DTO |

### 3-3. 판정 (PR5-a follow-up — 2026-09-03 재조사)

| 위치 | 도달 가능? | 증거 | PR5-a/PR5-b |
|------|-----------|------|-------------|
| **`media-hub/page.tsx:634`** | **✅ 즉시 도달** | `/api/admin/medias` 전체 로드 → `displayList.map`에서 **online 23건 포함**. `price: null` → `toLocaleString()` **페이지 로드 시 client crash** | **PR5-b P0** (PR525와 동급) |
| **`admin-quote-new-client.tsx:324`** | **✅ 검색 시 도달** | `take=5000` 전체 catalog — online 포함. 검색어 입력 시 `filtered` useMemo가 **모든 row**에 `m.type.toLowerCase()` → type null online에서 throw | **PR5-b P0** |
| **`admin-quote-new` picker (검색 없음)** | **✅ 라인 추가 가능** | `catalogChannel` gate **없음** — 「라인 추가」로 online 직접 추가 가능 (₩0 표시). slug 우회 불필요 | PR5-b — online admin quote UX 정리 |

- **PR525에서 고친 `/admin/medias` SSR list**: ✅ 유지
- **"정말 도달 불가능" 아님** — media-hub는 admin shell nav(`/admin/media-hub`)에 노출되어 **지금 prod에서도 열면 깨질 수 있음**

### 3-4. Preview 수동 — below_min UX (PR5-a 추가)

- calculable 상세: 예산 `< minBudget` → amber 안내 + 예상 비용 「가격 문의」 + 성과 범위 숨김
- inquiry 상세: minBudget·예산 입력 없음 — 「가격 문의」만

---

## 4. 자동 검증

```
npx tsx --test \
  lib/pricing/__tests__/online-performance-estimate.test.ts \
  lib/pricing-unavailable.test.ts \
  lib/pricing/__tests__/pr5-online-budget-golden.test.ts \
  lib/pricing/__tests__/pr2-golden-snapshot.test.ts \
  lib/quote-calculator.test.ts \
  lib/media-card-display.test.ts
→ 30/30 pass

npm run build → exit 0
```

| Suite | Rows | Result |
|-------|------|--------|
| PR2 offline golden | 34 × 3 = 102 | pass |
| PR5-a online golden | 14 × 3 = 42 | pass |
| Browse online inquiry | 1 test | pass |

Golden 재생성: `npx tsx ./scripts/audit/pr5-build-online-golden.mts`

---

## 5. 14 calculable / 9 inquiry (seed SSOT)

**Calculable (14)**: `ig-awareness-reach`, `ig-lead-gen`, `ig-conversion-shop`, `fb-traffic`, `fb-awareness`, `yt-awareness`, `kakao-traffic`, `naver-sa-brand`, `naver-sa-conversion`, `naver-sa-traffic`, `google-ads-search`, `google-ads-awareness`, `google-ads-lead`, `tiktok-spark-awareness`

**Inquiry (9)**: `meta-advantage-plus`, `naver-gfa-traffic`, `kakao-moment-message`, `youtube-action`, `google-pmax-conversion`, `karrot-local-traffic`, `baemin-ad-visit`, `app-uai-install`, `native-taboola-traffic`

---

## 6. Preview 수동 체크리스트 (승인 후)

- [ ] `/ko/media/online` — 카드 전원 「가격 문의」(browse early gate)
- [ ] calculable slug 상세 — CPC/CPM 참고 단가 + 예산 입력 + 도달/클릭 범위
- [ ] inquiry slug 상세 — 「가격 문의」만, minBudget 미표시
- [ ] `/ko/admin/medias` — 200, online row 「온라인」/「가격 문의」
- [ ] offline 상세/견적 — PR2 동작 유지

---

## 7. 다음 (PR5-b)

- Wizard/compare/planner gate 해제 + list DTO `onlineSpec` 전달 설계
- Compare online budget path (`calculateMediaQuoteByDays` online branch)
- Export/PDF online line (현재 inquiry-only export guard 유지 가능)
