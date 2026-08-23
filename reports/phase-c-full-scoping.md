# Phase C-full — 제안서 내용·발송 (2026-08-23)

**상태:** C-full-2 구현 완료 (C-full-3a 대기)  
**전제:** C-lite 완료 + C-full-1 (인사말·요약 편집) 승인  
**판정 기준:** *「이 PDF를 이메일에 그대로 첨부해도 되는가?」* (C-lite와 동일)

## C-lite → C-full 경계

| C-lite (완료) | C-full (이번) |
|---------------|---------------|
| 표지·광고주명·제목·로고·일자 | **맥락 있는 문장** (인사말·전략 요약 편집) |
| VAT·CPM 각주 | **견적 형태** (매체비/제작비/VAT 분리) |
| PDF/PPT 다운로드 | **이메일 + PDF 첨부** |
| 섹션 on/off | (유지) |

---

## 항목 1 — 인사말 / Executive summary 편집

### 현재 상태

| 구분 | 내용 |
|------|------|
| 전략 요약 | `buildReportWhyLine` + `buildReportStrategyLines` 규칙 테이블로 **자동 생성** (`lib/planner/report-strategy.ts`) |
| payload 조립 | `payload-ooh.ts` → `sections[]` 중 `"전략 요약"` 블록 (고정 4~5줄 템플릿) |
| 효과 요약 | `effectSummaryLines` — KPI 숫자 포함, **편집 불가** |
| 추천 근거 | `recommendRationale` — CalcEngine 기반, section `recommend` 토글 |
| 인사말 | **없음** |
| persist | C-lite에서 `reportClientName` / `reportDocumentTitle` 패턴 확장 가능 |
| export | `sections` → PDF/PPT/웹 공통 (`filterExportSections`) |

대표 자동 문구 예:

> 왜 이 구성인가 · 서울 핵심 동선의 N개 매체로 …

### 변경 범위 (예상 파일)

| 레이어 | 파일·경로 |
|--------|-----------|
| Store / SavedPlan | `lib/planner/store.ts`, `contact-prefill.ts`, `hydrate-from-saved-plan.ts`, `planner-page-client.tsx` (`persistPlan`) |
| Payload | `lib/planner-report-export/types.ts` (`greetingText?`, `executiveSummaryLines?` 또는 단일 `reportCopy` 블록) |
| 생성 기본값 | `lib/planner/report-strategy.ts` — 기존 함수를 **초안 생성기**로 유지 |
| 조립 | `payload-ooh.ts`, `payload-integrated.ts`, `brief-report-adapter.ts` |
| UI | `components/planner-report-step.tsx`, `components/planner/report-document.tsx` (인라인 textarea / 섹션별 편집) |
| Export | `build-pdf.ts`, `build-pptx.ts` — 표지 다음 또는 전략 섹션 상단에 인사말 |
| 섹션 토글 | `section-visibility.ts` — `greeting` / `executive` 키 추가 검토 |

### 3계층 분류

| 필드 | 계층 | 근거 |
|------|------|------|
| 인사말 (`greetingText`) | **자유 편집** | 숫자·산식 무관 |
| Executive summary / 전략 요약 문장 | **자유 편집** | 자동 생성값을 초안으로, 사용자가 덮어씀 |
| 효과 요약·KPI·도넛·CPM 수치 | **잠금** | 기존 C-lite 정책 유지 |
| 제작비·할인율 입력 | **제한 편집** (항목 3) | 별도 트랙 — 이번 1차 비권장 |

### 예상 난이도

**M** (3~4일)

- persist·export 패턴은 C-lite에서 검증됨
- 리스크: 자동 생성 ↔ 사용자 편집 **충돌 정책** (플랜 입력 변경 시 초안만 갱신 vs 사용자 문구 보존)

### 선행 의존

- C-lite persist (완료)
- 없음 (CalcEngine 변경 불필요)

### 설계 메모 (구현 시)

