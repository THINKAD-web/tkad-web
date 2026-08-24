# A-4 Region Mapping — Diagnosis Report

> 진단일: 2026-08-24 · **구현 전** · 승인 후 착수  
> 순서: **3-1 → 3-3 → 3-2(판단 대기)**

---

## 요약

| 이슈 | 증상 | 근본 원인 (코드) | 구현 전 확인 |
|------|------|------------------|-------------|
| **3-1** 서울대입구/관악 → 구로/신도림 | 상권·browse 칩 오분류 | browse taxonomy에 `seoul_gwanak` 없음 + `신도림` alias 오매칭 + `region_zone=gwanak` 무시 | DB 실제 건수 SQL |
| **3-2** 부산 시내버스 → 부산 시내 과집중 | 전환 캠페인 상권표 66.9% 한 bucket | `busan_downtown` default + mobile이 `regionSub`로 pin | **Jaehan님 정책 결정** |
| **3-3** 해외(시부야) 상권 공란 | 일본 매체 district 있어도 표 omitted | `regionSub=overseas`가 `district`보다 우선 | 로컬 시뮬레이션 ✅ |

로컬 진단 스크립트: `npx tsx scripts/a4-diagnose-region-mapping.mts`

---

## 3-1. 서울대입구역(관악) → 구로/신도림

### 아키텍처

- **Planner zone** (`regionZone`): `gwanak` = 관악·동작·금천 — `lib/media-regions.ts`
- **Browse chip** (`regionSub`): Seoul 14 subs — **`seoul_gwanak` 없음**, `seoul_guro`(구로/신도림) 있음
- **상권표**: `pickRegionSubdivisionField()` — `regionSub` > `regionZone` > `district`

### 추정 메커니즘

1. DB에 `region_sub=seoul_guro` 저장됐거나  
2. `inferBrowseRegionFromMedia()` — alias `"신도림"` in `seoul_guro`가 location/name에 partial match  
3. `region_sub` 없을 때 Seoul default tie-break → first sub  
4. `region_zone=gwanak`은 browse/상권에서 **secondary**

### 관련 코드

- `lib/media-browse-regions.ts` — taxonomy + inference
- `lib/planner/calc/engine.ts` — `REGION_SUB_UNMAPPED` warning (A-4 comment)
- `lib/plan-cart-report/region-subdivision.ts`
- `lib/media/region-main-corrections.ts` — manual list (관악 미포함)

### STEP1 DB 쿼리 (운영 확인용)

```sql
-- A) 서울대입구/관악 매체
SELECT id, name, slug, district, region_sub, region_zone, location
FROM media
WHERE is_active = true
  AND (name ILIKE '%서울대입구%' OR district ILIKE '%관악%' OR slug ILIKE '%seouldaeipgu%');

-- B) gwanak zone but non-gwanak browse sub
SELECT region_sub, COUNT(*)
FROM media
WHERE is_active = true AND region_main = 'seoul' AND region_zone = 'gwanak'
GROUP BY 1;
```

### 구현 방향 (승인 후)

1. `MEDIA_BROWSE_REGIONS`에 **`seoul_gwanak`** 추가 (aliases: 관악, 서울대입구, 봉천 등)
2. 서울대입구역 매체 **backfill** `region_sub=seoul_gwanak`
3. `신도림` alias — word-boundary 또는 district 교차검증
4. slug 오류(`sinrimyeok` on 서울대입구) 수동 correction

---

## 3-2. 부산 시내버스 — 부산 시내 과집중

### 문서화된 증상

`reports/backlog-a4-busan-bus-district.md` — 부산 시내 ~66.9% 노출 집중

### 추정 메커니즘

- `type=mobile` + `region_main=busan` → inference default **`busan_downtown`**
- Alias `"부산"` → downtown bucket
- 상권표는 `regionSub` 우선 → network bus가 단일 상권에 pin

### Jaehan님 결정 필요 (구현 보류)

1. 해당 캠페인 portfolio **매체 ID/이름** 확인  
2. mobile bus 정책: **미분류** / **광역(부산 전체)** / **coverageDistrictCodes 분할** / **노선명**  
3. `pickRegionSubdivisionField`에서 bus exterior/interior **deprioritize regionSub** 여부  
4. `coverageDistrictCodes` admin 입력 여부

### STEP1 DB 쿼리

```sql
SELECT id, name, type, sub_category, region_sub, region_zone, district
FROM media
WHERE is_active = true AND region_main = 'busan'
  AND (type = 'mobile' OR name ILIKE '%버스%');
```

**이번 진단: 코드·백로그 분석만 — 구현은 Jaehan님 정책 후**

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
