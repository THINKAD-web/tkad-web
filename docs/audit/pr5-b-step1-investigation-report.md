# PR5-b Step 1 — 정문 차단 해제 선행 조사

**작성일**: 2026-09-03  
**base**: main `806cf79d` (PR5-a prod 반영 완료)  
**상태**: 조사 완료 — **승인 전 코드 변경 없음**

---

## 0. Executive Summary

| 항목 | 결론 |
|------|------|
| **PR5-b 범위** | PR5-a 이후 **남은 정문 차단 해제** + list DTO `onlineSpec` + admin quote UX — **통합 플래너 dmpilot 전환은 PR5-c** |
| **선행 완료 (PR5-a)** | `BudgetPricing`, detail L1, golden 42건, `isPricingUnavailable()` 재정의 — list payload에는 **`onlineSpec` 없음** |
| **핵심 리스크** | list DTO에 `onlineSpec` 추가 시 `isPricingUnavailable`만으로 compare/wizard 라벨이 바뀌지만, **budget 입력·게이트 해제 없이는 ₩0 또는 오작동** |
| **1-3 위저드 예산 UX** | **Step 2 분리 + 공유 budget 컴포넌트** 권장 — `lineTotalWon` = 월 예산(A-plan), global `periodKey`는 OOH 전용 |
| **1-4 Admin** | PR526 hotfix **코드·lineage 확인** — prod 로그인 실물 검증은 **Step 2 착수 전 1회 필수** |
| **1-5 통합 플래너** | DB `catalog_channel=online` 23건 **계속 제외** — digital leg는 `DIGITAL_CHANNELS` bridge (PR5-c) |
| **권장 해제 순서** | compare → wizard → plan cart → browse 카드 → brief OOH (표면별 Preview) |

---

## 1-1. PR5-a 이후 잔여 차단 전수 (Layer 1 — hard gate)

`onlineSpec` 유무와 **무관**하게 online 전체를 막는 SSOT:

| 함수 / 위치 | 파일 | 현재 동작 |
|-------------|------|-----------|
| `isQuoteWizardSelectableMedia` | `lib/pricing-unavailable.ts:53-57` | `catalogChannel=online` → **선택 불가** |
| `canAddMediaToPlanCart` | `lib/pricing-unavailable.ts:59-63` | 동일 → plan cart **담기 불가** |
| Browse 카드 early return | `lib/media-card-display.ts:80-82` | online → 무조건 「가격 문의」 |
| Brief 추천 카드 filter | `brief-step-two.tsx:74-76`, `brief-quick-rank.tsx:43-45` | `selectableCatalog = filter(isQuoteWizardSelectableMedia)` |
| Brief handoff strip | `lib/planner/brief/handoff.ts:145-147` | online ID → `blockedOnline`, mix 제외 |
| Detail CTA | `media-detail-quote-modal.tsx` | online → 「문의하기」만 (견적/플래너 링크 없음) |
| Admin quote picker | `admin-quote-new-client.tsx:316-319` | `quotePickerMedias = filter(isQuoteWizardSelectableMedia)` — **online 전원 picker 제외** |

**Layer 2 — spec-aware** (`isPricingUnavailable` → calculable 14 billable):

list DTO에 `onlineSpec` 없어 **현재 compare/wizard/list 경로는 전원 inquiry**. detail만 L1 calculable.

| 호출처 | 파일 | PR5-b에서 `onlineSpec` 추가 시 |
|--------|------|--------------------------------|
| Compare line cost | `lib/compare-quote.ts:116,142,261` | calculable → numeric 가능하나 **budget branch 없음** |
| Wizard inquiry label | `lib/quote-wizard-pricing.ts:312-336` | inquiry stub 해제되나 **OOH math → ₩0 위험** |
| Browse (early return 우선) | `media-card-display.ts:80` | **변화 없음** until L80 제거 |

---

## 1-2. list DTO `onlineSpec` 전달 설계

### 현행

| 경로 | Loader | `onlineSpec` |
|------|--------|--------------|
| Browse / quote / compare | `fetchPublicMediaCatalogList()` → `MediaCatalogListItem` | **없음** (`MEDIA_CATALOG_LIST_ITEM_KEYS`에 미포함) |
| Detail | `loadMediaDetailRowFromDb()` | **있음** (detail cache key) |
| Planner catalog | `fetchPlannerMediaCatalog()` | **없음** |

`catalogChannel`은 list DTO에 **이미 포함** (`media-catalog-list-dto.ts:48,172,247`).

### PR5-b 권장: **E2 — online row만 slim join**

```typescript
// MediaCatalogListItem + MEDIA_CATALOG_LIST_ITEM_KEYS에 추가:
onlineSpec?: {
  platform, productType,
  cpcMin, cpcMax, cpmMin, cpmMax, minBudget
} | null;
```

