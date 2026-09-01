# PR1a Dry-Run Report

**Date**: 2026-09-01  
**Branch**: `feat/pr1a-catalog-channel` (local)  
**Scripts**: `scripts/audit/pr1a-catalog-channel-dry-run.mjs`, `scripts/migrations/pr1a-catalog-channel-forward.sql`

---

## Summary

| Target | Result |
|--------|--------|
| **Prod simulation** | ✅ **PASS** — 889/889 → `offline`, 0 `online`, 0 unmapped |
| **EXCEPTION safety** | ✅ Simulated unmapped `main_category` → raises (prod dry-run `--test-exception`) |
| **Preview simulation** | ✅ **PASS** — 823/823 → `offline` (after Gate 1 + staging classification) |
| **Preview Gate 4** | ✅ migrate deploy + forward SQL + INSERT smoke (admin/CSV, browse empty) |

**Gate**: Prod + Preview dry-run pass. **Gate 5** (rollback test) next — await approval.

---

## Gate 1 — Registration path audit (2026-09-01)

**Verdict: `media_main_category` is optional** on all primary create paths.

| Path | main/sub required? | Sets `mediaMainCategory`? |
|------|-------------------|---------------------------|
| Admin form → POST `/api/admin/medias` | No — `validateBrowseFields` only checks sub↔main consistency when both filled | Only if admin fills browse fields |
| CSV import | No | **Never** — create omits browse columns |
| Quick-add / bulk-import | No | **Never** — only free-text `subCategory` |
| Media-application approve | No | **Never** — uses quick-add mapper |
| Duplicate | N/A | Copies source (can stay NULL) |

`inferBrowseCategoryFromMedia` exists but is **not** called on create — only `migrate-browse-taxonomy` batch route.

**Impact after forward SQL (`catalog_channel NOT NULL`)**: any create without `catalog_channel` fails at DB. Dry-run does not catch this.

**PR1a fix (this branch)**: `resolveCatalogChannelForMediaWrite()` — defaults NULL-main creates to `offline`; `digital`/`online` browse main → `online`. Wired into all 6 admin create paths.

Browse main remains optional; only `catalog_channel` is guaranteed on insert.

---

## Prod dry-run (authoritative)

```
totalMedia:           889
would_offline:        889
would_online:         0
would_null_main:      0  (after 4-row classification assignment)
unmappedMainCategories: []
```

### Verification equation (post-forward)

```
catalog_channel = 'offline'  → 889
catalog_channel = 'online'   → 0
catalog_channel IS NULL      → 0
COUNT(media)                 → 889
```

641건 `type=dooh`는 **displayMode 축**이며 `catalog_channel` 백필(889건 main 기준)과 **별개**.

---

## Classification assignment (4 rows — NULL → structured)

| ID | Before main/sub | After main/sub | Rollback |
|----|-----------------|----------------|----------|
| `cmr9xedzi…` | NULL / NULL | transit / vehicle_wrap | → NULL / NULL |
| `cmrap3eo…` | NULL / NULL | ooh / digital_signage | → NULL / NULL |
| `cmrn711g…` | NULL / NULL | ooh / digital_signage | → NULL / NULL |
| `cmtd4wpic…` | NULL / NULL | transit / subway_station | → NULL / NULL |

- **Not overwrite** — empty fields filled.
- **Saved JSON refs**: 0 (prod).
- **Filter gain**: +2 `digital_signage`, +1 `vehicle_wrap`, +1 `subway_station` (structured browse; no URL loss).

---

## EXCEPTION test

`--test-exception` injects virtual row with `main_category='__pr1a_unmapped_probe__'` into simulation.

- **Result**: `exception_raised`, message contains `unmapped`
- Forward `DO $$ … RAISE EXCEPTION` block will **abort entire transaction** on unknown main (design confirmed).

---

## Preview (823 rows) — Gate 2 + Gate 3

### Gate 2: Staging classification (not delete)

PR478 staging rows classified on preview DB:

| ID | type | Assigned main/sub |
|----|------|-------------------|
| `cmt9ocgm…` | dooh | ooh / digital_signage |
| `cmt9ocjik…` | dooh | ooh / digital_signage |

Rationale: `type=dooh` + PR478 test fixtures; preserves signal that NULL-main create path existed.

### Gate 3: Dry-run re-run

```
totalMedia:           823
would_offline:        823
would_online:         0
would_null_main:      0  (3× A2/A3 via forward map + 2× staging pre-classified)
```

`cmtd4wpic…` (A3b) **absent on preview** — prod-only.

---

## Gate 4 — Preview migrate + forward (2026-09-01)

### Steps

