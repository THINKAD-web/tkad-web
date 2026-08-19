# PR-3 Phase 3-2 — Demo backfill dry-run (production)

**상태:** ✅ dry-run 완료 (execute 대기 — 재한 승인 필요)  
**범위:** `media_computed_metrics.demo_*` backfill 시뮬레이션 · **scoring.ts 미포함** (별도 PR)

---

## 1. 코드 반영 (로컬)

| 파일 | 내용 |
|------|------|
| `lib/metrics/defaults.ts` | 9클래스 `DEFAULT_DEMO_GENDER` / `DEFAULT_DEMO_AGE` (승인본) |
| | `resolveDemoGenderSplitWithBasis`, `resolveDemoAgeSplitWithBasis`, `targetAudienceShare` |
| | `MetricBasis` + `parsed`, `weakestBasis` 갱신 |
| `lib/metrics/demo-age-bridge.ts` | `targetAgeToAgeSplit()` |
| `lib/planner/parse-target-age.ts` | `20-39세` 연령(세) 범위 패턴 |
| `scripts/backfill-pr3-phase3-demo.mts` | dry-run / execute |
| `lib/metrics/__tests__/demo-defaults.test.ts` | 7 tests ✅ |

---

## 2. 대상 규모

| 지표 | 값 |
|------|-----|
| `media_computed_metrics` 행 | **827** |
| backfill 대상 (demo NULL) | **827** |
| skip (이미 값 있음) | **0** |

---

## 3. Basis 분포 (backfill 시뮬레이션)

### 성별 (`demo_gender_split`)

| basis | 건수 | 비율 |
|-------|------|------|
| **default** | **827** | 100% |
| measured / derived / parsed | 0 | — |

→ Signal/실측 없음. 전건 class 프로파일.

### 연령 (`demo_age_split`)

| basis | 건수 | 비율 |
|-------|------|------|
| **parsed** | **782** | **94.6%** |
| **default** | **45** | **5.4%** |
| measured / derived | 0 | — |

---

## 4. targetAge 브릿지 검증 (742/804 대비)

| 지표 | 이전 조사 (804 active) | 이번 prod (827 computed) |
|------|------------------------|---------------------------|
| `targetAge` non-empty | ~803 | **826** |
| `parseTargetAge` → range | **742** (92.3%) | **782** (94.6%) |
| `targetAgeToAgeSplit` hit | — | **782** (= parsed 건수) |
| fallback (미인식 텍스트) | ~62 | **44** |
| empty | ~1 | **1** |

→ **827건 기준으로도 parsed 비율 유사·소폭 상승** (행 증가 + `20-39세` 패턴 추가).

---

## 5. 클래스별 연령 basis

| class | total | parsed | default |
|-------|-------|--------|---------|
| dooh_large | 249 | 245 | 4 |
| subway_psd | 195 | 190 | 5 |
| dooh_mid | 139 | 134 | 5 |
| airport | 82 | 80 | 2 |
| static_other | 79 | 77 | 2 |
| bus_exterior | 41 | 20 | 21 |
| bus_shelter | 28 | 25 | 3 |
| subway_light | 14 | 11 | 3 |
| elevator_tv | 0 | 0 | 0 |

**bus_exterior** default 21건 — `targetAge` 자유 텍스트(브랜드·지역명) 비중 높음.

---

## 6. Execute 예정 (승인 후)

```bash
DATABASE_URL="@ep-holy-cloud..." npx tsx scripts/backfill-pr3-phase3-demo.mts --execute --allow-prod
```

JSON: [`pr3-phase3-32-dry-run-production.json`](pr3-phase3-32-dry-run-production.json)

---

## 7. 다음 단계 (별도)

1. backfill execute + post-verify (재한 승인)
2. **scoring.ts** demo share 로직 PR (3-2b)
3. UI 문구 (3-3)