| 옵션 | 장점 | 단점 |
|------|------|------|
| **E2 online-only join** (권장) | payload 최소, compare/wizard만 spec 수신 | list select 분기 필요 |
| E1 full catalog | 단순 | 889+23 cache 크기 증가 |
| E3 lazy fetch on select | list 무변 | wizard select 시 추가 round-trip |

**구현 포인트**

1. `PUBLIC_MEDIA_ONLINE_SPEC_SELECT` (detail과 동일 6필드) list query에 **online `catalog_channel` row만** join
2. `mediaItemToCatalogListItem` / `catalogListItemToMediaItem` 왕복
3. ISR cache tag — detail과 list cache key 분리 유지 (PR5-a `public-media-detail-v2` 패턴)
4. **게이트 해제와 동시 커밋 금지** — spec 추가만으로 Layer 2가 켜지므로, compare/wizard budget path를 **같 PR 내 선행/동시** 구현

---

## 1-3. 견적 위저드 예산 UX 설계 ★

### 현행 데이터 흐름

```
quote-page-client
  filteredCatalog ← isQuoteWizardSelectableMedia (online 제외)
  period (Step 2) ← global OOH 1/3/5/7/15/30일
  buildQuoteWizardLineContext ← OOH unit × campaignUnits
  submitMediaSelections[].lineTotalWon = lineTotalMan × 10_000  ← online budget 경로 없음

POST /api/quote/create → calculateQuote → BudgetPricing
  budgetWon = sel.lineTotalWon  ← 서버는 PR5-a에서 준비됨
```

**갭**: 클라이언트 preview(PDF sidebar)는 `buildQuoteWizardLineContext`만 사용 → **서버 export와 불일치**.  
`onlineSpec`만 list에 넣고 gate만 풀면 calculable online이 **priceOnInquiry=false, lineTotalMan=0** — inquiry보다 나쁜 UX.

### OOH vs Online 의미 분리

| 축 | OOH | Online |
|----|-----|--------|
| 가격 단위 | 일/월 상품가 × 기간 | **월 예산** (`lineTotalWon`) |
| `periodKey` | 필수 (partial rate, proration) | **금액 계산 무관** (`BudgetPricing`은 `periodDays` 메타만) |
| 성과 추정 | `dailyFootfall` × days | `estimatePerformance(spec, budgetWon)` |

**Mixed cart**: global period는 OOH용 유지; online 라인은 **라인별 월 예산** 독립.

### UI 옵션 비교

| 옵션 | 설명 | 판정 |
|------|------|------|
| A — Step 1 per-line budget | 선택 시 quantity 옆 budget 입력 | Step 1 과밀 |
| **B — Step 2 split** | OOH period + online 월 예산 섹션 | **Mixed/pure-online UX에 적합** |
| **C — 공유 컴ponent** | `OnlineMediaStickyQuoteSection` → `OnlineMediaBudgetFields` 추출 | **DRY, detail과 동일 검증 재사용** |
| D — client `BudgetPricing` parity | sidebar total = server | preview 정확도 — **필수 보조** |

### **권장 설계 (Step 2 승인안)**

1. **상태**: `onlineBudgetWonByMediaId: Record<string, number>`, default `spec.minBudget ?? 1_000_000`
2. **UI (B+C)**: Step 2에
   - OOH: 기존 period `<select>` 유지
   - Online: 선택된 calculable 라인마다 `OnlineMediaBudgetFields` (below-min amber = detail과 동일)
   - Pure-online cart: period UI **숨기거나** “온라인 월 예산 기준” 안내
   - Inquiry 9건: picker **계속 제외** (`hasOnlinePricingSpec` false)
3. **Snapshot wiring**:
   ```typescript
   lineTotalWon: isOnlineCatalogMedia(m)
     ? onlineBudgetWonByMediaId[m.id] ?? 0
     : Math.round((line?.lineTotalMan ?? 0) * 10_000)
   ```
4. **Preview (D)**: online 라인용 `buildQuoteWizardOnlineLineContext(media, budgetWon)` — `lineTotalMan = budgetWon/10_000`, `priceOnInquiry = budget<=0 || belowMin`
5. **Gate 변경**: `isQuoteWizardSelectableMedia` → **`hasOnlinePricingSpec(media)` 허용** (inquiry online은 false 유지)
6. **Deeplink (optional)**: `quote-deeplink.ts`에 `budgetMap=mediaId:won` — detail → wizard handoff (PR5-b 후반 또는 PR5-b+)
7. **Export guard**: `BUDGET_PRICING_BUDGET_REQUIRED` / `BELOW_MIN` wizard submit 전 클라이언트 검증

