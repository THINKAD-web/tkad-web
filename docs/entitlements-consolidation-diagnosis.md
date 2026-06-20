# entitlements 단일 소스 통합 — 진단 및 단계적 이전 계획

> **전제**: 1단계(서버 게이트) 머지 후 진행. 한 번에 8개 파일을 옮기지 않는다.

## 목표 단일 소스 (`lib/entitlements.ts` 예상 구조)

```ts
// 개념 스케치 — 구현은 단계별
export const ENTITLEMENTS = {
  pricing: { proMonthlyKrw: 99_000, proTrialDays: 14, /* 할인 */ },
  limits: {
    planCart: { free: 10, pro: 30 },
    compareCart: { free: 10, pro: 30 },
    aiDaily: { guest: 1, member: 5, pro: 30 },
    favoritesGuest: 10,
    apiKeyMonthly: { FREE: 1000, PRO: 10000, ENTERPRISE: null },
  },
  features: { /* ReportFeature → minLevel */ },
  pricingCopy: { free: [...], pro: [...], enterprise: [...] },
};
```

소비자: `require-report-access.ts`, `ai-rate-limit.ts`, `plan-cart-limits.ts`, `compare-constants.ts`, `pricing-page-client.tsx`, `favorites-constants.ts`, `report-pricing-constants.ts`, `api-key-auth.ts`.

---

## 현재 8+ 파일 분산 현황

| 파일 | 담당 | 통합 시 충돌 위험 |
|------|------|-------------------|
| `lib/plan-check-shared.ts` | `isPro()`, trial 계산 | **높음** — DB `User.plan`·`Subscription`과 결합. 순수 상수만 entitlements로, 판정 로직은 유지 |
| `lib/report-access.ts` | `FEATURE_MIN_LEVEL`, `checkReportAccess` | **높음** — Prisma·구독 상태. `FEATURE_MIN_LEVEL`만 entitlements에서 import |
| `lib/report-pricing-constants.ts` | ₩99k, 14일, free PDF 1회 | **낮음** — client-safe, entitlements re-export |
| `lib/ai-rate-limit.ts` | DAILY 1/5/30 | **중간** — Redis 키·어뷰징 로직과 분리 필요 |
| `lib/plan-cart-limits.ts` | 현재 무제한 | **중간** — FREE 10/PRO 30 복원 시 `plan-cart.ts`, sync API, UI 라벨 동시 변경 |
| `lib/compare-constants.ts` | 현재 무제한 | **중간** — compare-bar, browse, sticky-cta 등 10+ import |
| `lib/favorites-constants.ts` | guest 10 | **낮음** |
| `lib/api-key-auth.ts` | 월 한도 | **중간** — ApiKeyPlan enum과 Prisma 동기화 |
| `components/pricing/pricing-page-client.tsx` | PLANS 하드코딩 | **낮음** — entitlements.pricingCopy 소비만 |
| `lib/developers-docs-content.ts` | API 플랜 문구 | **낮음** — pricing과 중복 |

---

## 방향 확정 사항 vs 현재 코드 갭

| 정책 | 현재 | 2단계 작업 |
|------|------|-----------|
| FREE 플래너 Step 1~6만 | Step 7만 블러, 1~6 자유 | Step 7 진입 시점 게이트 강화 (선택: step 3+ UI) |
| 비교 상세·PDF PRO | UI 블러만 (서버는 1단계에서 PDF API 수정) | compare 클라이언트 html2canvas는 UI 게이트 유지 |
| 카트 FREE 10 / PRO 30 | 무제한 | `plan-cart-limits` + `compare-constants` 복원 |
| AI 한도·자유입력 pricing 명시 | 미명시 | `pricingCopy` 확장 |
| Enterprise 미구현 항목 | 문구만 | "준비 중" 배지 또는 enterprise 카드 분리 |

---

## PRO 회귀 방지 원칙

1. **`isPro()` 시맨틱 유지**: PRO_TRIAL·ENTERPRISE(paid)는 기존과 동일하게 PRO 혜택.
2. **서버 게이트 = `checkReportAccess` / `requireReportAccess`**: UI만 바꾸고 API는 기존 헬퍼 경유.
3. **카트 한도 복원**: PRO 30은 현재 무제한보다 **좁아짐** → PRO 사용자 영향 있음. 배포 전 공지 또는 PRO만 무제한 유지 여부 제품 확인 필요.
4. **가격표 문구**: entitlements `pricingCopy`에서 생성해 drift 방지.

---

## 단계적 이전 계획 (권장 4 PR)

### PR-A (1단계, 본 PR) — 서버 게이트
- `require-report-access.ts` 도입
- planner/compare/email PDF API PRO 검증

### PR-B — 상수만 entitlements로 (행동 변경 없음)
- `report-pricing-constants`, `favorites-constants`, `PLAN_MONTHLY_LIMITS` → re-export
- 기존 import 경로 deprecated alias 유지
- **리스크**: 없음 (순수 이동)

### PR-C — 한도 복원 + pricing 문구
- `planCartMaxItems(10|30)`, `COMPARE_MAX_ITEMS` 복원
- `pricing-page-client` → `getPricingPlans(isKo)` from entitlements
- AI 한도·찜 10개·자유입력 PRO 문구 추가
- Enterprise "준비 중" 표기
- **리스크**: PRO 카트 30 상한 — 회귀 테스트 필수

### PR-D — UI 게이트 entitlements 참조
- `PlannerProGate` / `ReportAccessGate`에 feature key 전달
- `useIsPro`는 유지, feature 체크는 `useReportAccess`와 entitlements 정렬
- 플래너 step 정책 (결과·시뮬·PDF = PRO) UI 정합
- **리스크**: hydration·로딩 플래시 — `proLoading` 처리 유지

### PR-E (선택) — API 키·Enterprise
- `POST /api/my/api-keys` plan 화이트리스트 (FREE만 self-serve)
- 광고주 whitelabel feature 구현 또는 pricing에서 제거

---

## 누락·충돌 체크리스트 (이전 전 확인)

- [ ] `PRO_MONTHLY_KRW` — 결제(`subscriptions/checkout`), 포인트 redeem, pricing 3곳 이상
- [ ] `isPro` vs `getUserReportLevel` — ENTERPRISE는 UI에선 PRO, API feature는 별도
- [ ] `free-pdf-status` / `planner-lead` — 1회 무료 PDF를 entitlements에 넣을지 폐기할지 결정
- [ ] Client bundle — entitlements에 Prisma import 금지 (server/client split: `entitlements-shared.ts` + `entitlements-server.ts`)
- [ ] next-intl — pricing 문구를 entitlements만 쓸지 i18n 메시지와 병행할지

---

## 권장 파일 분리

```
lib/entitlements/
  constants.ts      # client-safe: limits, pricing, pricingCopy
  features.ts       # ReportFeature → minLevel (client-safe)
  server.ts         # checkFeature + re-export requireReportAccess helpers
  index.ts          # public API
```

`report-access.ts`는 `features.ts`의 minLevel을 import하고, DB 조회 로직은 그대로 둔다.
