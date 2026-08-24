# A-4 Region Mapping — Diagnosis Report

> 진단일: 2026-08-24 · **구현 전** · 승인 후 착수  
> 순서: **3-1 → 3-3 → 3-2(판단 대기)**

---

## 요약

| 이슈 | 증상 | 근본 원인 (코드) | 구현 전 확인 |
|------|------|------------------|-------------|
| **3-1** 서울대입구/관악 → 구로/신도림 | 상권·browse 칩 오분류 | **DB `region_sub=seoul_guro` 오저장**(주원인) + taxonomy `seoul_gwanak` 부재 + inference tie-break | DB 확인 ✅ (아래) |
| **3-2** 부산 시내버스 → 부산 시내 과집중 | 전환 캠페인 상권표 66.9% 한 bucket | `busan_downtown` default + mobile이 `regionSub`로 pin | **coverageDistrictCodes 확인 ✅** |
| **3-3** 해외(시부야) 상권 공란 | 일본 매체 district 있어도 표 omitted | `regionSub=overseas`가 `district`보다 우선 | 로컬 시뮬레이션 ✅ |

로컬 진단 스크립트: `npx tsx scripts/a4-diagnose-region-mapping.mts`

---

## 3-1. 서울대입구역(관악) → 구로/신도림

### ⚠️ 경로 명확화 (2026-08-24 재확인)

로컬 진단 스크립트의 `seoul_gangnam`과 프로덕션 PDF의 `구로/신도림`은 **같은 결손에서 나온 서로 다른 경로의 서로 다른 오답**이다. 별개 버그가 아니다.

| 경로 | 함수 | 입력 조건 | 출력 | 프로덕션 PDF와 일치 |
|------|------|-----------|------|---------------------|
| **A. 상권표·PDF 세분화** | `computeRegionSubdivisionReport` → `resolveRegionSubdivisionKey(field=regionSub)` → `regionSubdivisionLabel` | DB **`region_sub=seoul_guro`** (stored) | **구로/신도림** | ✅ **이게 프로덕션 증상** |
| **B. CalcEngine 매체 라벨** | `resolveRegionRef` → stored sub 유효 시 browse 라벨 | DB **`region_sub=seoul_guro`** | **구로/신도림** | ✅ (포트폴리오 행) |
| **C. CalcEngine fallback** | `resolveRegionRef` → `inferBrowseRegionFromMedia` | `region_sub` **null** | **강남/서초** (`seoul_gangnam`) | ❌ (로컬 스크립트만 테스트) |
| **D. 상권표 (sub null 혼합)** | `pickRegionSubdivisionField` → `regionZone` wins | m1 sub null + m2/m3 sub 있음, zone 3/3 | **관악권·강서권·마포권** | ❌ (고려 캠페인 픽스처) |

**로컬 스크립트가 `inferBrowseRegionFromMedia`만 호출**해서 C 경로(`seoul_gangnam`)만 보여준 것. 프로덕션 PDF 상권표는 A/B 경로(**stored `seoul_guro`**)를 탄다.

`seoul_gangnam` 원인: `region_sub` null + `region=seoul`일 때 alias 매칭 점수 동률 → taxonomy **첫 sub** (`seoul_gangnam`) tie-break. `region_zone=gwanak`은 inference zone-map에 **없음**.

### DB 확인 (운영, 2026-08-24)

서울대입구/관악 active 매체 **전원** `region_sub=seoul_guro` + `district=관악구`:

| id | name | slug | district | region_sub | region_zone |
|----|------|------|----------|------------|-------------|
| `cms7cpp85000e04jm72xswkrv` | 지하철 2호선 서울대입구역 맥스비전 | `…sinrimyeok…` ⚠️ | 관악구 | seoul_guro | downtown |
| `cmp02a32h000804jx74rsirpz` | 서울대입구역 우남빌딩 | `seouldaeipguyeok…` | 관악구 | seoul_guro | gwanak |

집계:
- `region_zone=gwanak` 이면서 `region_sub≠관악 계열`: **11건** (guro 4, yeongdeungpo 4, null 2, gangnam 1)
- `region_sub=seoul_guro` + `district ILIKE '%관악%'`: **6건** (전부 mismatch)

**결론:** `seoul_gwanak` taxonomy + backfill이 **프로덕션 증상(구로/신도림)을 직접 고친다.** slug `sinrimyeok` 오염이 guro sub 저장의 유력 원인.

### 아키텍처