### inquiry 9건 위저드 정책

**계속 차단** (picker 미노출). 근거 데이터 없음 — PR5 원칙 “문의 전용 영구 유지”.

---

## 1-4. Admin 표면 재확인 ★

### PR526 hotfix lineage (prod `806cf79d`)

```
806cf79d  PR5-a (#527)
4db46930  admin hotfix (#526)  ← ancestor ✅
```

| 표면 | PR5-a dry-run 판정 | **현행 코드 @806cf79d** | Prod auth 실물 |
|------|-------------------|-------------------------|----------------|
| `/admin/medias` | PR525 유지 | `formatAdminListPrice` SSOT | 200 (무auth curl) ✅ |
| `/admin/media-hub` | P0 crash | L645 `formatAdminListPrice(m.price)` | 200 ✅ — **crash 패턴 제거됨** |
| `/admin/quotes/new` picker | P0 search crash + online 노출 | L316-319 filter **있으나** `normalizeAdminMediaRow`가 `catalogChannel` drop → filter **no-op** | **❌ prod 실물 FAIL (2026-09-03)** |

### 코드 근거 (admin-quote-new)

```316:333:components/admin-quote-new-client.tsx
  /** PR5 hotfix — online rows excluded from new-line picker (₩0 silent quote risk). */
  const quotePickerMedias = useMemo(
    () => medias.filter((m) => isQuoteWizardSelectableMedia(m)),
    [medias],
  );
  // ...
        (m.type?.toLowerCase().includes(q) ?? false),
```

### Prod 실물 검증 — **Step 2 착수 전 필수 (1회)**

Preview PR5-a/PR526에서 확인했으나 **prod authenticated session으로 picker 목록·검색·media-hub 스크롤 미확인**.

| # | 확인 항목 | 기대 |
|---|-----------|------|
| 1 | `/ko/admin/quotes/new` → 「라인 추가」 picker | **online 0건** (calculable 14 포함 전부 미노출) |
| 2 | picker 검색 (platform명, slug 일부) | **throw 없음**, 결과 offline만 |
| 3 | `/ko/admin/media-hub` 목록 스크롤 | online 23건 「가격 문의」·「온라인」, **crash 없음** |
| 4 | 기존 quote edit (online line 포함 시) | PR5-b 범위에서 UX 정책 결정 필요 |

**방법**: admin 계정 Playwright storageState 또는 수동 스크린샷.  
**현재 세션**: Playwright 설정 없음, admin credential 미주입 — **Step 1에서는 코드+lineage로 indirect 확인, 실물은 Step 2 gate**.

### PR5-b admin UX 결정 (조사 권고)

| 선택지 | 설명 |
|--------|------|
| **A (권장, 현행 유지)** | Admin picker에서 online **계속 제외** — public wizard gate와 동기 |
| B | Calculable 14 admin picker 허용 + budget 입력 — scope 증가, sales 워크플로 별도 |

---

## 1-5. 통합 플래너 제외 확인 ★

### 결론: **PR5-b에서 통합 플래너(`/planner/integrated`)는 scope 밖 — DB online row 제외 유지**

| 경로 | Online 처리 | PR5-b |
|------|-------------|-------|
| **Integrated planner OOH leg** | `resolvePlannerMediaKind()` → `type=null` online → **null** → `matchesPlannerCategory` false → recommend pool **제외** | **변경 없음** |
| **Integrated digital leg** | `loadDigitalChannelsForIntegratedPlanner()` → dmpilot BFF + `DIGITAL_CHANNELS` static fallback | **PR5-c** (로컬 전환) |
| **Brief `/planner` OOH** | `isQuoteWizardSelectableMedia` filter + handoff strip | **PR5-b 후보** (brief만 gate 해제) |
| **Brief `ooh_digital` mode** | `BriefDigitalPanel` + `DIGITAL_CHANNELS` — **DB online row 아님** | PR5-c와 동일 bridge |

### 근거

1. Integrated OOH recommend (`integrated-ooh-recommendation-panel.tsx`) → `recommendPlannerMedia` on OOH catalog — online은 kind=null로 **silent exclusion** (`lib/planner-logic.ts:151-174`)
2. Digital recommend (`digital-recommendation-panel.tsx`) — platform bucket (`naver`, `meta`, …) 은 **seeded DB media slug와 다른 제품 모델**
3. PR3 Step 1: “통합 플래너 OOH leg에서 online 차단” — PR5-c까지 유지 (`docs/audit/pr3-step1-investigation-report.md`)
4. PR5 원 지시서 1-6 (dmpilot API 제거) = **PR5-c** — PR5-b와 혼동 금지