1. `npx prisma migrate deploy` → `20260901180000_media_catalog_channel` applied
2. `psql -f scripts/migrations/pr1a-catalog-channel-forward.sql`

### Pre-forward notice

```
total=823, catalog_channel offline=0, online=0, null=823, null_main=3
```

(3 = A2/A3 only; staging 2 pre-classified in Gate 2)

### Post-forward counts

| metric | value |
|--------|-------|
| total | 823 |
| offline | 823 |
| online | 0 |
| null channel | 0 |
| null main | 0 |

Classification rows (A2/A3 + staging):

| ID | main / sub | channel |
|----|------------|---------|
| `cmr9xedzi…` | transit / vehicle_wrap | offline |
| `cmrap3eo…`, `cmrn711g…` | ooh / digital_signage | offline |
| `cmt9ocgm…`, `cmt9ocjik…` | ooh / digital_signage | offline |

### INSERT smoke (post-forward, browse main empty)

Script: `scripts/audit/pr1a-gate4-insert-test.mts`

| Path | `media_main_category` | `catalog_channel` | Cleanup |
|------|----------------------|-------------------|---------|
| Admin POST logic | NULL | offline | deleted |
| CSV `createMediaFromCsvRow` | NULL | offline | deleted |

Fallback log emitted: `[catalog-channel] null-main fallback → offline { hits: … }`

**Note**: `npx prisma generate` required locally before Prisma accepts `catalogChannel` field.

### Gate 5 preview — rollback + code coupling (pre-check)

- SQL rollback clears `catalog_channel` values + drops NOT NULL; **does not drop column**
- Branch code still sets `catalogChannel` on create → **safe after SQL-only rollback** (column remains nullable)
- Full column drop would require branch revert + `prisma migrate` rollback — separate from data rollback script

---

## Prod runbook — rollback tiers (PR1a)

Prod incident 시 **두 단계**로 나눈다. 급할 때 컬럼까지 지우려다 시간을 버리지 않도록.

| 상황 | 조치 | 서비스 |
|------|------|--------|
| **데이터만 잘못** (백필·분류 오류) | `scripts/migrations/pr1a-catalog-channel-rollback.sql` 만 실행 | 코드 그대로, **중단 없음** — nullable 컬럼 + create 시 `offline` 기록 계속 가능 |
| **코드가 잘못** (create path·라벨 회귀) | **브랜치 revert + 재배포** | SQL rollback **선택** — 컬럼은 nullable로 **남겨도 됨** |
| 컬럼 제거 | `prisma migrate down` + 스키마 revert | **긴급 롤백에 필수 아님** — 코드 revert만으로도 등록·조회 가능 |

**Prod rollback scope**: per-row map **4건만** main/sub NULL 복원. Preview PR478 staging 2건은 Gate 2 별도 분류 — rollback SQL **대상 아님** (preview 전용).

**하지 말 것**: 긴급 시 `DROP COLUMN catalog_channel` 또는 migrate down까지 동시에 시도 (SQL data rollback과 코드 revert는 **별개**).

---

## Gate 5 — Preview rollback → re-apply (2026-09-01)

### 1. SQL rollback

`psql -f scripts/migrations/pr1a-catalog-channel-rollback.sql` → COMMIT

```
UPDATE 823 (catalog_channel → NULL)
UPDATE 3   (A2/A3 main/sub → NULL — preview; A3b prod-only)
```

### 2. Post-rollback counts

| metric | value |
|--------|-------|
| total | 823 |
| null_channel | **823** |
| set_channel | 0 |
| null_main | **3** (A2/A3 only; staging 2 **not** in rollback map — still ooh/digital_signage) |

A2/A3 3건 main/sub NULL 복원 확인. `cmtd4wpic…` (A3b) preview 없음.

### 3. INSERT smoke (nullable column)

`pr1a-gate4-insert-test.mts` — admin + CSV, browse empty → both **`offline`** ✅, fallback log 2회, cleanup ✅

### 4. List / filter (catalog_channel 전부 NULL)

`pr1a-gate5-ui-check.mts`:

| check | result |
|-------|--------|
| active KR catalog | 804 (non-empty) ✅ |
| `digital_signage` filter | 296건 ✅ |
| `vehicle_wrap` filter | A2 **미포함** ✅ (rollback 후 main/sub NULL) |
| list empty / filter crash | **없음** |

PR1a browse는 `catalog_channel` 미사용 — NULL 중간 상태에서도 목록·필터 정상.

### 5. Forward re-apply (idempotency)

Second forward on same DB → Gate 4와 **동일**:

```
total=823  offline=823  online=0  null_channel=0  null_main=0
```

Forward **멱등** 확인 ✅

---

## Gate 6 — Step 3 validation (preview, 2026-09-01)

