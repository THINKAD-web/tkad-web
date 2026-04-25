# THINKAD 견적 마법사(`/ko/quote`) 완성 핸드오프

작성일: 2026-04-25
브랜치: `claude/complete-quote-wizard-zbRFw`
완성 PR: PR-1 ~ PR-11 (총 11개 커밋, 모두 동일 브랜치 누적)
상태: 🟢 코드 완료 / 🟡 운영팀 작업 대기 (Neon SQL 실행 + 도메인 인증)

---

## 1. 한 줄 요약

견적 마법사 `/ko/quote` 가 1~4단계 완전 동작 + Planner / 매체 상세 / 비교 페이지
연동 + 사용자/영업팀 통지 + PDF + DB 영속화까지 완성. **Planner ↔ 견적 가격 합계
100% 일치** 요구는 `lib/pricing/computeQuoteTotals` 단일 진실로 달성.

---

## 2. PR 별 요약

| PR | 내용 | 핵심 산출물 |
|---|---|---|
| 1 | 단일 가격 계산 모듈 | `lib/pricing/{unit,discount-policy,multipliers,campaign,index}.ts` + `scripts/verify-pricing.ts` (40 어설션) + `docs/pricing-policy.md` |
| 2 | Quote Zustand store + Stepper | `lib/quote/{types,store,validation}.ts` + `components/quote/stepper.tsx` + `scripts/verify-quote-store.ts` |
| 3 | 1단계 store 통합 + 진입 경로 배너 + 복원 모달 | URL 다중 파서, `components/quote/{source-banner,restore-modal}.tsx` |
| 4 | 2단계 기간 + 송출 + 예산 + 라이브 견적 | `components/quote/period-step.tsx` + `lib/quote/period-derive.ts` |
| 5 | 3단계 소재 4모드 + Cloudinary + Planner 합성 재사용 | `app/api/quote/creative/sign/route.ts` + `lib/quote/creative-upload.ts` + `components/quote/creative-step.tsx` |
| 6 | 4단계 RHF + Zod + 사업자번호 체크섬 | `lib/quote/customer-schema.ts` + `components/quote/customer-form.tsx` |
| 7 | PDF 할인 라인 + composite 임베드 + step 4 PDF 옵션 | `components/quote-pdf-preview.tsx` 확장 |
| 8 | 영업팀 Slack/이메일 + 도메인 설정 문서 | `lib/quote/notifiers/{sales-slack,sales-email}.ts` + `docs/email-domain-setup.md` |
| 9 | OoHQuote 모델 확장 + 견적 번호 + 14일 TTL | `prisma/sql/2026_05_quote_wizard_extension.sql` + `lib/quote/quote-number.ts` |
| 10 | 어드민 OoHQuote 확장 필드 노출 | `app/api/admin/ooh-quotes/route.ts` + `components/admin-ooh-quotes-client.tsx` |
| 11 | 통합 검증 스크립트 + 본 핸드오프 | `scripts/verify-quote-integration.ts` (20 어설션) + 본 문서 |

---

## 3. 🚨 운영팀 작업 (자동화 X — 사람이 직접)

### 3-1. Neon SQL 실행 (필수, PR-9)

```
prisma/sql/2026_05_quote_wizard_extension.sql
```

핸드오프 §4-1 규칙대로 사용자(운영자)가 **Neon SQL editor 에서 직접 실행**.
idempotent 하므로 여러 번 실행 안전. 14개 컬럼 + 3개 인덱스 추가.