1. **초안 + 오버라이드:** `reportGreeting`, `reportExecutiveSummary` store 필드. 비어 있으면 자동 생성; 사용자 편집 후에는 `touched` 플래그로 자동 덮어쓰기 방지.
2. **한 블록 vs 여러 줄:** Executive summary는 `string[]` (기존 `PlannerExportSection.lines` 호환).
3. **AI narrative** (`/api/planner/narrative` 등)와 역할 분리 — C-full 1차는 규칙 기반 초안 편집만.

---

## 항목 2 — 이메일 발송 / PDF 첨부

**상태: C-full-2 구현 완료 (2026-08-23)**

### 구현 요약

| 조건 | 구현 |
|------|------|
| 발송 전 확인 | `ReportEmailSendDialog` — 받는 사람·첨부 파일명·제목·본문 편집 |
| PDF 생성 시점 | `POST /api/planner/email-report` — **발송 버튼 시** `buildPlannerReportPdf` |
| 실패 처리 | API 4xx/5xx + 다이얼로그 `role="alert"` 오류 표시 |
| 발송 이력 | `PlanReportActivity.email_send` + `recipientEmail` 컬럼 |

### 현재 상태 (이전)

| 구분 | 내용 |
|------|------|
| API | `POST /api/planner/email-report` (`app/api/planner/email-report/route.ts`) |
| 본문 | **HTML 테이블** — goal·예산·매체 리스트·metrics (PDF 아님) |
| 첨부 | `screenshot` data URL → **PNG 1장** (`planner-report.png`) — 레거시 |
| 권한 | `requirePlannerPdfAccess` (로그인 + PRO) |
| 발송 | `sendEmailWithResult` — 사용자 + admin 알림 |
| 서버 PDF | `POST /api/planner/report/export` — `buildPlannerReportPdf` (Node, 최대 60s) **이미 존재** |
| 활동 로그 | `PlanReportActivity` — `view` / `pdf_export` / `pptx_export` 만. **email_send 없음** |

클라이언트 (`planner-report-step.tsx`)는 email API에 **구형 flat JSON**만 전송 — `exportPayload`·`clientName`·편집 문구 미반영.

### 변경 범위 (제안)

| 옵션 | 설명 | 추천 |
|------|------|------|
| **A. API 통합** | `email-report`가 `exportPayload` + `sectionVisibility` 수신 → 서버에서 `buildPlannerReportPdf` → PDF 첨부 | ✅ 1차 |
| B. 클라이언트 생성 | 브라우저에서 PDF blob → base64 전송 | ❌ 용량·모바일·일관성 |
| C. 신규 route | `/api/planner/report/email` 분리 | A와 동일, naming만 분리 |

**예상 파일**

- `app/api/planner/email-report/route.ts` (또는 신규 route) — payload 검증 + PDF 생성 + 첨부
- `lib/planner-report-export/build-pdf.ts` — 재사용 (변경 최소)
- `components/planner-report-step.tsx` — `exportPayload` 전송, UI copy
- `lib/plan-report-activity/types.ts` — `email_send` 이벤트 추가 (선택)
- `lib/email/client.ts` — 첨부 크기 한도 확인

**본문 HTML**

- 짧은 커버 이메일 + PDF 첨부 안내 (견적 메일 패턴: `lib/campaign-completion-report-issue.ts` 참고)
- 인사말 편집(항목 1) 반영 시 제목·첫 문단에 `clientName` 사용

### 3계층 분류

| 동작 | 계층 |
|------|------|
| 수신 이메일·커버 문구 편집 | 자유 편집 |
| PDF 내용 | C-lite/C-full payload 그대로 (숫자 잠금) |
| 발송 자체 | 운영 액션 (로그만) |

### 예상 난이도

**M~L** (4~6일)

- PDF 서버 생성 경로는 있음 → **배선**이 핵심
- Resend/SES 첨부 크기, Vercel `maxDuration` 60s, 대용량 포트폴리오 PDF 타임아웃 검증 필요
- PNG 경로 제거 vs 병행 기간 정책

