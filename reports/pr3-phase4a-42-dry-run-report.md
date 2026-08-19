# PR-3 Phase 4a-2 — MOIS 시·군·구 인구 Signal dry-run (2026-08-19)

**상태:** ✅ dry-run 완료 (execute 대기 — 재한 승인 필요)  
**범위:** `population_demographics` Signal INSERT만. coverage/backfill/배선 없음.

---

## [4a-2-0] API 키 — **불필요** ✅

| 항목 | 결과 |
|------|------|
| jumin.mois.go.kr CSV | **로그인·API 키 없이** POST `downloadCsv.do` 로 다운로드 가능 |
| data.go.kr 활용신청 | **불필요** (이번 배치) |
| 재한 액션 | **없음** |

검증: `fetchMoisSigunguCsv()` — 세션 쿠키 1회 후 POST, 2026-07 전국 시·군·구 CSV ~15KB 수신.

---

## [4a-2-1] 데이터 수집

| 항목 | 값 |
|------|-----|
| 방식 | MOIS CSV 정적 fetch (배치 시점 최신 월) |
| 기준월 | **2026-07** (주민등록 월간, 매월 1일 12시 이후 공표) |
| 범위 | 서울·경기 **leaf 시·군·구**만 |
| 성·연령 | **미포함** (총인구만 — Phase 4b) |

---

## [4a-2-2] 코드·명칭 매핑

### MOIS CSV 형식

```
"서울특별시 강남구 (1168000000)","552,631","244,825"
```

- **regionCode**: 10자리 행정기관코드 (Signal `sourceKey`)
- **regionName**: `서울특별시 강남구` / `경기도 성남시 분당구`

### 우리 DB vs MOIS

| 필드 | 형식 | MOIS 매칭 |
|------|------|-----------|
| `regionMain` | browse id (`seoul`, `gyeonggi`) | 시도 필터용 |
| `regionSub` | browse cluster (`seoul_gangnam`) | **4a-3**에서 구 배분 — 4a-2 Signal과 직접 1:1 아님 |
| `district` | 한글 행정구 (`강남구`, `성남시 분당구`) | **4a-3 매핑 1순위** |

### district → MOIS 사전 점검 (prod, seoul·gyeonggi active 605건)

| 구분 | 건수 |
|------|-----:|
| distinct `district` | 55 |
| **mapped** | 45 |
| **skipped** (광역·모호) | 9 |
| **failed** | **1** |

**failed (1건)**

| district | reason | 비고 |
|----------|--------|------|
| `부평구` | no_mois_match | 인천 부평구 — `region_main`이 seoul/gyeonggi인 매체에 붙어 있음. **4a-3에서 regionMain/district 정합 또는 인천 제외** 필요 |

**skipped (9건)** — 4a-3에서 별도 광역 커버 규칙

`서울 전역`, `서울 전역 (1~4호선)`, `서울 전역 (1~8호선)`, `경기도 전역`, `강남·서초·분당·영통`, `강남구 등`, `다수`, `성동구 외 다수`, `종로구 외 다수`

---

## [4a-2-3] Signal dry-run

| 항목 | 값 |
|------|-----|
| MOIS leaf sigungu (서울·경기) | **72** (서울 25 + 경기 47) |
| 기존 `population_demographics` | 0 |
| **wouldCreate** | **72** |
| noAnchorMedia | **0** |

### Signal 스키마

| 필드 | 값 |
|------|-----|
| `sourceType` | `population_demographics` |
| `sourceKey` | MOIS 10자리 `regionCode` |
| `sourceUrl` | `https://jumin.mois.go.kr/statMonth.do` |
| `validFrom` | 2026-07-01 |
| `rawValue` | `{ regionCode, regionName, sigunguName, sidoName, population, referenceMonth, method }` |

**mediaId**: FK 충족용 anchor — 해당 `district` 매체 1건(40), 없으면 sido fallback(32). **조회는 `sourceType`+`sourceKey`**.

JSON: [`pr3-phase4a-42-dry-run-production.json`](pr3-phase4a-42-dry-run-production.json)

---

## Execute (승인 후)

```bash
npx tsx scripts/backfill-pr3-phase4a-42-mois-population.mts --execute --allow-prod
# preview:
DATABASE_URL=<preview> npx tsx scripts/backfill-pr3-phase4a-42-mois-population.mts --execute
```

---

## 파일 (로컬, PR 전)

| 파일 | 역할 |
|------|------|
| `lib/metrics/mois-population.ts` | MOIS CSV fetch/parse |
| `lib/metrics/district-mois-map.ts` | district ↔ MOIS (4a-3 사전 점검) |
| `scripts/backfill-pr3-phase4a-42-mois-population.mts` | dry-run / execute |
| `lib/metrics/__tests__/mois-population.test.ts` | 파서·매핑 테스트 |

---

## Verdict

| Check | Result |
|-------|--------|
| API 키 | 불필요 |
| MOIS fetch | ✅ 72 sigungu |
| Signal wouldCreate | ✅ 72 |
| district failed | ⚠️ 1 (`부평구` — 데이터 정합, Signal 자체와 무관) |

**execute 승인 가능.** `부평구` 1건은 4a-3 매체→구 매핑 PR에서 처리.

---

**여기서 멈춤.** execute 승인 후 진행. 4a-3은 별도 지시.
