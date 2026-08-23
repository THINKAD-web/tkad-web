# plan_report_activities.recipient_email 마이그레이션 — 롤백·배포 절차

마이그레이션: `20260823180000_plan_report_activity_recipient_email`  
목적: C-full-2 `email_send` 활동 로그에 수신 주소 저장 (`recipient_email VARCHAR(320) NULL`)

PR #455 (`pricing_mode`) 때 Preview DB 오염 사례가 있었으므로 **동일 게이트 절차**를 따른다.

---

## 요약

| 시나리오 | 권장 조치 | 데이터 영향 |
|----------|-----------|-------------|
| C-full-2 코드만 롤백 | **코드 revert** — 컬럼 남아도 무해 | 기존 행 `NULL` 유지 |
| `email_send` 로그가 문제 | 코드 revert + (선택) 신규 `email_send` 행만 삭제 | `recipient_email` 컬럼은 유지 가능 |
| 컬럼 자체를 제거해야 함 | §3 DROP COLUMN (비권장) | 모든 `recipient_email` 값 삭제 |

**설계 원칙:** nullable 컬럼 추가만이므로, 긴급 시 **코드만 revert 해도 앱은 기동**한다. Prisma는 알려진 필드만 쓰며, 미적용 DB에서는 `logPlanReportActivity`가 `recipientEmail` insert 시 실패할 수 있음 → 그 경우에도 §1 코드 revert로 `email_send` 경로 자체를 끄면 된다.

---

## 1. 코드만 revert (가장 빠른 긴급 대응)

1. C-full-2 머지 커밋 `git revert` 또는 Vercel 이전 배포 promote
2. DB에 `recipient_email` 컬럼이 **남아 있어도** `view` / `pdf_export` / `pptx_export` 는 영향 없음
3. `email_send` API·로그 코드가 없어지면 수신자 저장 시도 자체가 사라짐

---

## 2. 값 롤백 (일반적으로 불필요)

이번 마이그레이션은 **기존 행을 UPDATE 하지 않음**. 배포 후 `email_send` 로그만 `recipient_email`이 채워진다.

잘못된 테스트 발송 행만 지우려면:

```sql
DELETE FROM plan_report_activities
WHERE event_type = 'email_send'
  AND created_at > '<배포 시각 UTC>';
```

---

## 3. 스키마 완전 롤백 (최후 수단)

```sql
ALTER TABLE plan_report_activities DROP COLUMN IF EXISTS recipient_email;
```

- Prisma 스키마에서 `recipientEmail` 제거 후 배포와 **동시**에 실행할 것 (컬럼만 DROP 하고 신규 코드가 insert하면 실패)
- 컬럼 DROP 없이 코드 revert만으로도 운영 복구 가능 (§1)

---

## 4. 배포 전 dry-run (필수 — **DB URL 필수**)

```bash
# migrate 전 스냅샷 저장 (reports/ 에 JSON 기록)
MIGRATION_DRY_RUN_ENV=preview npx tsx scripts/check-plan-report-recipient-email-db-state.mts

# 또는 URL 직접 지정
MIGRATION_DRY_RUN_DATABASE_URL="<preview-db-url>" \
  npx tsx scripts/dry-run-plan-report-recipient-email-migration.mts
```

출력 확인:

| 섹션 | 기대 |
|------|------|
| **현재 DB (변경 전)** | `hasColumn: false`, `activityRowCount: N`, `rowsWithRecipientEmail: 0` |
| **migrate 후 예상** | `hasRecipientEmailColumn: true`, `columnNullable: true`, `rowsWithRecipientEmail: 0` |
| **차이 (delta)** | `columnWillBeAdded: true`, `recipientEmailCountChange: 0` |
| **checks** | `ok: true`, `needsInitialMigration: true` (미적용 시) 또는 `alreadyApplied: true` |

게이트:

| DB 상태 | `checks.ok` |
|---------|-------------|
| 컬럼 없음, 활동 테이블 정상 | `needsInitialMigration` → PASS |
| 컬럼 있음, nullable varchar(320) | `alreadyApplied` → PASS |
| 컬럼 있으나 NOT NULL / 타입 불일치 | **FAIL** |

리포트: `scripts/.dry-run-plan-report-recipient-email/report.json`

---

## 5. Preview 적용 순서

1. dry-run PASS (Preview DB URL)
2. Preview에 `npx prisma migrate deploy` (또는 Vercel Preview 빌드 hook)
3. SQL 검증:

```sql
SELECT column_name, is_nullable, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'plan_report_activities'
  AND column_name = 'recipient_email';

SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE recipient_email IS NOT NULL) AS with_email
FROM plan_report_activities;
```

기대: 컬럼 1행 (`is_nullable = YES`), `with_email = 0` (기존 레코드 보존)

4. Preview 앱에서 C-full-2 QA (아래 §7) 수행

---

## 6. 프로덕션 적용 후 검증

1. dry-run PASS (`MIGRATION_DRY_RUN_ENV=production`)
2. migrate deploy
3. §5 SQL 동일 실행
4. 실제 `email_send` 1건 발송 → `recipient_email` 채워짐 확인
5. 관리자 플랜 스냅샷 활동 패널에 수신 주소 표시 확인

---

## 7. QA 체크리스트 (C-full-2)

### 기본 (1–4)

1. Step 7 → 이메일로 보내기 → 확인 다이얼로그 (받는 사람·첨부 파일명·제목·본문)
2. 발송 성공 → 수신함 PDF + 관리자 활동 `email_send` + `recipient_email`
3. 새로고침·SavedPlan 복원 후에도 C-full-1 문구 persist
4. stale 배너 동작 (C-full-1 회귀 없음)

### 추가 (5–7)

5. **발송 실패** — 형식 오류 주소(`not-an-email`)로 시도 → 다이얼로그 `role="alert"` 오류 표시, 조용히 실패 없음
6. **첨부 PDF ↔ 화면 일치** — 편집 직후 즉시 발송하여 다음이 PDF에도 있는지 확인:
   - 인사말·Executive summary
   - 표지 광고주명·로고
   - VAT·제작비 각주 (`pricingFootnote`)
   - 협의가 매체 「문의」 표시
   - CPM 각주 (`cpmFootnote`)
7. **대용량** — 매체 10개 이상 플랜(전환 캠페인 등)으로 발송: 첨부 용량 제한·생성 시간(60s 이내) 확인

---

## 8. C-full-3a 착수 조건

위 QA 7항목 통과 후 착수.

3a 범위:

- 캠페인 총액 제작비 1줄 입력 (`productionCostWon` — 3b 확장 포인트)
- 견적 3단 표: 매체비 / 제작비 / VAT / 총액
- 협의가 매체 별도 라인
- **매체비 = 1p 헤더 `budgetHonesty.coverValue` 확정 합계와 동일 SSOT** (`confirmedMixWon` 경로 재사용, 별도 계산 금지)
