# PR-3 Phase 4a-1 — Coverage snapshot schema dry-run (2026-08-19)

**상태:** ✅ dry-run 완료 (execute 대기 — 재한 승인 필요)  
**범위:** 스키마 migration만 (`migrate deploy`). **백필·Signal·배선 없음.**

---

## 0. Migration PR 내용

| 파일 | 역할 |
|------|------|
| `prisma/migrations/20260820120000_pr3_phase4a_coverage_snapshot/migration.sql` | DDL |
| `prisma/schema.prisma` | `MediaComputedMetric.coveragePopulation`, `coverageDongs` |
| `scripts/pr3-phase4a-41-schema-dry-run.mts` | read-only dry-run |

**추가 컬럼 (`media_computed_metrics` only)**

| 컬럼 | 타입 | nullable | 초기값 |
|------|------|:--------:|--------|
| `coverage_population` | INTEGER | YES | NULL |
| `coverage_dongs` | JSONB | YES | NULL |

형식: `coverage_dongs` = `[{ "code": "<5자리 시군구 adm_cd>", "weight": 1.0 }]`

---

## 1. Dry-run 결과

### Production (`ep-holy-cloud`)

| 항목 | 값 |
|------|-----|
| Migration pending | ✅ `20260820120000_pr3_phase4a_coverage_snapshot` |
| `media_computed_metrics` rows | 827 |
| coverage 컬럼 존재 | ❌ 없음 (신규 ADD) |
| `media` orphan 컬럼 | 없음 |
| **verdict** | **safe** |

JSON: [`pr3-phase4a-41-dry-run-production.json`](pr3-phase4a-41-dry-run-production.json)

### Preview (`ep-shiny-sun`)

| 항목 | 값 |
|------|-----|
| Migration pending | ✅ 동일 |
| `media_computed_metrics` rows | 821 |
| coverage 컬럼 (computed) | ❌ 없음 |
| `media` orphan | ⚠️ `coverage_dongs`, `coverage_population` (20260810150000 orphan) — **복사 안 함** |
| **verdict** | **safe** (no-op IF NOT EXISTS) |

JSON: [`pr3-phase4a-41-dry-run-preview.json`](pr3-phase4a-41-dry-run-preview.json)

---

## 2. 데이터 영향

- **UPDATE / DELETE:** 0
- **기존 컬럼 변경:** 0
- **신규 행 영향:** 827(prod) / 821(preview) — 모두 NULL만 추가
- **백필:** 이번 PR에 **포함하지 않음** (4a-2 MOIS Signal PR)

---

## 3. Execute 절차 (승인 후)

```bash
# Preview (선택 — Vercel preview deploy 시 자동 migrate)
DATABASE_URL=<preview> npx prisma migrate deploy

# Production — Vercel production deploy 또는 수동
DATABASE_URL=<prod> npx prisma migrate deploy
```

Phase 1·3과 동일: deploy hook이 `migrate deploy` 실행. 수동 실행 시 위 명령.

---

## 4. 다음 PR (본 PR merge + execute 후)

1. **4a-2** MOIS 시군구 인구 → `population_demographics` Signal (서울·경기)
2. **4a-3** 매체→구 매핑 (`regionSub` → `coverageDongs`)
3. **4a-4** `calcMixMetrics` 배선 + UI
4. **4a-5** `verify-reach.mts`

---

## 5. 재현

```bash
npx tsx scripts/pr3-phase4a-41-schema-dry-run.mts
DATABASE_URL=<preview> npx tsx scripts/pr3-phase4a-41-schema-dry-run.mts
```
