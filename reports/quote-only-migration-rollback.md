# quote_only 마이그레이션 — 롤백 절차

PR #455 (`20260823140000_media_pricing_mode`) 배포 시 참고.

## 요약

| 시나리오 | 권장 조치 | 데이터 영향 |
|----------|-----------|-------------|
| 표시만 잘못됨 (코드 버그) | **코드 revert** 만으로 충분 | `pricing_mode` 컬럼은 남아도 구 클라이언트는 무시 |
| 잘못된 매체가 quote_only 로 백필됨 | **값 롤백 SQL** + 필요 시 코드 revert | 9건만 `fixed` 로 복구 |
| 마이그레이션 자체를 되돌려야 함 | 값 롤백 후 컬럼/enum 제거 (비권장·다운타임) | 아래 §3 |

**설계 원칙:** `pricing_mode` 컬럼은 nullable enum + default `fixed` 이므로, 긴급 시 **코드만 revert 해도 앱은 기동**한다. 다만 신규 코드가 배포된 상태에서 DB만 롤백하면 `pricingMode` 미매핑 → 레거시 폴백(외벽+무단가)으로 동작한다.

---

## 1. 코드만 revert (가장 빠른 긴급 대응)

1. `git revert` PR #455 머지 커밋 (또는 Vercel에서 이전 배포 promote)
2. Prisma 스키마에 `pricingMode` 필드가 없어도 **DB에 컬럼이 남아 있어도 무방** — Prisma는 알려진 컬럼만 SELECT
3. 협의가 표시는 PR #454 경로(무단가 → 「문의」) + 레거시 폴백으로 **9건 외벽**은 여전히 문의로 보일 수 있음 (의도된 동작)

---

## 2. 값만 롤백 (권장 — 데이터 정정)

9건 백필만 되돌리기:

```sql
UPDATE media
SET pricing_mode = 'fixed'
WHERE pricing_mode = 'quote_only';
```

특정 ID만 (2026-08-23 검증 목록):

```sql
UPDATE media
SET pricing_mode = 'fixed'
WHERE id IN (
  'cmnz9wm17000004kyd4r72mug',
  'cmq3vyc6o000004jm5h9a4yki',
  'cmq3w55p4000304lg3tqbvgtw',
  'cmq3wd9aw000504l5lfq1lha8',
  'cmq3whqri000h04lgafc3x5zu',
  'cmq3wpngl000804l55es4eret',
  'cmq3wwc63000j04lgcmp77yeg',
  'cmq3x2965000m04l5hq30xrp5',
  'cmq3x5pvz000504jpapuvuztt'
);
```

적용 후 카탈로그 캐시 revalidate (어드민 매체 저장 1건 또는 배포 hook).

---

## 3. 스키마 완전 롤백 (최후 수단)

```sql
ALTER TABLE media DROP COLUMN pricing_mode;
DROP TYPE "MediaPricingMode";
```

- 프로덕션에서 enum/컬럼 DROP 은 배포 중 Prisma 불일치 위험 → **점검 창** 필요
- 일반적으로 §2 값 롤백 + §1 코드 revert 로 충분

---

## 4. 배포 전 dry-run (필수 — **DB URL 필수**)

카탈로그만으로는 DB 오염(이미 45건 `quote_only`)을 감지할 수 없음.

```bash
# migrate 전 스냅샷 저장 (reports/ 에 JSON 기록)
MIGRATION_DRY_RUN_ENV=production npx tsx scripts/check-pricing-mode-db-state.mts

# Preview 점검
source .env.preview.local  # 또는 MIGRATION_DRY_RUN_DATABASE_URL
npx tsx scripts/dry-run-pricing-mode-migration.mts
```

출력 확인:

- **현재 DB (변경 전):** `wallMuralByMode`, `pricedWallWronglyQuoteOnly`
- **repair 후 예상:** `quote_only: 9`, `fixed: 36`
- **차이:** `delta`
- `corruptionDetected: true` → **migrate/UI 검증 금지**, repair 먼저

게이트:

| DB 상태 | `checks.ok` |
|---------|-------------|
| 컬럼 없음 | `needsInitialMigration` |
| 9/36 정상 | `alreadyCorrect` |
| 45/0 오염 | **FAIL** (`corruptionDetected`) |

repair idempotent 검증: `node --import tsx --test lib/__tests__/pricing-mode-repair-idempotent.test.ts`

스테이징에서 마이그레이션 적용 후:

```sql
SELECT id, name, price, pricing_mode
FROM media
WHERE media_sub_category = 'wall_mural' AND is_active = true
ORDER BY pricing_mode DESC, name;
```

`quote_only` 9건·`fixed` 36건 확인.

---

## 5. 프로덕션 배포 후 수동 확인

1. **외벽 포함** 보고서: 카드 「문의」, 예산 비중 「—」, 1p 확정 합산 + 각주, CPM 「(문의 매체 제외)」
2. **외벽 없는** 기존 보고서(고려 캠페인 등): 이전과 동일 (회귀 없음)