### 선행 의존

| 의존 | 필수? |
|------|-------|
| 항목 1 (인사말) | **권장** — 첨부 PDF 품질. 기술적으로는 병행 가능 |
| C-lite export payload | ✅ 완료 |
| `isPlannerReportExportPayload` 검증 | ✅ 있음 |

### 발송 이력

| 옵션 | 장단 |
|------|------|
| **PlanReportActivity `email_send`** | 기존 인프라 확장, 관리자 패널 재사용. **권장 1차** ✅ |
| SavedPlannerPlan 메타 | 플랜 단위 1회성 — 재발송 추적 약함 |
| 별도 EmailLog 테이블 | 과함 (1차 비권장) |

기록 필드: `recipientEmail`, `reportTitle`, `format: "pdf"`.

**마이그레이션·롤백·QA:** [`reports/plan-report-recipient-email-migration-rollback.md`](plan-report-recipient-email-migration-rollback.md)

### QA (C-full-2 — 7항목)

1. 확인 다이얼로그 (받는 사람·첨부·제목·본문)
2. 발송 성공 + `email_send` + `recipient_email`
3. C-full-1 persist 회귀 없음
4. stale 배너 회귀 없음
5. **실패 케이스** — 잘못된 주소 → `role="alert"` 오류 (조용히 실패 금지)
6. **PDF ↔ 화면** — 인사말·요약·표지·각주·협의가·CPM; 편집 직후 발송
7. **대용량** — 매체 10+ 플랜 발송 (용량·60s 타임아웃)

dry-run:

```bash
MIGRATION_DRY_RUN_ENV=preview npx tsx scripts/check-plan-report-recipient-email-db-state.mts
```

---

## 항목 3 — 견적서 형태 보강 (P0 잔여)

### 현재 상태

| 구분 | 내용 |
|------|------|
| 플래너 보고서 | 매체별 송출료·기간 합계 + `pricingFootnote` (「제작비·부가세 별도」) |
| 협의가 | `quoteOnlyNotice` + 확정 합계 2-track (Q-2) |
| 정식 견적 PDF | `lib/quote-export/*` — **공급가·VAT 10%·합계** 테이블 완비 |
| 플래너 ↔ 견적 | **연결 없음** — 보고서는 견적서가 아님 |

8/21 기획서 견적 섹션: 매체비 / 제작비 / VAT / 총액 **3단 분리** — 미구현.

### 변경 범위 (제안)

**Phase C-full 1차 (표시 전용)**

| 요소 | 내용 |
|------|------|
| 요약 표 | 확정 매체비 합계 · 제작비(— 또는 TBD) · VAT(10%) · 총액 |
| 협의가 | 별도 행「외벽 N건 별도 문의」— 합계 미포함 |
| 데이터 | `confirmedMixWon` + `budgetHonesty` 재사용; VAT = `Math.round(supply * 0.1)` |

**Phase B/C 후속 (입력)**

| 요소 | 계층 |
|------|------|
| 총 제작비 1줄 입력 (만원) | **제한 편집** — 합계만 영향, CPM·노출 불변 |
| 매체별 제작비 | **제한 편집** — 실무 정밀도 ↑, UI·persist 부담 큼 |

### Jaehan 확인 필요 (스코핑 시점 미결)

> 제작비를 **매체별**로 받을지, **캠페인 총액 1줄**로 받을지?

| 방식 | 장점 | 단점 |
|------|------|------|
| **총액 1줄** (권장 1차) | UI 단순, C-full 범위 적합 | 매체별 원가 설명 약함 |
| 매체별 | 정식 견적에 가까움 | Phase B-3 제한 편집·persist·검증 부담 |
| 표시만 (0원 + 각주) | 구현 최소 | 8/21 P0 미충족 |

**결정 전 1차 구현안:** 매체비 확정 합계 + 제작비「별도 협의」행 + VAT는 **매체비에만** 10% 가산(제작비 0 가정) — 견적서와 동일 가정을 각주로 명시.

