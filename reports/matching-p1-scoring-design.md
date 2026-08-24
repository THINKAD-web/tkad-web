# P1 매칭 스코어링 설계안

작성: 2026-08-24  
상태: **검토 대기** (P0 머지 후 구현 착수)

---

## 0. 전제 (진단 승인 반영)

- PR #448 전면 롤백 **하지 않음**
- `targetCategory`는 가중치 상향 **보류** — 분포 분석 결과 변별력 없음 (§1)
- 업종 축: **키워드 좁히기 + 보너스 분리** (평균에서 제외)
- 예산: **토글(기본 ON) + 초과 페널티**
- 다양성 cap: **`buildRecommendedMix`에만** 적용

---

## 1. targetCategory 분포 (프로덕션 DB, n=797)

| 지표 | 값 |
|---|---|
| `targetCategory` 있음 | 792 (99.4%) |
| 비어 있음 | 5 |
| **고유 태그 수** | **9** |
| 고유 조합 수 | 64 |

### 태그별 커버리지

| 태그 | 매체 수 | 비율 |
|---|---|---|
| brand | 789 | 99.0% |
| event | 685 | 85.9% |
| public | 649 | 81.4% |
| seasonal | 605 | 75.9% |
| global | 602 | 75.5% |
| fandom | 572 | 71.8% |
| regional | 502 | 63.0% |
| small_business | 312 | 39.1% |
| university | 132 | 16.6% |

**결론:** 캠페인 목적(브랜딩·이벤트·시즌) 태그이지 업종 태그가 아님. `brand`가 99%라 **업종 매칭 가중치로 쓰면 변별력 없음**. P1에서 `targetCategory` 의존은 제외.

원본: `scripts/.diagnose-brief-matching-regression/target-category-distribution.json`

---

## 2. 이슈 1 — 업종 축 재설계

### 2.1 현재 문제

- brief 4축 평균에 `industry` 포함 → 대부분 동일 점수라 순위에 거의 영향 없거나, F&B 시 **80%가 100점**
- `scoreIndustry` haystack = `mediaRegionHaystack` (역명·상권명 포함)
- F&B 키워드에 `상권|카페|역` 등 일반어 포함

### 2.2 설계: 평균 3축 + 업종 보너스

```
displayTotal = round(avg(region, budget, target)) + industryBonus
```

- `industry`는 **axes 배열에 rationale용으로만** 남기거나, UI 라벨은 유지하되 `total` 계산에서 제외
- `industryBonus` 범위: **0 ~ +15** (제안, 아래 표)
- 페널티(음수)는 **P1.1에서 보류** — 보너스만으로 먼저 검증

| 매칭 강도 | 조건 | 보너스 |
|---|---|---|
| Strong | 업종 전용 키워드가 **콘텐츠 haystack**에 hit | **+15** |
| Medium | 해당 업종 `mediaTypes` 일치 (키워드 없음) | **+6** |
| Weak | 그 외 | **0** |

**Strong 매칭 haystack** = `name` + `subCategory` + `tags` 만 사용  
(features/description/advertiserHistory는 카탈로그 보일러플레이트에 `f&b` 문자열이 많아 **제외**)

### 2.3 업종별 키워드 (좁힌 목록)

일반 지역·교통어(`역`, `지하철`, `상권`, `유동`, `강남`, `홍대` 등) **전부 제거**.  
`f&b` / `fb` 단독 substring **제거** (카탈로그 보일러플레이트 오탐 다수).

| matching key | Strong 키워드 (정규식 요약) | mediaTypes (Medium) |
|---|---|---|
| **fnb** | 푸드코트, 먹자골목, 요식, 식음료, 레스토랑, 베이커리, 카페, 주점, 디저트, 맛집, bakery, restaurant, food hall, dining, 이마트24, 편의점, cu, gs25, 서브웨이, 스타벅스, 치킨, 피자, 버거 | mobile, static, subway, digital |
| **retail** | **Strong:** 백화점, 쇼핑몰, 아울렛, 매장, retail, department, boutique, 팝업, popup + tag exact `shopping_mall`/`mall` · **Medium:** 뷰티, beauty, cosmetic, 패션, fashion | digital, static, mobile |
| **tech** | 테크, saas, software, ict, 스타트업, startup, 판교, 판교테크노밸리, 테헤란로, 정보기술, 인공지능, 빅데이터, 클라우드, 플랫폼, 개발자, 스타트업밸리, 유니콘, 실리콘밸리, 성수, 앱(토큰 경계) — **제외:** 디지털, IT, AI, 핀테크, 강남역·역삼 | digital, mobile, subway |
| **finance** | 금융, 은행, 증권, 보험, fintech, finance, 여의도, 테헤란 | digital, static |
| **entertainment** | k-pop, kpop, 콘서트, 공연, 엔터, 영화, 게임, fan, fandom | digital, mobile |
| **other** | (보너스 없음) | — |

### 2.4 목표 지표 (구현 후 검증)

F&B / 서울·경기 / 3천만 / 2030 여 시나리오 (n=564):

| | 현재 (지역 haystack + 넓은 키워드) | 제안 (name/tags + 좁은 키워드) | 목표 |
|---|---|---|---|
| Strong 비율 | **~72%** | **~23%** (시뮬) | **≤20%** |

