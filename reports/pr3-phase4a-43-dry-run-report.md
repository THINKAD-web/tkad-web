# PR-3 Phase 4a-3 — 매체→구 coverage dry-run (2026-08-19)

**상태:** ✅ dry-run 완료 (execute 대기 — 재한 승인 필요)  
**범위:** `MediaComputedMetric.coverageDongs` / `coveragePopulation` backfill

---

## [4a-3-1] 매핑 로직 설계

### 우선순위

| 순위 | 입력 | 처리 |
|------|------|------|
| 1 | `district` 단일 구 | MOIS Signal 1건, weight=1 |
| 2a | `district` 광역 (`서울 전역*`, `경기도 전역`) | 해당 시도 **전체 구 균등** weight |
| 2b | `district` · 목록 (`강남·서초·분당·영통`) | 파싱한 구 **균등** weight |
| 3 | `regionSub` browse 클러스터 | alias/라벨 → MOIS 구 **균등** weight |
| — | 실패 | coverage NULL 유지 |

`coveragePopulation` = Σ(구 인구 × weight) — Reach 모집단 근사.

### skipped 9건 처리 **제안** (복수 구 **균등 배분**)

| district 패턴 | 제안 | 이유 |
|---------------|------|------|
| `서울 전역`, `서울 전역 (1~4호선)`, `(1~8호선)` | 25구 균등 (`broad_seoul_equal`) | 네트워크 매체는 전 시 멀티 커버가 자연스러움 |
| `경기도 전역` | 47 unit 균등 (`broad_gyeonggi_equal`) | 동상 |
| `강남·서초·분당·영통` | 4구 균등 (`district_dot_list_equal`) | 명시된 구 목록 |
| `강남구 등`, `다수`, `X 외 다수` | **regionSub** 있으면 클러스터 배분; 없으면 **NULL** | 모호 — 대표 1구만 쓰면 과소 |

**대표 1구만**은 광역·패키지 매체에서 도달이 크게 과소 estimating 되므로 **비추천**. `calcNetReach()`가 `[{code,weight},…]` 배열을 전제로 설계됨.

코드: `lib/metrics/coverage-map.ts`

---

## [4a-3-2] region_main 불일치 전수 점검

**seoul/gyeonggi active 605건** 중 **7건** (고치지 않음, 목록만)

| # | mediaId | name | region_main | city | district | expected |
|---|---------|------|-------------|------|----------|----------|
| 1 | `cmqt906rj00000ajlt4lmwchi` | 지하철 1호선 부평역 스크린도어 광고 | seoul | 인천 | 부평구 | incheon |
| 2 | `cmqrpy6vh00030ai366l1xgkn` | 공항철도 검암역 개찰구 래핑 광고 | seoul | 인천 | 서구 | incheon |
| 3 | `cmqrnc9uw00010bj7wh5uteyv` | 공항철도 개찰구 래핑 Full Package | seoul | 인천 | 서구 | incheon |
| 4 | `cmrm2f88q000204kydtp2vmzj` | 전통시장 LED 전광판 광고 | seoul | 경기 | 부천시 원미구 | gyeonggi |
| 5 | `cmqrpnxqa00000bj9zhwkdlpj` | 공항철도 김포공항역 개찰구 래핑 | seoul | 경기도 | 김포시 | gyeonggi |
| 6 | `cmqt7egdr000104l54jc6hrmc` | 광역전철 스티커 + 듀얼 LCD PKG | seoul | 경기 | 성남시 분당구 | gyeonggi |
| 7 | `cmoy5jrdi000004i9543h9wb9` | 대구 지하철 3호선 동대구역 … | seoul | 대구 | 동구 | daegu |

→ **7건** — 1~2건 수준이 아니라 **소규모 정정 PR** 권장 (4a-3 execute와 병행 가능: mismatch 7건은 coverage NULL 유지).

상세 JSON: [`pr3-phase4a-43-region-mismatch-audit.json`](pr3-phase4a-43-region-mismatch-audit.json)

---

## [4a-3-3] dry-run 결과 (production)

| 항목 | 값 |
|------|-----|
| seoul/gyeonggi active | **605** |
| Signal loaded | 72 |
| computedMetric 없음 (skip) | 50 |
| **wouldUpdate (매핑 성공)** | **544** |
| **wouldFail (NULL 유지)** | **11** |

### 실패 11건 내역

| reason | 건수 |
|--------|-----:|
| region_main_mismatch | 7 |
| ambiguous_district_no_regionsub | 2 |
| no_district_or_regionsub | 2 |

### 매핑 method 분포 (544건)

| method | 건수 |
|--------|-----:|
| district_seoul_full | 493 |
| district_gyeonggi_full | 30 |
| broad_seoul_equal | 8 |
| broad_gyeonggi_equal | 6 |
| district_sigungu_suffix | 4 |
| region_sub_cluster_equal | 2 |
| district_dot_list_equal | 1 |

### 구별 매체 수 (상위 10)

| 구 | 매체 수 | Signal 인구 |
|----|--------:|------------:|
| 강남구 | 122 | 552,631 |
| 중구 | 65 | 117,493 |
| 마포구 | 59 | 356,154 |
| 서초구 | 53 | 414,616 |
| 용산구 | 43 | 199,575 |
| 종로구 | 35 | 136,139 |
| 성동구 | 31 | 274,346 |
| 영등포구 | 28 | 371,691 |
| 송파구 | 22 | 649,715 |
| 광진구 | 21 | 330,802 |

전체 표: dry-run JSON `bySigungu` (72개 구 중 매핑된 구)

### coveragePopulation sanity

| 구 | Signal 인구 | 비고 |
|----|------------:|------|
| 강남구 | **552,631** | 단일 구 매체 → population ≈ 55만 ✅ |
| 서초구 | 414,616 | ✅ |
| 마포구 | 356,154 | ✅ |

광역 매체(`broad_seoul_equal`)는 25구 합산 가중 → population ≈ 928만 수준 (정상).

JSON: [`pr3-phase4a-43-dry-run-production.json`](pr3-phase4a-43-dry-run-production.json)

---

## [4a-3-4] Execute (승인 후)

```bash
npx tsx scripts/backfill-pr3-phase4a-43-coverage.mts --execute --allow-prod
```

---

## Verdict

| Check | Result |
|-------|--------|
| 매핑 설계 | ✅ 복수 구 균등 배분 |
| region_main audit | ⚠️ **7건** (별도 정정 권장) |
| dry-run 544/555 mappable | ✅ |
| 인구 sanity | ✅ |

**execute 승인 가능.** mismatch 7건은 coverage NULL로 두고 4a-4 배선.

---

**여기서 멈춤.** 4a-4는 별도 지시.