**3a 확정 (2026-08-23):** `productionCostWon` 총액 1줄 입력. 매체비는 `budgetHonesty` / `confirmedMixWon` SSOT와 **동일 경로** (별도 합산 금지). 3b 매체별 필드는 백로그.

### 예상 파일

- `lib/planner-report-export/types.ts` — `quoteSummary?: { supplyWon, productionWon?, vatWon, totalWon, quoteOnlyLine? }`
- `lib/planner-report-export/build-quote-summary.ts` (신규 SSOT)
- `payload-ooh.ts`, `report-document.tsx`, `build-pdf.ts`, `build-pptx.ts`
- (입력 시) store + `BuildOohPayloadArgs.productionCostMan?`

### 3계층 분류

| | |
|--|--|
| 표시 breakdown (자동 계산) | 잠금에 가까움 — 산식 고정, 직접 셀 편집 불가 |
| 제작비 숫자 입력 | 제한 편집 |
| VAT율 변경 | 잠금 (10% 고정) |

### 예상 난이도

| 범위 | 난이도 |
|------|--------|
| 표시 전용 3단 표 | **M** (3일) |
| + 총 제작비 1줄 입력 | **M~L** (+2일) |
| + 매체별 제작비 | **L** (Phase B-3) |

### 선행 의존

- Q-2 `budgetHonesty` / `quoteOnlyNotice` (완료)
- 항목 1과 독립; 항목 2와 독립

---

## 우선순위 제안 — 「이메일에 그대로 첨부」에 가장 가까운 순서

```text
1순위  항목 1 — 인사말 / Executive summary 편집
       → PDF "내용"이 제안서 수준이 되어야 첨부 판단 통과

2순위  항목 2 — 이메일 + PDF 첨부
       → 다운로드·수동 첨부 마찰 제거 (실무 단축)

3순위  항목 3 — 견적 3단 표
       → 형식 완성도·재무 명확성 (첨부 가능 여부보다 신뢰도 보강)
```

**근거**

- C-lite로 **형식·각주·표지**는 갖췄으나, 자동 전략 문구만으로는 담당자가 「그대로 보내기」 어렵다 → **항목 1이 품질 게이트**.
- 항목 2는 워크플로 완결이지만, 내용이 빈약하면 첨부해도 재작업 발생.
- 항목 3은 B2B 견적 관행상 중요하나, C-lite `pricingFootnote` + Q-2로 **최소 요건**은 충족. 제작비 입력 방식은 Jaehan 확인 후 착수.

**병행 가능:** 1 착수 후 2를 API 스펙만 먼저 고정해 병렬; 3는 1·2 QA 후.

---

## 권장 구현 순서 (스코핑 승인 후)

| Wave | 내용 | 산출 |
|------|------|------|
| **C-full-1** | 인사말 + Executive summary 편집·persist·export | 편집 UI, payload 필드 |
| **C-full-2** | email-report → server PDF attach + `email_send` log | ✅ 구현 완료 — **마이그레이션·QA 대기** |
| **C-full-3a** | 제작비 총액 1줄 + 견적 3단 표 | QA 7항목 통과 후 착수 |
| **C-full-3b** | (선택) 총 제작비 1줄 제한 편집 | Jaehan 결정 후 |

---

## 비범위 (C-full)

- Phase C 잔여 (지도·간트·A/B/C안·잔여 예산)
- Phase B (매체 순서·할인율·매체별 제작비 심화)
- 계산 트랙 (이슈5, A-6, A-4)
- `coverLogoUrl` 전용 필드 분리 (C-lite 주석만 — 별도 소형 PR 가능)

## 관련 문서

- `reports/phase-c-lite-scoping.md`
- `reports/phase-b-edit-scoping.md` (3계층 원칙)
- `reports/proposal-readiness-backlog.md` (C 이후 백로그, 미작성 시 병행)