확인:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'ooh_quotes' AND column_name IN ('quote_number', 'expires_at');
-- 2 rows expected
```

### 3-2. 이메일 도메인 인증 (선택, PR-8)

`docs/email-domain-setup.md` 참조. SPF / DKIM / DMARC 세 가지 모두 설정 필요.
미설정 시 사용자 PDF 메일이 스팸함으로 분류될 수 있음.

### 3-3. 환경 변수 등록 (Vercel Production scope)

선택 — 미설정 시 해당 알림만 silent skip, 견적 자체는 정상 저장:

```
RESEND_API_KEY=re_...
RESEND_FROM="THINKAD <quote@thinkad.kr>"
SALES_TEAM_EMAILS="ops@thinkad.kr,sales@thinkad.kr"
SLACK_WEBHOOK_URL_SALES=https://hooks.slack.com/.../#sales-leads
```

이미 `.env.production.example` 에 모두 명시.

---

## 4. 핵심 아키텍처 다이어그램

```
[Planner /ko/planner] ─────────────────┐
[Media /ko/media/[id]] ─────────────┐  │
[Compare /ko/compare] ──────────┐   │  │
                                ▼   ▼  ▼
                         /ko/quote (4단계 마법사)
                                │
                                ▼
              ┌──────────────────────────────────────┐
              │ lib/quote/store.ts (Zustand persist) │
              │ - 24h TTL, withActivity 자동 갱신     │
              │ - localStorage tkad-quote-draft-v1    │
              └──────────────────────────────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              ▼                 ▼                  ▼
    [Step 1 매체]     [Step 2 기간/예산]    [Step 3 소재]
        Set<id>           ISO dates          mode + assets
              ▼                 ▼                  ▼
              └──────────┬──────┴──────────────────┘
                         ▼
              [Step 4 고객 (RHF + Zod)]
                         │
                         ▼
              POST /api/quote
                         │
                         ▼
              ┌─────────────────────────────────┐
              │ db.$transaction:                 │
              │  1. quoteRequest.create          │
              │  2. issueQuoteNumberInTx (lock)  │
              │  3. ooHQuote.create + extras     │
              └─────────────────────────────────┘
                         │
              ┌──────────┼──────────┬──────────┐
              ▼          ▼          ▼          ▼
        사용자 PDF   영업 Slack  영업 Email  Telegram
        (Resend)     (#sales)    (SALES_…)  (legacy)
```

가격 계산 단일 진실 — `lib/pricing/computeQuoteTotals`:

```
priceToWon (휴리스틱 격리) → priceToDailyKrw (period 정규화) →
computeLineKrw (multiplier × days) → computeQuoteTotals
  → subtotal → discount(greater-of) → discountedKrw → vat → totalKrw
```

---

## 5. 데이터 안전 규칙 (절대 준수)

핸드오프 §4 그대로:

- ❌ `prisma db push` / `prisma migrate reset` / `--accept-data-loss` 금지
- ✅ 스키마 변경은 `prisma/sql/2026_NN_*.sql` + 사용자 직접 실행
- ❌ 공개 매체 catch 폴백을 mock 데이터로 — `fetchPublicMediaCatalog` 만 진실
- ❌ git push --force / --no-verify / --no-gpg-sign

---

## 6. 결정 기록 (재확인 불필요)

운영자가 PR-1 시작 전 확정한 12 + 4 = 16개 결정:

| Q | 항목 | 결정 |
|---|---|---|
| 1 | 가격 단위 | (a) 원/일 단일 단위 + Planner 식 검증 선행 |
| 2 | 할인 정책 | 5/10/15/3% + 큰 쪽만 적용 (`discount-policy.ts`) |
| 3 | 시간대/시즌 가중치 | 1.0 출시 + 구조만 준비 (`multipliers.ts` TODO) |
| 4 | PDF | (a) 기존 html-to-pdf.ts 패턴 재사용 |
| 5 | 이메일 | Resend (`quote@thinkad.kr` from) |
| 6 | 영업 알림 | (a) Slack #sales-leads + 이메일 둘 다 |
| 7 | 만료 | 14일 (D-3 리마인더는 후속 PR) |
| 8 | 카카오 알림톡 | (c) 추후, 이메일 본문에 카카오톡 상담 링크 포함 |
| 9 | DB | (a) Prisma + Neon, OoHQuote 확장 |
| 10 | 견적 번호 | `Q-YYYYMMDD-NNNN` |
| 11 | 다국어 PDF | (a) 한국어 우선만 |
| 12 | 사업자번호 | (a) 포맷 검증만 + 선택 |
| E1 | DB price 단위 | (a) 휴리스틱 격리 + 후속 마이그레이션 |
| E2 | pricePeriod | (a) PR-1 부터 `priceToDailyKrw` 통일 |
| E3 | 견적 모델 | OoHQuote 확장 (신규 Quote 테이블 X) |
| E4 | 캠페인 기간 | startDate/endDate 우선 + periodKey 빠른 프리셋 |

---

## 7. 알려진 미해결 / 후속 작업

### 7-1. 이행기 호환 헬퍼 — 후속 PR 에서 제거 예정

- **`lib/quote/period-derive.ts`** — startDate/endDate → legacy periodKey
  매핑. PR-9 SQL 적용 + 어드민/PDF 가 dates 직접 사용으로 이전되면 제거.
- **`lib/admin-quote-calc.ts:inclusiveCampaignDays`** — `lib/pricing/campaign.ts`
  와 동일 구현 중복. 어드민 코드를 lib/pricing 으로 이전 시 사본 제거.
- **`lib/server-ooh-quote-pdf.ts:143`** 의 `monthlyCost = Σ m.price` — PR-1
  검증서 결함 4. 정규화 누락. 별도 PR 에서 lib/pricing 으로 이전 필요.

### 7-2. 운영팀 협의 후 적용 (`docs/pricing-policy.md`)

- §3-1 시간대 가중치 표 (현재 모두 1.0)
- §3-2 시즌 가중치 표 (현재 모두 1.0)
- §1 DB Media.price 단위 마이그레이션 일정 (`UPDATE media SET price = price * 10000 WHERE price < 1000000`)

### 7-3. UX 후속

- 카카오톡 알림톡 (Q8 추후) — 견적 진행 상황 카카오톡 알림
- D-3 만료 임박 자동 리마인더 cron + 이메일 (Q7 D-3 옵션)
- 영문 PDF/이메일 (Q11 추후)
- 견적 → 결제 시스템 연동 (토스페이먼츠 등) — OoHQuote.invoice_sent 이후 단계
- composite preview 를 PDF 본문 그리드(섬네일 외)로 더 크게 노출

### 7-4. 기술 후속

- 정식 테스트 러너 도입(vitest 권장) — 현재는 `npx tsx` 수동 검증 스크립트만
- React Hook Form 의 watch + store 동기화 패턴 → `useFormStore` 훅 추출 후
  Planner 와 공유

---

## 8. 운영 명령어

```bash
# 의존성 (RHF, zod resolver 신규 추가됨)
npm install

# Prisma 클라이언트 재생성 (schema.prisma 변경 후)
npx prisma generate
# ※ db push 금지 — Neon SQL 직접 실행

# 검증 스크립트
npx tsx scripts/verify-pricing.ts            # 40 어설션
npx tsx scripts/verify-quote-store.ts        # 80+ 어설션
npx tsx scripts/verify-quote-integration.ts  # 20 어설션 (시나리오 4종)

# 타입 + 린트
npx tsc --noEmit
npx eslint <path>
```

---

## 9. 핵심 파일 맵

```
신규 (PR-1~11)
  app/api/quote/creative/sign/route.ts                [PR-5]
  components/quote/customer-form.tsx                  [PR-6]
  components/quote/creative-step.tsx                  [PR-5]
  components/quote/period-step.tsx                    [PR-4]
  components/quote/restore-modal.tsx                  [PR-3]
  components/quote/source-banner.tsx                  [PR-3]
  components/quote/stepper.tsx                        [PR-2]
  docs/email-domain-setup.md                          [PR-8]
  docs/HANDOFF-quote-wizard-2026-04-25.md             [PR-11]
  docs/pricing-policy.md                              [PR-1]
  lib/pricing/{campaign,discount-policy,index,
               multipliers,unit}.ts                   [PR-1]
  lib/quote/{customer-schema,creative-upload,
             period-derive,quote-number,
             store,types,validation}.ts               [PR-2~9]
  lib/quote/notifiers/{sales-email,sales-slack}.ts    [PR-8]
  prisma/sql/2026_05_quote_wizard_extension.sql       [PR-9]
  scripts/verify-pricing.ts                           [PR-1]
  scripts/verify-quote-store.ts                       [PR-2~9]
  scripts/verify-quote-integration.ts                 [PR-11]

수정
  app/[locale]/quote/quote-page-client.tsx            [PR-3~9]
  app/api/admin/ooh-quotes/route.ts                   [PR-10]
  app/api/quote/route.ts                              [PR-8, 9]
  components/admin-ooh-quotes-client.tsx              [PR-10]
  components/quote-pdf-preview.tsx                    [PR-7]
  lib/ooh-quote.ts                                    [PR-9]
  lib/quote/store.ts                                  [PR-3]
  lib/quote/validation.ts                             [PR-5]
  messages/{ko,en}.json                               [PR-3~7]
  package.json + package-lock.json                    [PR-6]
  prisma/schema.prisma                                [PR-9]
  .env.production.example                             [PR-8]
```

---

## 10. 다음 Claude 세션을 위한 첫 메시지 템플릿

```
THINKAD/tkad-web 프로젝트입니다.
docs/HANDOFF-quote-wizard-2026-04-25.md 와
docs/HANDOFF-insights-2026-04-25.md 둘 다 읽고 컨텍스트 잡아주세요.

[새 작업 요청]

작업 시작 전 주의:
1. 견적 마법사(/ko/quote)는 PR-1~11로 완성·머지됨 — 그 위에 추가하거나 별개 작업
2. 가격 계산은 lib/pricing/computeQuoteTotals 단일 진실 — 우회하지 말 것
3. OoHQuote 스키마 변경은 prisma/sql/2026_NN_*.sql + 사용자 Neon 직접 실행
4. 데이터 안전 규칙(insights 핸드오프 §4) 절대 준수
```
