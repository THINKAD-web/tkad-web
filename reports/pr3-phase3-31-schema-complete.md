# PR-3 Phase 3 — 3-1 스키마 PR 완료 보고

**브랜치:** `feat/pr3-phase3-demo-schema`  
**날짜:** 2026-08-19

---

## 1. 연령 브릿지 우선순위 (확정·반영)

```
demoAgeSplit (measured | derived)
  → targetAge 파싱 (parsed)
  → DEFAULT_DEMO_AGE[class] (default)
```

성별:

```
demoGenderSplit (measured | derived)
  → DEFAULT_DEMO_GENDER[class] (default)
```

| 파일 | 내용 |
|------|------|
| `lib/metrics/defaults.ts` | `MetricBasis` + `parsed`, `resolveDemo*WithBasis()`, `DEFAULT_DEMO_*`, `targetAudienceShare()` |
| `lib/metrics/demo-age-bridge.ts` | `targetAgeToAgeSplit()` |
| `lib/planner/parse-target-age.ts` | `20-39세` 등 연령(세) 범위 패턴 추가 |
| `lib/planner/brief/scoring.ts` | demo share 기반 타깃 축 + `targetBasis` |

---

## 2. 3-1 스키마 (Phase 1 패턴)

**Migration:** `prisma/migrations/20260819120000_pr3_phase3_demo_snapshot/migration.sql`

```sql
ALTER TABLE media_computed_metrics
  ADD COLUMN IF NOT EXISTS demo_gender_split JSONB,
  ADD COLUMN IF NOT EXISTS demo_age_split JSONB,
  ADD COLUMN IF NOT EXISTS demo_source_signal_ids TEXT[] DEFAULT '{}';
```

**Prisma sync (같은 PR):**

- `MediaComputedMetric`: demo 3필드 + Phase 1 `contactRate`/`sovShare` 6필드
- `MediaFactSheet`: Phase 1 `spotDurationSec`/`loopDurationSec`/`playsPerHour`

`npx prisma validate` ✅

**감사:** `demoGenderSplit`/`demoAgeSplit` → `SCHEMA_MISSING_FIELDS` 에서 제거 (컬럼 존재). NULL backfill은 3-2 backfill PR.

---

## 3. 유형별 기본 demo 프로파일

승인본 표: [`reports/pr3-phase3-demo-defaults-draft.md`](pr3-phase3-demo-defaults-draft.md)  
코드 반영: `DEFAULT_DEMO_GENDER` / `DEFAULT_DEMO_AGE` in `lib/metrics/defaults.ts`

---

## 4. 테스트

- `lib/metrics/__tests__/demo-defaults.test.ts` (신규)
- `lib/planner/brief/__tests__/mix.test.ts` (타깃 축·성별 순위)
- `lib/metrics/__tests__/audit-rules.test.ts` (스키마 결손 목록 갱신)

---

## 5. 배포 순서 (다음)

| PR | 내용 |
|----|------|
| **3-1 (본 PR)** | 스키마 + Prisma sync + 설계 코드( defaults/scoring ) |
| 3-2 | backfill dry-run → prod 승인 → scoring UI 배선 |
| 3-3 | UI 문구 + [추정] 배지 (brief-step-two) |

**주의:** prod `migrate deploy` 는 재한 dry-run·승인 후 (Phase 1 HH 패턴).

---

## 6. 변경 파일 목록

- `prisma/schema.prisma`
- `prisma/migrations/20260819120000_pr3_phase3_demo_snapshot/migration.sql`
- `lib/metrics/defaults.ts`
- `lib/metrics/demo-age-bridge.ts`
- `lib/metrics/audit-rules.ts`
- `lib/planner/parse-target-age.ts`
- `lib/planner/brief/scoring.ts`
- `lib/media-data.ts`
- `components/planner/brief/data-quality-badge.tsx`
- `reports/pr3-phase3-demo-defaults-draft.md`
- tests (demo-defaults, mix, audit-rules)
