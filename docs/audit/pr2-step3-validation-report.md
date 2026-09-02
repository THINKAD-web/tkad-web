# PR2 Step 3 — Preview validation 보고

**작성일**: 2026-09-03  
**브랜치**: `feat/pr2-pricing-strategy`

---

## 1. 자동 검증

| Check | Result |
|-------|--------|
| Golden 102 rows | **pass** |
| `quote-calculator.test.ts` | **8/8 pass** |
| `npm run build` (Step 2) | **pass** |
| BudgetPricing smoke | **pass** — `reports/pr2-preview/validation-report.json` |

### BudgetPricing smoke (Preview DB)

- 임시 online row insert → `calculateQuote` / `calculateQuoteFromMediaIds` / `buildQuoteExportPayload` 모두 **`BUDGET_PRICING_NOT_IMPLEMENTED`** throw
- delete 후 `catalog_channel=online` **0건**

---

## 2. PDF / Admin — 사용자 노출 (코드 경로 분석 + smoke)

### `calculateQuoteFromMediaIds`를 **직접** 호출하는 PDF 경로

| 경로 | 에러 처리 | 사용자에게 보이는 것 |
|------|-----------|---------------------|
| **`POST /api/quote/export`** (위저드 Step 4 PDF) | `catch → 500`, body **`"Failed"`** | 원시 에러 문자열 **미노출** |
| **`GET /api/quote/[id]/pdf`** (저장 OoHQuote) | new builder 실패 시 **`catch → legacy PDF fallback`** | **200 PDF** (레거시 빌더) 또는 최외곽 500 `"Failed"` — **`BUDGET_PRICING…` 미노출** |
| **`GET /api/quote/[id]/pptx`** | 동일 패턴 (`buildQuoteExportPayload`) | export route와 유사 |

### Admin 견적 PDF

| 경로 | `calculateQuote` 호출 | BudgetPricing 영향 |
|------|----------------------|---------------------|
| **`POST /api/admin/quotes/pdf`** (draft) | **없음** — 클라이언트가 넘긴 `unitPriceWon`/`lineTotalWon` 사용 | **없음** (admin UI가 recalc 안 하면) |
| **`GET /api/admin/quotes/[id]/pdf`** (saved) | **없음** — DB `QuoteItem` 금액 사용 | **없음** |

### 위저드 UI (클라이언트)

- `buildQuoteWizardLineContext` → online/`type=null` 시 **`priceOnInquiry: true`** → 「가격 문의」
- `calculateQuote` **미호출** — PR1b-2 안전망 유지

---

## 3. 리스크 메모 (PR3 전)

1. **위저드 PDF export (`POST /api/quote/export`)** — online ID가 `mediaIds`에 들어가면 **500 Failed** (스택/에러코드 미노출). PR3 정문 차단으로 online 선택 자체를 막을 예정.
2. **OoHQuote PDF** — online이 `mediaIds`에 있으면 **레거시 PDF로 fallback** (잘못된 금액 PDF 가능). PR3에서 online 견적 저장/내보내기 차단 필요.
3. **Admin** — catalog line 추가 시 서버 recalc 경로가 붙으면 BudgetPricing 영향 가능; 현재 draft PDF는 precomputed rows.

---

## 4. 수동 UI spot-check (Preview 배포 후)

- [ ] 위저드: offline-only cart 금액 · 「가격 문의」 mixed cart (PR1b-2 회귀)
- [ ] 플랜카트: 저장 플랜 렌더링
- [ ] PDF: offline 견적 export 정상

---

## 5. merge 후 (prod)

- [ ] deploy **Ready** + SHA 일치
- [ ] Neon backup
- [ ] 102-row golden vs prod price re-check (`pr1a-prod-price-check.mts` 패턴)
- [ ] **prod smoke 금지** — Preview에서만 online insert 검증 완료