- **Planner zone** (`regionZone`): `gwanak` = 관악·동작·금천 — `lib/media-regions.ts`
- **Browse chip** (`regionSub`): Seoul 14 subs — **`seoul_gwanak` 없음**, `seoul_guro`(구로/신도림) 있음
- **상권표**: `pickRegionSubdivisionField()` — `regionSub` > `regionZone` > `district` (stored sub 3/3이면 regionSub field)

### 관련 코드

- `lib/plan-cart-report/region-subdivision.ts` — **PDF 상권표 라벨** (`regionSubdivisionLabel` → `browseRegionLabel`)
- `lib/planner/calc/engine.ts` — `resolveRegionRef` — **매체 행 지역 라벨**
- `lib/media-browse-regions.ts` — `inferBrowseRegionFromMedia` — **sub null fallback only**
- `lib/media/region-main-corrections.ts` — manual list (관악 미포함)

### 구현 방향 (승인 후)

1. `MEDIA_BROWSE_REGIONS`에 **`seoul_gwanak`** 추가 (aliases: 관악, 서울대입구, 봉천 등)
2. `inferBrowseRegionFromMedia` — `regionZone=gwanak` → `seoul_gwanak` zone-map 추가 (C 경로도 수정)
3. 서울대입구/관악 매체 **backfill** `region_sub=seoul_gwanak` (A/B 경로 수정 — **핵심**)
4. slug `sinrimyeok` on 서울대입구 수동 correction
5. `신도림` alias — word-boundary 또는 district 교차검증 (재오염 방지)

---

## 3-2. 부산 시내버스 — 부산 시내 과집중

### 문서화된 증상

`reports/backlog-a4-busan-bus-district.md` — 부산 시내 ~66.9% 노출 집중

### 추정 메커니즘

- `type=mobile` + `region_main=busan` → inference default **`busan_downtown`**
- Alias `"부산"` → downtown bucket
- 상권표는 `regionSub` 우선 → network bus가 단일 상권에 pin

### coverageDistrictCodes 확인 (2026-08-24)

테스트 매체 `cmqjdj9yr000104i6kcdcxdt1` (부산 시내버스 외부광고):

| 필드 | 값 |
|------|-----|
| `coverage_district_codes` | **16개** (부산 전 구·군 MOIS 코드) |
| `district` | `부산 전역` |
| `region_sub` | `busan_downtown` |

부산 `type=mobile` 버스 5건 **전부 code_count=16**.  
전국 mobile+버스: **33/34건** coverage codes 보유.

**→ 데이터는 채워져 있고 신뢰 가능.** Jaehan님 조건부 의견대로 `coverageDistrictCodes` 우선 검토 대상.  
다만 상권표(`region-subdivision.ts`)는 현재 **coverage codes 미사용** — 구현 시 field 추가 또는 `district`/광역 라벨 정책 선택 필요.

### Jaehan님 최종 결정 (구현 보류)

1. **coverageDistrictCodes 분할** (데이터 있음 — 16구 bucket) vs **광역 단일 bucket** (`부산 전역`)  
2. `pickRegionSubdivisionField`에서 mobile bus **`regionSub` deprioritize** 여부

---

## 3-3. 해외 매체 상권 공란 (시부야)

### 근본 원인

`lib/media-country.ts` — JP save 시 `regionSub=overseas` (전 매체 동일)

`region-subdivision.ts`:
- `regionSub` priority > `district`
- ≥2 distinct keys 필요 — `overseas` 1 bucket → **report null**

### 로컬 시뮬레이션 (`a4-diagnose-region-mapping.mts`)

| 조건 | 상권표 |
|------|--------|
| `regionSub=overseas` + district=Shibuya* | **0 rows (omitted)** |
| `regionSub=null` + distinct districts | **rows 생성** |

### 구현 방향 (승인 후)

1. Overseas save: `regionSub=null` 유지 또는 city-level sub (`overseas_jp_tokyo`)  
2. 또는 `pickRegionSubdivisionField` — `regionMain=overseas`일 때 **district 우선**  
3. Admin 가이드: 해외 매체 **district/city 필수**

---

## 착수 순서 (합의)

1. **3-1** — DB 건수 확인 → taxonomy + backfill PR  
2. **3-3** — overseas field-pick 정책 PR  
3. **3-2** — Jaehan님 정책 후

---

## 의존성

- A-6 partial rate / pricing / onboarding과 **독립**
- Wave4 checklist에서 서울대입구는 A-4 out-of-scope로 표시됨 — 이번에 정식 착수