Script: `scripts/audit/pr1a-gate6-validation.mts` · artifacts: `reports/pr1a-gate6/`

### 1. Price (90/90)

vs PR0 preview post-migration baseline — **90/90 match**, 0 diffs.

### 2. Filter (+3 on preview; +4 on prod with A3b)

| Filter | Count | Classified rows visible |
|--------|-------|-------------------------|
| `vehicle_wrap` | 5 | **A2** ✅ |
| `digital_signage` | 299 | **A3a, A3b** ✅ |
| `subway_station` | 199 | A3b prod-only (`cmtd4wpic…`) — N/A preview |

### 3. A2 card labels (surface-by-surface)

DB: `sub_category=택배카보드 광고` + `media_sub_category=vehicle_wrap` **coexist**.

| Surface | What user sees | Duplicate? |
|---------|----------------|------------|
| Discovery list meta | `seoul · mobile` | No structured/free-text |
| Detail hero pills | `이동형` (`typeLabels.mobile`) | No |
| PDF/PPTX report card | `교통 매체 · 차량 래핑` (`categoryLabel`) | Structured only |
| Search haystack | free-text indexed | Not displayed as label |

**Verdict**: same 화면에 free-text + structured **동시 노출 없음**. 데이터 모델에는 둘 다 존재 — admin 편집기에서만 양쪽 필드 노출. 추후 정책 결정 시 structured 우선·free-text 숨김 검토 (Gate 6에서 코드 변경 없음).

### 4. PDF/PPTX (physical generation)

Generated: `gate6-sample-report.pdf` (843KB), `gate6-sample-report.pptx` (376KB).

- `categoriesText`: **`이동형, 디지털 표출`** — bare 「디지털」 아님 ✅
- PPTX slide2 table cell: `이동형, 디지털 표출` — single run, 줄바꿈 없음
- PPTX slide4 CPM row label: `디지털 표출` — label column width OK

### 5. Admin re-save (A2 touch)

Prisma touch (description noop) 후:

- `catalog_channel=offline` ✅
- `media_main_category=transit`, `media_sub_category=vehicle_wrap` ✅
- `sub_category=택배카보드 광고` preserved ✅

---

## Preview blocker (resolved)

~~Preview has **5** `media_main_category IS NULL` rows~~ → staging 2 classified; forward SQL handles remaining 3 A2/A3 on apply.

---

## Code changes in Step 2 (this branch)

- `lib/catalog-channel.ts` + test — SSOT
- `lib/display-mode-labels.ts` — displayMode labels
- Prisma: `catalogChannel` + index migration (nullable until forward SQL)
- Forward / rollback SQL
- `getNullMainCatalogChannelFallbackHitCount()` + fallback log (PR0 alias pattern)
- `resolveCatalogChannelForMediaWrite` on all admin create paths
- Label cleanup ~20 sites (「디지털」→「디지털 표출」 etc.)
- Legacy planner UI: `key: "dooh"`, `messages catDigital`

**Not changed** (separate issue): `typeLabels.dooh = "DOOH"` on list cards.

---

## Next steps (awaiting gate)

1. ~~Gate 1 registration audit~~ ✅ optional → create-path fix added
2. ~~Gate 2 staging classification~~ ✅ preview DB
3. ~~Gate 3 preview dry-run~~ ✅ PASS
4. ~~Gate 4 preview migrate + forward + INSERT smoke~~ ✅
5. ~~Gate 5 rollback → re-apply~~ ✅
6. ~~Gate 6 Step 3 validation~~ ✅
7. Manual UI → merge → Neon backup → prod (+ prod INSERT smoke + price re-check w/ A2/A3/A3b)

---

## Post-PR1a follow-ups (out of scope — separate track)

**「매체 유형 라벨 일관성」** — PR1b / PR4 or dedicated chore:

| Issue | Surface | Symptom |
|-------|---------|---------|
| List raw `type` token | 발견하기 `metaLine` | `seoul · mobile` — EN slug exposed (Gate 6) |
| `typeLabels.dooh` | List cards | `"DOOH"` vs displayMode 「디지털 표출」 |

PR1a intentionally does **not** fix these — keeps 「변화 없음」 price/label verification clean.

---

## Artifacts

- `reports/pr1a-catalog-channel-dry-run.json` (last run: prod + exception)
- `scripts/audit/pr1a-gate4-insert-test.mts`
- `scripts/audit/pr1a-gate5-ui-check.mts`
- `scripts/audit/pr1a-gate6-validation.mts`
- `reports/pr1a-gate6/gate6-report.json`
- `reports/pr1a-gate6/gate6-sample-report.pdf` / `.pptx`
