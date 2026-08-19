# PR-3 Phase 4a-4 — 엔진 배선 + UI (2026-08-19)

**상태:** ✅ 코드 + production 엔진 검증 pass — **Preview UI 확인 후 merge**  
**PR:** (생성 예정)

---

## [4a-4-1] 엔진 배선

- `calcMixMetrics()` → `tryCalcReach()` 호출
- 입력: `coverageDongs`(+ MOIS population) / `briefToTargetSpec` (Phase 3 동일)
- DongProfile 성·연령: 동별 데이터 없음 → `NATIONAL_*` 폴백 → **basis: derived**
- **coverage NULL 매체:** 도달 계산에서 **제외**, 나머지로 산출
- `reachMeta.excludedCount` → UI 안내

## [4a-4-2] 안전 가드

| 가드 | 동작 |
|------|------|
| reachRate > 1.0 | error log + null |
| netReach > targetPopulation | error log + null |
| netReach > coveragePopulation 합 | error log + null |
| ρ | 0.7 유지 |

## [4a-4-3] UI

- `metrics-panel.tsx`: 4개 PendingRow → 값 + `[추정]` 배지
- coverage 제외 N건 안내 문구

---

## [4a-4-4] 검증 (production DB)

**시나리오:** 3천만원 · 서울·경기 · 2030 여성 · 14일 · 매체 10개

| 지표 | 값 | OK |
|------|-----|:---:|
| 순 도달 | 1,801,838 | ✅ |
| 도달률 | **57.78%** | ✅ ≤100% |
| 평균 빈도 | 19.6 | ✅ |
| GRP | 1,134.2 | ✅ |
| basis | derived | ✅ |

| 패턴 | 결과 |
|------|------|
| 1 vs 10 매체 Reach↑ Frequency↑ | ✅ (10개 180만 / 빈도 19.6) |
| 같은 구 2 vs 여러 구 3 | ✅ 74,752 → 102,753 |
| NULL coverage 혼합 | ✅ excluded=1, reach 유지 |

JSON: [`pr3-phase4a-44-verify-production.json`](pr3-phase4a-44-verify-production.json)

**Preview UI:** merge 후 Vercel preview에서 Step 2 지표 패널 확인 필요.

---

## 변경 파일

| 파일 | 역할 |
|------|------|
| `lib/planner/brief/mix-metrics.ts` | Reach 배선 |
| `lib/planner/brief/reach-adapter.ts` | 입력 변환 |
| `lib/metrics/mois-population-index.ts` | MOIS index |
| `lib/public-media-catalog.ts` | planner catalog coverage enrich |
| `components/planner/brief/metrics-panel.tsx` | UI |
| `lib/planner/brief/__tests__/mix.test.ts` | +5 tests |

**verdict: pass (엔진)** — merge는 재한 Preview UI 확인 후.
