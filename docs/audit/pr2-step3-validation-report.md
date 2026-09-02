# PR2 Step 3 — Preview validation 보고

**작성일**: 2026-09-03 (PDF export 가드 반영)  
**브랜치**: `feat/pr2-pricing-strategy`

---

## 1. 자동 검증

| Check | Result |
|-------|--------|
| Golden 102 rows | **pass** |
| `quote-calculator.test.ts` | **8/8 pass** |
| `budget-pricing-export-guard.test.ts` | **pass** |
| `npm run build` (Step 2) | **pass** |
| BudgetPricing smoke | **pass** — `reports/pr2-preview/validation-report.json` |

### BudgetPricing smoke (Preview DB)

- 임시 online row insert → `calculateQuote` / `calculateQuoteFromMediaIds` / `buildQuoteExportPayload` 모두 **`BUDGET_PRICING_NOT_IMPLEMENTED`** throw
- delete 후 `catalog_channel=online` **0건**

---

## 2. PDF / Export — BudgetPricing 가드 (3-2)

`lib/quote-export/budget-pricing-export-guard.ts` — `BUDGET_PRICING_NOT_IMPLEMENTED` 가로채기, **레거시 PDF 폴백 금지**.

| 경로 | BudgetPricing 시 동작 | 사용자 메시지 |
|------|----------------------|---------------|
| **`POST /api/quote/export`** (위저드 Step 4 PDF/PPTX) | **422 JSON** | 「온라인 매체는 아직 견적서에 포함할 수 없습니다. 가격 문의로 안내해 주세요.」 |
| **`GET /api/quote/[id]/pdf`** (저장 OoHQuote) | **422 JSON** — **legacy fallback 차단** | 동일 (locale ko/en) |
| **`GET /api/quote/[id]/pptx`** | **422 JSON** | 동일 |
| 기타 builder 오류 (offline) | 기존과 동일 — PDF는 legacy fallback, export는 500 `"Failed"` | 원시 스택/에러코드 **미노출** |

### Admin 견적 PDF

| 경로 | `calculateQuote` 호출 | BudgetPricing 영향 |
|------|----------------------|---------------------|
| **`POST /api/admin/quotes/pdf`** (draft) | **없음** — 클라이언트가 넘긴 `unitPriceWon`/`lineTotalWon` 사용 | **없음** |
| **`GET /api/admin/quotes/[id]/pdf`** (saved) | **없음** — DB `QuoteItem` 금액 사용 | **없음** |

### 위저드 UI (클라이언트)

- `buildQuoteWizardLineContext` → online/`type=null` 시 **`priceOnInquiry: true`** → 「가격 문의」
- `calculateQuote` **미호출** — PR1b-2 안전망 유지
- export 422 시 위저드는 기존 `quote.pdfError` 토스트 (generic) — 서버는 명확 JSON body

---

## 3. 리스크 메모 (PR3 전)

1. **위저드 PDF export** — online ID가 `mediaIds`에 들어가면 **422 + 명확 메시지** (잘못된 PDF 방지). PR3 정문에서 online 선택 자체를 추가 차단 예정.
2. **OoHQuote PDF** — online 포함 시 **더 이상 legacy PDF로 fallback 하지 않음** (잘못된 금액 PDF 차단).
3. **Admin** — catalog line 추가 시 서버 recalc 경로가 붙으면 BudgetPricing 영향 가능; 현재 draft PDF는 precomputed rows.

---

## 4. 수동 UI spot-check (Preview 배포 후)

- [ ] 위저드: offline-only cart 금액 · 「가격 문의」 mixed cart (PR1b-2 회귀)
- [ ] 플랜카트: 저장 플랜 렌더링 (3계정 legacy plan cart)
- [ ] PDF: **offline** 견적 export 정상 (422 가드가 offline 경로 회귀 없음)
- [ ] (선택) online ID를 export body에 넣으면 422 — 잘못된 PDF 미생성

---

## 5. merge 후 (prod)

- [ ] deploy **Ready** + SHA 일치
- [ ] Neon backup
- [ ] 102-row golden vs prod price re-check (`pr1a-prod-price-check.mts` 패턴)
- [ ] **prod smoke 금지** — Preview에서만 online insert 검증 완료