Medium(mediaTypes)은 Strong 미달 시에만 +6. Strong+Medium 합산은 ~40% 이하 예상.

시뮬레이션 원본: 로컬 스크립트 (name+tags haystack, v2 키워드). 구현 후 `diagnose-brief-matching-regression.mts`에 업종 분포 리포트 추가.

### 2.5 변경 파일 (예상)

- `lib/matching-engine.ts` — `INDUSTRY_DEFS` 키워드 정리, `scoreIndustry`에 haystack 소스 옵션
- `lib/planner/brief/scoring.ts` — `industryAxisScore` → bonus 함수, `total` 계산 분리
- `lib/planner/brief/scoring.ts` — `briefRankingBasisLabel` 유지
- 테스트: `lib/planner/brief/__tests__/scoring-industry-bonus.test.ts` (신규)

---

## 3. 이슈 2 — 예산 축

### 3.1 UX: "예산 내만 보기" 토글

| 항목 | 값 |
|---|---|
| 위치 | Step 2 상단·Quick 랭킹 헤더 |
| 기본값 | **ON** (예산 내만) |
| OFF 시 | 초과 매체도 랭킹에 표시, 초과 뱃지 노출 |
| 저장 | `useBriefStore` 세션 상태 (`budgetWithinOnly: boolean`) |

필터 기준: `calcLineMetrics({ media, units: 1 }, days).costWon.value <= budgetWon`

### 3.2 랭킹 페널티 (토글 OFF일 때도 순위 반영)

초과 매체를 완전히 숨기지 않되, 순위를 낮춤:

```
if lineCost > budgetWon:
  overRatio = lineCost / budgetWon   // e.g. 1.3 = 30% 초과
  budgetPenalty = min(20, round((overRatio - 1) * 35))
displayTotal -= budgetPenalty
```

| 초과율 | 페널티 |
|---|---|
| 0% (이내) | 0 |
| +20% | 7 |
| +50% | 18 |
| +57% 이상 | 20 (cap) |

예: 3천만 예산에 4천만 매체 → ratio 1.33 → **페널티 12점**

**이유:** CPM 효율 점수만으로는 고가 매체가 상위에 남음. 페널티는 순위용이고, 믹스 빌더는 기존처럼 hard skip 유지.

### 3.3 변경 파일 (예상)

- `lib/planner/brief/store.ts` — `budgetWithinOnly`
- `lib/planner/brief/scoring.ts` — `budgetPenaltyWon`, `applyBudgetAdjustments()`
- `components/planner/brief/brief-step-two.tsx` — 토글 UI
- `components/planner/brief/brief-quick-rank.tsx` — 토글 UI
- 카드: `예산 초과` 뱃지 (lineCost > budget 시)

---

## 4. 이슈 3 — 다양성 cap (자동 믹스만)

### 4.1 규칙

`buildRecommendedMix` greedy 선택 시:

1. 점수 순으로 순회 (기존)
2. 예산 초과 skip (기존)
3. **신규:** 이미 선택된 라인 중
   - 동일 `media.district` (없으면 `regionSub` → `regionMain`) **≥ 2건** → skip
   - 동일 `media.type` **≥ 2건** → skip
4. `maxLines` 5 유지

| 파라미터 | 제안값 | 대안 |
|---|---|---|
| district cap | **2** | 3 (너무 느슨하면 홍대 5건 재발) |
| type cap | **2** | 3 |

**랭킹 목록(`scoreMediaCandidates` 결과)에는 cap 미적용.**

### 4.2 Jaehan 조건 예상 효과

현재 자동 믹스 5건 중 마포구(홍대) 3~4건 → cap 적용 시 **최대 2건**, 나머지 슬롯은 성수·서울대입구 등으로 분산.

### 4.3 변경 파일 (예상)

- `lib/planner/brief/scoring.ts` — `buildRecommendedMix` only
- `lib/planner/brief/rebuild-mix.ts` — 동일 로직 경유 확인
- 테스트: mix diversity fixture

---

## 5. 구현 순서 (P1)

1. **업종 보너스 + 키워드** — 스코어 분포 리포트로 ≤20% 검증
2. **예산 토글 + 페널티** — Step 2 / Quick UI
3. **믹스 diversity cap** — 자동 믹스만

각 단계마다 `diagnose-brief-matching-regression.mts` 시나리오 4개 재실행.

---

## 6. 확정 요청 사항

| # | 항목 | 제안 | 확인 |
|---|---|---|---|
| A | 업종 Strong 보너스 | +15 | ? |
| B | 업종 Medium 보너스 | +6 | ? |
| C | 예산 초과 페널티 cap | 20점, `(ratio-1)×35` | ? |
| D | 토글 기본값 | ON (예산 내만) | ? |
| E | district cap | 2 | ? |
| F | type cap | 2 | ? |
| G | `targetCategory` 업종 연동 | **보류** (분포상 무의미) | 승인됨 |

---

## 부록: P0 완료 항목 (이번 PR)

- Step 2·Quick 카드 썸네일 (`PlannerMediaThumb` + 유형 placeholder)
- 프리셋 풀 12개, 화면 3개 shuffle + "다른 예시 보기"