### Brief planner PR5-b 범위 (통합과 분리)

| 항목 | PR5-b 포함? |
|------|-------------|
| `selectableCatalog` filter 완화 (calculable 14) | ✅ 가능 — 별도 sub-commit |
| `handoff.ts` online strip 완화 | ✅ — budget 필드 handoff 설계 필요 |
| `rebuildBriefRecommendedMix` **leak** | ⚠️ `brief-step-two.tsx:233-238` — full catalog 사용, online autofill 유입 가능 → **filter 추가 필수** |
| Integrated planner | ❌ **제외** |

---

## 1-6. compare / browse / plan cart 보조 설계

### Compare (`calculateMediaQuoteByDays`)

- Online + spec + budget 없음 → OOH path (`price: null` → 0) **오작동**
- **필요**: `calculateOnlineMediaQuoteByBudget(media, budgetWon)` 또는 compare UI에 per-media budget state (wizard와 state 공유 패턴)
- Impressions: `estimateImpressionsFromBudget`, not `dailyFootfall × days`

### Browse 카드

- L80 early return 제거 후 calculable 14: `onlinePricingLabel(spec)` 또는 「월 N만원~」 (`minBudget` 기반)
- Inquiry 9: 「가격 문의」 유지

### Plan cart

- `canAddMediaToPlanCart` → calculable online 허용
- **Gap**: `addManyToPlanCart` (`plan-cart.ts:409-448`) — gate **bypass** → PR5-b에서 동일 검사 추가
- Cart item에 `lineTotalWon` / budget 저장 필드 필요 여부 조사 → `PlanCartItem` JSON 확장 or wizard handoff 시 snapshot

### Detail CTA (PR5-b 후반)

- Calculable 14: 「예산 입력하고 견적 받기」→ `/quote?media=…&budgetMap=…`
- Inquiry 9: 「문의하기」 유지

---

## 1-7. 권장 해제 순서 (표면별 sub-commit)

PR5 원칙 “하나 풀고 검증” + PR5-a 안전장치:

```
0. [선행] list DTO onlineSpec (online-only join) — compare/wizard budget path와 같은 PR 묶음
1. compare-quote + budget input
2. quote wizard (1-3 설계)
3. plan cart (+ addMany gate fix)
4. browse 카드 참고 단가
5. brief OOH (integrated 제외)
6. detail CTA deeplink (optional tail)
```

각 단계: Preview calculable 14 + inquiry 9 + offline smoke + golden 144 regression.

---

## 1-8. PR5-b vs PR5-c 경계 (재확인)

| | PR5-b | PR5-c |
|---|-------|-------|
| BudgetPricing | ✅ PR5-a | — |
| Public gate 해제 | ✅ | — |
| list `onlineSpec` | ✅ | — |
| Integrated planner dmpilot BFF 제거 | ❌ | ✅ |
| `DIGITAL_CHANNELS` fallback 제거 | ❌ | ✅ (로컬 검증 후) |
| M2M / `/api/internal/*` 제거 | ❌ | ✅ |

---

## 1-9. Step 2 착수 전 체크리스트

- [ ] **Admin prod 로그인 실물 4항목** (§1-4)
- [ ] 1-3 위저드 UX 설계 승인 (Step 2 split + shared component)
- [ ] 1-5 통합 플래너 제외 승인
- [ ] list DTO E2 vs E3 최종 선택
- [ ] Admin picker 정책 A(제외 유지) vs B(허용)
- [ ] Brief planner online 포함 여부 (integrated와 별도 결정)

---

## 부록 — 핵심 파일 인덱스

| 관심 | 경로 |
|------|------|
| Gate SSOT | `lib/pricing-unavailable.ts` |
| List DTO | `lib/media-catalog-list-dto.ts`, `lib/public-media-catalog.ts` |
| Wizard client | `app/[locale]/(site)/quote/quote-page-client.tsx` |
| OOH line math | `lib/quote-wizard-pricing.ts` |
| Compare | `lib/compare-quote.ts`, `components/compare/compare-quote-calculator.tsx` |
| Detail budget UI | `components/media-detail/online-media-sticky-quote-section.tsx` |
| Server pricing | `lib/pricing/budget-pricing.ts`, `lib/quote-calculator.ts` |
| Plan cart | `lib/plan-cart.ts` |
| Brief handoff | `lib/planner/brief/handoff.ts`, `rebuild-mix.ts` |
| Integrated (제외) | `lib/planner/digital-catalog-bridge.ts`, `components/planner/integrated/*` |
| Admin | `components/admin-quote-new-client.tsx`, `lib/admin-media-dto.ts` |
| PR5-a baseline | `docs/audit/pr5-a-step2-dry-run-report.md` |
