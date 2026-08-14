# PR4 baseline — admin media edit form fields

**생성**: 20260814-1728  
**목적**: PR4 read-only 전환 전 편집 UI baseline  
**조사 방식**: 코드 정적 분석 (로그인 불필요)

## 1. 편집 UI 진입점

| 경로 | 파일 | 설명 |
|------|------|------|
| `/ko/admin/medias` | `app/[locale]/admin/(dashboard)/medias/page.tsx` | 목록 + **모달 편집/추가** (주 편집 UI) |
| `/ko/admin/medias?action=new` | `admin-medias-client.tsx` | 추가 모달 (동일 폼) |
| `/ko/admin/medias/[id]/edit` | `media-json-edit-client.tsx` | **JSON raw edit** + 부분기간 요율 |
| `/ko/admin/medias/quick-add` | `quick-add/page.tsx` | JSON quick-add (별도) |
| `/ko/admin/medias/bulk-import` | `bulk-import/page.tsx` | JSON bulk patch |

**주 편집 폼**: `app/[locale]/admin/(dashboard)/medias/admin-medias-client.tsx`  
**상태 관리**: React `useState` (`AdminMediaForm`) — react-hook-form **미사용**

---

## 2. 편집 가능 필드 전수 (`AdminMediaForm`)

DB 컬럼명은 `formToPayload()` 저장 매핑 기준 (camelCase → snake_case).

### 2.1 필수 · 식별 · Operational

| form 키 | DB 컬럼 | UI 타입 | 라벨 (한글) |
|---------|---------|---------|-------------|
| `name` | `name` | text Input | 매체명 (한국어) * |
| `nameEn` | `name_en` | text Input | 매체명 (영어) |
| `location` | `location` | text Input | 위치(주소) * |
| `region` | `region` | text Input | 지역/코드 * |
| `type` | `type` | text Input | 유형 * |
| `price` | `price` | number Input | 가격 (원) |
| `description` | `description` | Textarea | 설명 |
| `tags` | `tags` | text Input | 태그 (쉼표 구분) |
| `priceNote` | `price_note` | text Input | 가격 비고 |
| `priceOptionsJson` + cards | `price_options` | JSON / 카드 UI | 가격 옵션 |
| `partialPeriodRates.*` | `partial_period_rates` | number×6 | 부분기간 요율 1·3·5·7·15·30일 (%) |
| `image` + gallery | `image`, `extracted_images` | URL 업로드 | 이미지 갤러리 |
| `effectMemo` | `effect_memo` | Textarea | 효과 메모 |
| `pastAdvertisers` | `past_advertisers` | Textarea | 광고주 이력 |
| `addressVerified` | `address_verified` | checkbox | 주소 검증됨 |
| `isVerified` | (DTO `isVerified` → API) | checkbox | THINKAD Verified |
| `autoPopulatedAt` | `auto_populated_at` | display only | 자동 수집 시각 (읽기) |

### 2.2 Fact — 좌표 · 설치 · 주변

| form 키 | DB 컬럼 | UI 타입 | 라벨 |
|---------|---------|---------|------|
| `latitude` | `latitude` | text (install sync) | 설치 지점 — 위도 |
| `longitude` | `longitude` | text | 설치 지점 — 경도 |
| `installLocations[].label` | `install_locations` JSON | text | 방향/라벨 |
| `installLocations[].location` | ↑ | text | 지점 주소 |
| `installLocations[].latitude` | ↑ | text | 위도 |
| `installLocations[].longitude` | ↑ | text | 경도 |
| `city` | `city` | text Input | 시/도 |
| `district` | `district` | text Input | 구/군 |
| `nearbyFacilities` | `nearby_facilities` | text Input | 주변 시설 |
| `nearbyStations` | `nearby_stations` | text Input | 인근 역·정류장 |
| `nearbyLandmarks` | `nearby_landmarks` | text Input | 주변 랜드마크 |
| `coverageDistrictCodes` | `coverage_district_codes` | checkbox grid | 이동형 서비스 구역 (mobile만) |

### 2.3 Fact — 규격 · 운영시간 · 분류

| form 키 | DB 컬럼 | UI 타입 | 라벨 |
|---------|---------|---------|------|
| `width` | `width` | text Input | 가로(px·문자열) |
| `height` | `height` | text Input | 세로(px·문자열) |
| `widthM` | `width_m` | text Input | 가로(m) |
| `heightM` | `height_m` | text Input | 세로(m) |
| `resolution` | `resolution` | text Input | 해상도 |
| `operatingHours` | `operating_hours` | text Input | 운영 시간 |
| `subCategory` | `sub_category` | text Input | 하위 분류 |
| `browseMainCategory` | `media_main_category` | Select (AdminMediaCategoryFields) | 탐색 대분류 |
| `browseSubCategory` | `media_sub_category` | Select | 탐색 소분류 |
| `browseRegionMain` | `region_main` | Select | 지역 대분류 |
| `browseRegionSub` | `region_sub` | Select | 지역 소분류 |
| `mediaCategoryParent` | `media_category` (merge) | chip select | 카테고리 parent |
| `mediaCategorySubs` | ↑ | chip multi | 카테고리 sub |
| `targetCategories` | `target_category` | chip multi | 타깃 카테고리 |
| `targetAge` | `target_age` | text Input | 타깃 연령 |

