# 매체 데이터 계약 (Media Data Contract)

**리포:** tkad-web  
**버전:** PR1 (문서만 — 코드·스키마 변경 없음)  
**작성 목적:** `Media` 단일 테이블에 섞여 있는 **사실(Fact)·신호(Signal)·파생(Computed)** 을 분리하고, 이후 PR2–PR5 마이그레이션의 단일 기준(Source of Truth)으로 사용한다.

---

## 1. 배경 · 문제 정의

### 현재 상태 (`prisma/schema.prisma` → `Media`)

| 문제 | 설명 |
|------|------|
| 계층 혼재 | 좌표·규격(사실)과 `dailyFootfall`·`impressions`·`cpm`(추정/계산)이 동일 row에 공존 |
| 출처 불명 | 관리자가 유동인구·CPM을 JSON/어드민에서 **임의 입력** → `source_url`·`collected_at` 없음 |
| 신뢰도 불가 | 추천(`lib/matching-engine.ts`)·플래너(`lib/planner-logic.ts`)·AI 추천(`lib/ai-media-recommend.ts`)이 **근거 없는 숫자**를 스코어에 사용 |
| 좌표 폴백 | `latitude`/`longitude` null 시 서울시청 좌표 주입 (`lib/public-media-catalog.ts` → `coordinatesAreFallback`) |
| 중복 저장소 | `MediaDataFusion`(JSON blob), `ExternalDataCache`(API 캐시)가 이미 존재하나 계약·등급 체계와 미연동 |

### 목표 아키텍처 (PR2+)

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  MediaFactSheet │     │ MediaExternalSignal  │     │ MediaComputedMetric │
│  (입력층 Fact)   │ +  │ (소스층 Signal)       │ →  │ (파생층 Computed)    │
│  관리자 편집     │     │ 크론·API 수집         │     │ metric-engine       │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
         │                          │                            │
         └──────────────────────────┴────────────────────────────┘
                                    │
                           Media (레거시, PR2–9 유지)
                           PR10+ 에서 필드 drop (별도 PR)