### 2.4 Computed / Legacy (현재 어드민에서 **임의 입력 가능**)

| form 키 | DB 컬럼 | UI 타입 | 라벨 | PR1 §7.3 |
|---------|---------|---------|------|----------|
| `dailyFootfall` | `daily_footfall` | text Input | 일일 유동인구 | ✅ legacy → `dailyImpressions` |
| `weekdayFootfall` | `weekday_footfall` | text Input | 평일 유동인구 | Signal/Computed 입력 |
| `impressions` | `impressions` | text Input | 노출(imp) | ✅ legacy |
| `reach` | `reach` | text Input | 도달률 | ✅ Computed |
| `frequency` | `frequency` | text Input | 빈도 | ✅ Computed |
| `cpm` | `cpm` | text Input | CPM | ✅ legacy |
| `engagementRate` | `engagement_rate` | text Input | 참여율 | ✅ Computed |
| `visibilityScore` | `visibility_score` | text Input | 가시성 점수 0–100 | ✅ Computed |

### 2.5 특정 필드 존재 여부 (요청 항목)

| 필드 | admin UI | 비고 |
|------|----------|------|
| `foot_traffic` | **없음** | `dailyFootfall` → `daily_footfall`만 |
| `daily_footfall` | ✅ `dailyFootfall` | |
| `cpm` | ✅ | |
| `daily_impressions` | **없음** | PR3 백필은 `media_computed_metrics.daily_impressions`; UI 미노출 |
| `width_m` / `height_m` | ✅ `widthM` / `heightM` | |
| `latitude` / `longitude` | ✅ install 지점 + sync | |
| `bearing` | **없음** | FactSheet 필드, media·UI 모두 미노출 |
| `install_height_m` | **없음** | 동일 |
| `view_distance_m` | **없음** | 동일 |
| `traffic_pattern` | **없음** | DB만 (JSON bulk-import 예시) |
| `install_year` | **없음** | DB만 |

### 2.6 JSON 편집 우회 (`/admin/medias/[id]/edit`)

- **전체 media JSON** free-form `Textarea` → PUT `/api/admin/medias/{id}/json`
- quick-add / bulk-import도 동일 키 사용 가능
- PR4 read-only는 **모달 필드 + JSON 경로 모두** 잠금 설계 필요

---

## 3. PR4 read-only 잠금 후보 (Claude Code 초안)

> PR1 `docs/media-data-contract.md` §7.3 · PR3 백필 `media_computed_metrics.legacy_*` 기준

### 잠금 후보 (Computed / legacy — UI 입력 차단 → FactSheet/ComputedMetric 표시)

| form 키 | DB | PR4 조치 초안 |
|---------|-----|----------------|
| `dailyFootfall` | `daily_footfall` | read-only + legacy 표시 |
| `weekdayFootfall` | `weekday_footfall` | read-only (Signal 전까지) |
| `impressions` | `impressions` | read-only |
| `reach` | `reach` | read-only |
| `frequency` | `frequency` | read-only |
| `cpm` | `cpm` | read-only |
| `engagementRate` | `engagement_rate` | read-only |
| `visibilityScore` | `visibility_score` | read-only (PR5 engine 덮어쓰기 전) |

JSON edit: 위 키들 **`daily_footfall`, `impressions`, `cpm`, `reach`, `frequency`, `engagement_rate`, `visibility_score`, `weekday_footfall`** server-side reject 또는 strip.

### 편집 유지 (Fact 계층 + Operational)

- **좌표**: `latitude`, `longitude`, `installLocations[]`
- **규격**: `width`, `height`, `widthM`, `heightM`, `resolution`
- **운영시간**: `operatingHours`
- **역 텍스트**: `nearbyStations` (stationCode RAW_COPY 소스)
- **분류·주소·가격·이미지·태그·설명** 등 §7.4 Operational
- **부분기간 요율·가격 옵션** (상업 조건)

---

## 4. 스크린샷

**옵션 A**: Playwright 설치됐으나 **admin 세션 쿠키 없음** + chromium binary 미설치 → **실패**

**옵션 B**: 재한 수동 캡처 **대기**

저장 위치 및 파일명: `docs/screenshots/pr4-baseline/README.md` 참고

- `01-admin-medias-list.png`
- `02-admin-medias-edit-full.png`
- `03-admin-medias-edit-legacy-fields-zoom.png`

---

## 5. PR4 착수 시 주의

1. 편집 UI는 **모달 1곳** + **JSON edit** 2경로 — 모달만 잠그면 JSON 우회 가능  
2. `grep` 대상 경로: 사용자 지시 `app/(admin)/admin/medias` → 실제 **`app/[locale]/admin/(dashboard)/medias/`**  
3. react-hook-form 없음 — 필드 잠금은 `Input disabled` + payload 빌더에서 omit/서버 검증  
4. PR3 백필 후 runtime은 아직 `media` 컬럼 read — PR4는 **어드민 write 차단**만, API read 경로는 PR5+