```

**원칙**

1. PR2–9: 기존 `Media` 컬럼 **삭제 금지**. 읽기 호환 유지.
2. 파생값(`dailyImpressions`, `cpm`, `reliabilityGrade`)은 **계산 엔진만** 쓰기.
3. Preview DB = Neon **브랜치** 전용. main DB에 선행 migrate 금지.
4. 백필·배치 스크립트 = `--dry-run` 선행 필수.

---

## 2. 3계층 정의

### 2.1 입력층 (Fact) — 사람·운영이 관리하는 **관측 가능한 사실**

- 좌표, 물리 규격, 설치 환경, 운영 시간, 매체 유형 세분화
- **변경 시** → `MediaComputedMetric.computedAt = null` (재계산 큐, PR4+)
- **편집 주체:** 어드민·매체사 (PR4 이후 FactSheet 전용 폼)

### 2.2 소스층 (Signal) — 외부 원천에서 수집한 **원값(raw)**

- 생활인구 격자, 역별 승하차, 상권 등급, 도로교통량 등
- **불변에 가깝게** append-only 수집 이력 (`validFrom`/`validTo`)
- 매체와의 연결: `grid_id`, `station_code`, 좌표 근접 매칭 등

### 2.3 파생층 (Computed) — Fact + Signal으로 **계산된 지표**

- 일/시간대 노출, CPM, **가시성(`visibilityScore`)**, 신뢰도 등급
- `computation_model_version`, `computed_at`, `sourceSignalIds` 필수
- 공개 UI·추천은 PR9 이후 Computed 우선, PR9 전까지 `Media` 레거시 폴백
- **결정 (PR1 검수):** `visibilityScore`는 **Computed 전용**. Fact proxy·어드민 수동 입력은 PR3 백필 후 `MediaComputedMetric`로 이관, PR4+ 어드민에서는 read-only

### 2.4 메타·운영 (Operational) — 3계층 밖, 카탈로그 운영용

- 가격, 노출 on/off, 홈 featured, popularity cron, 제안서 URL 등
- 이번 시퀀스에서 **이관 대상 아님** (단, 가격은 Fact adjacent)
- **결정 (PR1 검수):** Operational 필드는 **`Media` 본체 유지**. 별도 테이블(`MediaOperational` 등) **만들지 않음** (YAGNI). PR2–9 스키마·PR10+ legacy drop까지 동일 row

---

## 3. 최소 필수 필드 (매체 등록 · FactSheet)

신규 매체 등록 시 **반드시** 확보해야 하는 Fact (PR2 `MediaFactSheet` 기준).

| 필드 | 타입 | 단위 | 필수 | 비고 |
|------|------|------|:----:|------|
| `latitude` | Float | 도(°) | ✅ | null 불가. 폴백 좌표 금지(등록 gate) |
| `longitude` | Float | 도(°) | ✅ | |
| `mediaSubtype` | String (enum-like) | — | ✅ | `subway_platform`, `subway_concourse`, `dooh`, `billboard`, `bus_shelter`, `bus_wrap`, … |
| `widthMm` | Int | mm | ✅ | `widthM`×1000 또는 `width`/`height` 문자열 파싱 |
| `heightMm` | Int | mm | ✅ | |
| `installHeightM` | Float | m | 권장 | 역사 CM·사각기둥 등 |
| `bearing` | Int | 0–360° | 권장 | 시야 방향 |
| `viewDistanceM` | Float | m | 선택 | |
| `operatingStart` | String | `HH:mm` | ✅ | 예: `06:00` |
| `operatingEnd` | String | `HH:mm` | ✅ | 예: `24:00` |
| `timezone` | String | IANA | ✅ | 기본 `Asia/Seoul` |
| `stationCode` | String | — | 조건부 | 지하철 매체. **Phase 1: 서울 한정** — 4자리 역번호 (`§16.2`, 잠정 확정) |
| `dimensionSource` | Enum | — | 권장 | 규격 출처 — §3.1 |

### 3.1 규격 결측 대응 (PR1 위임 5)

DB 조사 기준 `widthM`/`heightM` 약 18% 결측. **3단 대응** (순서 고정):

| 단계 | 조건 | 처리 | 구현 PR |
|:----:|------|------|---------|
| 1 | `widthMm`/`heightMm` null | 어드민·카드 **「규격 미확인」** 뱃지. 추천·CPM 계산에서 size 의존 로직 skip | PR4 |
| 2 | 문자열(`width`/`height`) 파싱 실패 | 동일 `mediaSubtype`·유사 규격 매체 **중앙값 fallback** → `dimensionSource=ESTIMATED_MEDIAN` | PR3·PR5 |
| 3 | fallback 불가 | 매체사 **실측 요청** 큐. `dimensionSource=UNKNOWN` 유지 | PR4+ |

`dimensionSource` enum: `MEASURED` | `PARSED_FROM_TEXT` | `ESTIMATED_MEDIAN` | `UNKNOWN`

### 3.2 `stationCode` 스코프 (PR1 위임 2)

| Phase | 범위 | 비고 |
|-------|------|------|
| **Phase 1** (PR2–PR5) | **서울 지하철** (`regionMain=seoul`, subway subtype) | `stationCode`·Signal `station_code` 연동 대상 |
| **Phase 2** (PR6+) | 부산·대구·인천·광주·대전 등 **지방 도시철도** | 별도 코드 체계·API 매핑 |
| **Phase 2** (PR6+) | **환승역** 노선별 구분 | `stationLineCode` 등 — 스키마 필드만 PR2 준비 |

**레거시 매핑 (PR3 백필)**

| FactSheet (신규) | Media (현재) |
|------------------|--------------|
| `latitude` | `latitude` |
| `longitude` | `longitude` |
| `widthMm` / `heightMm` | `widthM`/`heightM` 또는 `width`/`height` |
| `operatingStart`/`operatingEnd` | `operatingHours` 문자열 파싱 |
| `mediaSubtype` | `type` + `mediaSubCategory` + `subCategory` 조합 추론 |
| `stationCode` | (없음 — `nearbyStations` 텍스트만) |

---

## 4. 소스층 필드 후보 (`MediaExternalSignal`)

| sourceType | 설명 | sourceKey | rawValue shape | source_url (예) | collected_at | 갱신주기 |
|------------|------|-----------|----------------|-----------------|--------------|----------|
| `seoul_living_population_hourly` | 서울 생활인구 (시간대) | `grid_id` (격자) | `{ hourly: number[24], date: ISO }` | 서울 열린데이터 | 수집 시각 | 일/주 |
| `subway_ridership_hourly` | 역별 승하차 (시간대) | `station_code` | `{ hourly: { board, alight }[], date }` | 공공데이터포털·코레일/도시철도 | 수집 시각 | 일 |
| `sbdc_commercial_grade` | 상권 등급 | `grid_id` 또는 `pnu` | `{ grade: "A"\|"B"\|…, score }` | SGIS·소상공인 | 수집 시각 | 분기 |
| `road_traffic_volume` | 도로 교통량 | `link_id` / 좌표 버킷 | `{ aadt, hourly_factor[] }` | 국토부·TOPIS | 수집 시각 | 연/분기 |

**공통 메타 (모든 Signal row)**

- `sourceUrl`, `collectedAt`, `validFrom`, `validTo?`
- `mediaId` FK (1 매체 : N signal 이력)

**기존 구조와의 관계**

| 기존 | PR2+ 역할 |
|------|-----------|
| `ExternalDataCache` | API 응답 **캐시** (Signal ingest 전 단계) |
| `MediaDataFusion` | 실험적 JSON fusion — PR6+에서 Signal 정규화로 대체 검토 |

---

## 5. 파생층 필드 (`MediaComputedMetric`)

| 필드 | 타입 | 단위 | 설명 |
|------|------|------|------|
| `dailyImpressions` | Int | 회/일 | 일 노출량 (OTS proxy) |
| `hourlyImpressions` | Json | 회/시 | `[{ hour: 0–23, impressions: int }, …]` |
| `cpm` | Int | 원/CPM | `price`·노출 기반 |
| `visibilityScore` | Float | 0.0–1.0 | 시야거리·방향·설치높이·장애물 기반 **Computed** (Fact 아님) |
| `reliabilityGrade` | String | A/B/C | §6 규칙 |
| `modelVersion` | String | — | 예: `v0-fallback`, `v1.0` |
| `computedAt` | DateTime | — | 마지막 계산 시각 |
| `sourceSignalIds` | String[] | — | 감사·재현용 |
| `legacyDailyImpressions` | Int? | — | PR3: `impressions`/`dailyFootfall` 보존 |
| `legacyCpm` | Float? | — | PR3: `Media.cpm` 보존 |

**v0 (PR5):** Signal 없음 → legacy 값 pass-through, grade **C**.  
**v1 (PR8+, 범위外):** Signal + Fact 기반 실계산, grade A/B.

---

## 6. 신뢰도 등급 (reliability_grade)

| 등급 | 조건 | 예시 |
|:----:|------|------|
| **A** | 실측·사업자 공식 데이터로 `dailyImpressions` 산출 | 지하철 `subway_ridership_hourly` + 역 코드 + format factor |
| **B** | 공공데이터 **추정** (격자 생활인구 × 시야계수 × 가동시간) | 생활인구 격자 + `viewDistanceM`/`bearing` |
| **C** | 유형별 평균·레거시 수동값·fallback | PR3 백필 `modelVersion=legacy`, PR5 v0 pass-through |

**표시 규칙 (PR4+)**

- 어드민: grade 뱃지 + `modelVersion === "legacy"` → **「레거시 값」**
- 공개 카드 (PR9+): grade A/B만 「데이터 기반」 툴팁, C는 「참고용 추정」

---

## 7. 현재 `Media` 필드 → 3계층 매핑 (전수)

> ✅ = PR1 검증: `Media` 모델 **모든 스칼라·JSON 필드** 매핑 완료 (relation·인덱스 제외).

### 7.1 입력층 (Fact) — 현재 `Media`에 있음

| Media 필드 | 타입 | FactSheet (목표) | 출처 | 갱신 | 사용처 |
|------------|------|------------------|------|------|--------|
| `latitude` | Float? | `latitude` | 어드민·지오코딩 | 수동 | 지도, 지역 필터, metric-engine |
| `longitude` | Float? | `longitude` | 어드민·지오코딩 | 수동 | 동상 |
| `widthM` | Float? | `widthMm` | 어드민 | 수동 | 카드 size, PDF |
| `heightM` | Float? | `heightMm` | 어드민 | 수동 | 동상 |
| `width` | String? | → `widthMm` 파싱 | 레거시 CSV | 수동 | 표시 |
| `height` | String? | → `heightMm` 파싱 | 레거시 | 수동 | 표시 |
| `resolution` | String? | Fact (디스플레이 spec) | 어드민 | 수동 | 상세 |
| `operatingHours` | String? | `operatingStart`/`End` | 어드민 | 수동 | 상세 |
| `installYear` | Int? | Fact | 어드민 | 수동 | 필터 |
| `installLocations` | Json? | Fact (복수 좌표) | 어드민 | 수동 | 지도 핀 |
| `type` | String | → `mediaSubtype` 상위 | 어드민 | 수동 | browse·필터 |
| `subCategory` | String? | → `mediaSubtype` | 어드민 | 수동 | 검색 |
| `mediaSubCategory` | String? | → `mediaSubtype` | 어드민 | 수동 | browse |
| `mediaMainCategory` | String? | Fact (taxonomy) | 어드민 | 수동 | /media |
| `mediaCategory` | String[] | Fact (taxonomy) | 어드민 | 수동 | 필터 |
| `location` | String | Fact (주소 텍스트) | 어드민 | 수동 | 카드·SEO |
| `city` | String? | Fact | 지오코딩 | 수동 | 필터 |
| `district` | String? | Fact | 지오코딩 | 수동 | 필터 |
| `region` / `regionMain` / `regionSub` / `regionZone` | String | Fact (분류) | 어드민·파서 | 수동 | browse·recommend |
| `coverageDistrictCodes` | String[] | Fact (mobile 구역) | 어드민 | 수동 | 지도 폴리곤 |
| `targetCategory` | String[] | Fact (캠페인 적합) | 어드민 | 수동 | 매칭 |
| `targetAge` | String? | Fact (타겟 서술) | 어드민 | 수동 | 추천·카드 |
| `nearbyStations` | String? | Fact (텍스트); `stationCode`는 미보유 | 자동·수동 | 수동 | 검색·subway line |
| `nearbyLandmarks` | String? | Fact | 자동·수동 | 수동 | 상세 |
| `nearbyFacilities` | String? | Fact | 자동·수동 | 수동 | 상세 |
| `addressVerified` | Boolean | Fact (QA flag) | geocode job | 이벤트 | 어드민 |
| *(없음)* | — | `bearing`, `viewDistanceM`, `installHeightM` | **PR2 신규** | — | v1 engine |

### 7.2 소스층 (Signal) — 현재 `Media`에 **직접 없음** (문제)

| Media 필드 | 현재 취급 | PR2+ 목표 |
|------------|-----------|-----------|
| `trafficPattern` | Json — **출처 없이** hourly/weekly/monthly 저장 | Signal `seoul_living_population_hourly` 등으로 대체 |
| `weekdayFootfall` | Int? — 추정치 혼재 | Signal 또는 Computed 입력 |
| `MediaDataFusion.payload` | Json blob | Signal 정규화 |

### 7.3 파생층 (Computed) — 현재 `Media`에 **임의 입력 가능** (문제)

| Media 필드 | 타입 | 목표 Computed | 현재 문제 | 사용처 |
|------------|------|---------------|-----------|--------|
| `dailyFootfall` | Int? | `dailyImpressions` (일) | 어드민 임의 입력 | `dailyFootTraffic`, AI 추천, 플래너 OTS |
| `impressions` | Int? | `dailyImpressions`×30 또는 월 노출 | 동일 | 카드, CPM 역산 |
| `reach` | Float? | Computed (모델) | 임의 | 상세 |
| `frequency` | Float? | Computed | 임의 | 상세 |
| `cpm` | Float? | `cpm` | 임의 | 카드, 플래너 CPM 바 |
| `engagementRate` | Float? | Computed (미정) | 임의 | 상세 |
| `visibilityScore` | Int | `visibilityScore` (Computed) | **어드민 0–100 수동** → PR3 이관 후 metric-engine 계산 | 지도 핀·필터·매칭 가중 |

**`lib/public-media-catalog.ts` 매핑**

- `dailyFootfall` → `MediaItem.dailyFootTraffic`
- `impressions` → `monthlyFootTraffic` / `impressions`
- `cpm` → `MediaItem.cpm`

### 7.4 메타·운영 (Operational — 3계층 외, Media 본체 유지)

> **결정 (§16.1 위임 4):** 아래 필드는 PR2–PR10+까지 `Media` row에 잔류. 별도 Operational 테이블 없음.

| Media 필드 | 설명 |
|------------|------|
| `id`, `slug`, `name`, `nameEn` | 식별·SEO |
| `description`, `effectMemo`, `tags` | 콘텐츠 |
| `price`, `pricePeriod`, `priceOptions`, `partialPeriodRates`, `priceNote` | 상업 조건 (Fact adjacent) |
| `image`, `extractedImages` | 자산 |
| `availability`, `isActive`, `instantBookingEnabled` | 노출·예약 |
| `isFeatured`, `featuredOrder`, `isPopular`, `popularOrder` | 홈 큐레이션 |
| `popularityScore`, `popularityUpdatedAt`, `viewCount` | **행동 기반** (cron, beacon) |
| `isVerified`, `pastAdvertisers`, `autoPopulatedAt` | 신뢰·마케팅 |
| `proposalUrl`, `proposalFileName`, `hasProposal` | 제안서 |
| `ownerUserId` | 매체사 |
| `createdAt`, `updatedAt` | 감사 |

### 7.5 관련 테이블 (본 문서 범위 참고)

| 모델 | 매핑 |
|------|------|
| `MediaNetwork` / `MediaNetworkLocation` | Fact(좌표·`dailyFootfall` per location) + Operational; 네트워크 집계 Computed는 PR8+ |
| `MediaPriceSnapshot` | Operational (가격 이력) |
| `MediaAdvertiserExecution` | Operational |
| `MediaReview` | Operational → `trustScore` 파생 (별도) |

---

## 8. 추천 시스템 의존성

### 8.1 `/recommend` · `matchMediaCatalog` (`lib/matching-engine.ts`)

| 우선순위 | 필드 (현재) | 계층 (목표) | 용도 |
|:--------:|-------------|-------------|------|
| P0 | `price`, `pricePeriod`, `priceOptions` | Operational | `scoreBudget` |
| P0 | `regionMain`, `regionSub`, `region`, `location` | Fact | `scoreRegion`, planner region |
| P0 | `type`, `mediaSubCategory`, `mediaCategory` | Fact | category·subway intent |
| P1 | `targetCategory`, `targetAge` | Fact | target·industry affinity |
| P1 | `popularityScore`, `averageRating`(reviews) | Operational | tie-break |
| P2 | `dailyFootfall` / `dailyFootTraffic` | **Computed** | AI recommend foot-traffic filter |
| P2 | `visibilityScore` | **Computed** | visibility weight |
| P2 | `cpm` | **Computed** | CPM 비교 (플래너) |

**최소 집합 (추천 품질 유지):** Fact `type`·지역·좌표 + Operational `price` + Computed `dailyImpressions`(또는 legacy fallback) + grade ≥ C.

### 8.2 AI Recommend (`lib/ai-media-recommend.ts`)

- `minVisibility` → `visibilityScore` (Computed)
- `minDailyFootTraffic` → `dailyFootTraffic` (Computed)
- `subscoreTargetMatch`: `dailyFootTraffic`, `type`, `visibilityScore`

### 8.3 플래너 OTS/CPM (`lib/planner-logic.ts`)

- `dailyFootTraffic`, `visibilityScore`, `price` → impressions·CPM·reach 추정
- **grade C legacy** 사용 중 — PR5 v0와 동일

---

## 9. 스크리너 · 브라우즈 필터

(`lib/media-discovery-client-filter.ts`, `lib/merged-media-browse.ts`)

| 필터 | 필드 | 계층 |
|------|------|------|
| 지역 chip | `regionMain`, `regionSub`, `coverageDistrictCodes`, haystack | Fact |
| 유형 | `type`, `mediaMainCategory`, `mediaSubCategory` | Fact |
| 타겟 | `targetCategory` | Fact |
| 가격대 | `price` | Operational |
| 네트워크 | `catalogSource`, network flags | Operational |
| 가시성 (고급) | `visibilityScore` | Computed (현재 수동) |
| 유동 (AI/chat) | `dailyFootTraffic` | Computed |

---

## 10. UI 카드 · 상세 표시 필드

| UI | 필드 | 계층 |
|----|------|------|
| 카드 썸네일 뱃지 | `isVerified`, `instantBookingEnabled`, `visibilityScore` | Operational / Computed |
| 카드 부제 | `location`, `regionMain`·`regionSub` label | Fact |
| 카드 가격 | `price`, `pricePeriod` | Operational |
| 검색 칩 | `visibilityScore`, tags | Computed / Fact (tags) |
| 상세 KPI | `dailyFootfall`, `impressions`, `cpm`, `reach`, `frequency` | **Computed (목표)** |
| 상세 차트 | `trafficPattern` | Signal (목표) |
| 지도 핀 | `lat`/`lng`, `installLocations`, `visibilityScore` | Fact / Computed |
| PDF 제안서 | `dailyFootTraffic`, size, `price` | Computed + Fact |

---

## 11. `mediaSubtype` enum (초안)

PR2 `MediaFactSheet.mediaSubtype` 문자열 집합 (확장 가능).

| 값 | 설명 | 레거시 힌트 |
|----|------|-------------|
| `subway_platform` | 승강장·플랫폼 | `mediaSubCategory=subway`, platform |
| `subway_concourse` | 대합실·역사 concourse | concourse, CM보드 |
| `subway_train_interior` | 차내·랩핑 | mobile subway |
| `dooh` | 디지털 옥외·DOOH | `type=digital` |
| `billboard` | 정형 빌보드 | `type=static` |
| `building_wrap` | 건물 래핑 | static/digital |
| `bus_shelter` | 버스쉘터 | venue |
| `bus_wrap` | 버스 래핑 | mobile |
| `taxi` | 택시·미디어바 | mobile |
| `airport` | 공항 DOOH | region/incheon |
| `retail_venue` | 리테일·백화점 | network venue |
| `other` | 미분류 | fallback |

---

## 12. PR 로드맵 대응

| PR | 브랜치 | 본 문서 섹션 |
|:--:|--------|--------------|
| **PR1** | `docs/media-data-contract` | 전체 (본 파일) |
| PR2 | `feat/media-schema-3layer` | §3–§5 스키마 |
| PR3 | `feat/media-backfill-fact-and-legacy` | §7.1·§7.3 백필 |
| PR4 | `feat/admin-media-fact-only-edit` | §2.1, §6 표시 |
| PR5 | `feat/media-metric-engine-v0` | §5 v0, §6 grade C |
| PR6+ | (범위外) | §4 Signal 파이프라인 |
| PR9+ | (범위外) | §8–§10 Computed 전환 |
| PR10+ | (범위外) | §7 Media legacy drop |

---

## 13. 알려진 갭 · Phase 2 후보 (본 시퀀스 **미포함**)

| 항목 | 설명 |
|------|------|
| **복합어 토큰화** | `지하철광고`, `9호선지하철`, `강남전광판` 등 **공백 없는 입력** → `unmatchedTokens` 잔류 (`parse-freetext-brief.ts`). 파서 전반 영향 → **별도 Phase 2** |
| **지방 지하철·환승역** | Phase 1 **서울 한정** — §3.2. 부산/대구/인천/광주/대전·환승역 `stationLineCode` → **Phase 2** |
| `bearing`/`installHeightM` 백필 | DB 미보유 — PR3 skip 리포트 |
| `MediaNetwork` Computed | 지점 합산 엔진 — PR8+ |
| `visibilityScore` v1 정의 | PR1 결정: **Computed 계층**. v1 산식(시야계수) — PR5+ metric-engine |

---

## 14. PR1 검증 체크리스트

- [x] `Media` 모델 **모든 필드**가 §7 표에 3계층·Operational 중 하나로 매핑됨
- [x] 최소 Fact 필드 셋 §3 정의
- [x] Signal 후보 §4 (`source_url`, `collected_at`, `grid_id`/`station_code`) 명시
- [x] Computed 필드·grade 규칙 §5–§6
- [x] 추천·스크리너·UI 의존성 §8–§10
- [x] 코드 변경 없음 (docs only)
- [x] PR1 검수 결정 반영 — §16 (위임 1–5 확정, 위임 1은 §16.2 잠정)

---

## 15. 승인 · 롤백

- **승인:** 재한 최종 리뷰 후 `docs/media-data-contract` → `main` merge
- **롤백:** 본 파일 revert — 런타임·DB 영향 없음

---

## 16. PR1 검수 결정사항 (2026-08-14)

PR1 자동 검수(`reports/pr1-review-20260814-1307.md`) 판단 위임 5건에 대한 재한 결정.

### 16.1 확정 (위임 1–5)

| # | 항목 | 결정 | 문서 반영 |
|:-:|------|------|-----------|
| 1 | `stationCode` 표준 | **확정 (잠정)** — 서울교통공사 4자리 역번호 (`data.go.kr`). B단계 API 실측으로 최종 검증 예정 | §16.2, §3 |
| 2 | 지하철·`stationCode` 스코프 | **Phase 1 서울 한정**. 지방 도시철도·환승역 → **Phase 2 이후** | §3.2, §13 |
| 3 | `visibilityScore` 계층 | **Computed** (Fact 아님). `MediaComputedMetric.visibilityScore` | §2.3, §5, §7.3, §8–§10 |
| 4 | Operational 처리 | **`Media` 본체 유지**. 별도 테이블 **안 함** (YAGNI) | §2.4, §7.4 |
| 5 | 규격 결측 대응 | **3단:** ① 뱃지 → ② 유사 매체 중앙값 fallback → ③ 실측 요청 | §3.1, `dimensionSource` |

### 16.2 `stationCode` 표준 (위임 1 — **옵션 A, 잠정 확정**)

**상태:** 미결 → **확정 (잠정)**. B단계 착수 전 API 응답 실측으로 최종 검증 예정.

| 항목 | 값 |
|------|-----|
| **표준** | 서울교통공사 **4자리 역번호** 체계 (`data.go.kr` 공공데이터포털 기반) |
| **API** | `서울교통공사_역별승하차인원` |
| **엔드포인트** | `http://apis.data.go.kr/B553766/psgr/getStnPsgr` |
| **역 코드 파라미터** | `stnCd` (선택) |
| **필수 파라미터** | `serviceKey`, `pasngYmd` (`YYYYMMDD`) |
| **코드 형식** | 4자리 숫자 (zero-padded) |
| **예시** | 서울역 `0150`, 성수역 `0211`, 강남역 `0222` |
| **환승역** | 노선별 분리 — 호선 + 역번호 4자리 (`stationLineCode`와 병행, §3.2) |
| **인증** | `serviceKey` (`data.go.kr` 활용신청) |

**커버리지**

| Phase | 범위 | 비고 |
|-------|------|------|
| **Phase 1** (PR2–PR5, B단계 정규화) | 서울교통공사 **1~8호선** 중심 | `stationCode`·Signal `station_code` 1차 연동 |
| **Phase 2** (PR6+ 후보) | 9호선·우이신설·신분당·공항철도 | 별도 API·코드 체계 매핑 |
| **Phase 3** (PR6+ 후보) | 인천·부산·대구 등 **지방** | 별도 API·코드 체계 |

**부록 — PR3 백필 레거시**

PR3 백필 시점 `nearbyStations`에 **RAW_COPY** 상태인 매체 **217건**은 B단계 PR `feat/media-stationcode-normalize`에서 본 표준 4자리 코드로 변환·정리 예정. (데이터 정리는 본 문서 범위 밖 — PR6+ 파이프라인 전제.)

> **잠정 확정:** 공개 CSV·API 문서 스키마 기반 채택. 실제 `getStnPsgr` 응답 필드·코드 매칭은 B단계 착수 시 검증 후 필요 시 본 § 재정정.
