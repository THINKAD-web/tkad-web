# PR-3 재설계안 — 3계층 계약 준수 재배치

**작성:** 2026-08-15 · 작성자: 재한 검토 대상 · **결정 문서, 코드 아님**

## 배경

원본 #390 은 진단서 §4 를 기준으로 `Media` 본체에 23컬럼을 추가하는
스키마였다. 8/14 에 3계층 계약(#379, `docs/media-data-contract.md`)과
Computed 필드 잠금(#384)이 main 에 머지되면서 다음 두 가지가 확정됐다:

1. Fact / Signal / Computed 를 물리 테이블로 분리한다
2. Computed 성격의 필드는 JSON 으로 자유 입력할 수 없다

23컬럼을 `Media` 본체에 얹으면 이 두 원칙을 정면으로 위반한다.
아래는 각 필드를 계약에 맞게 재배치하는 초안이다.

## 원칙

- **Fact** = 사람이 관측·측정해서 관리하는 매체 자체의 사실
  (좌표, 규격, 판매 단위 등). 편집 가능.
- **Signal** = 외부 원천에서 수집한 원값. 이력 저장, 편집 금지.
- **Computed** = Fact + Signal 로 산출된 지표. 재계산으로만 갱신,
  JSON 편집 잠금 대상.

같은 값을 두 자리에 두지 않는다. 그게 오늘 우리가 고치고 있는
30배 버그와 같은 종류의 원인이다.

## 재배치표

| #390 컬럼 | 재배치 | 이유 |
|---|---|---|
| `selling_unit` | **`MediaFactSheet.sellingUnit`** | 매체 자체의 판매 단위 정의 = Fact |
| `spot_duration` | **`MediaFactSheet.spotDurationSec`** | 매체 운영 사양 = Fact (DOOH loop 스펙) |
| `loop_duration` | **`MediaFactSheet.loopDurationSec`** | 동상 |
| `plays_per_hour` | **`MediaFactSheet.playsPerHour`** | 동상 |
| `resolution_w` / `resolution_h` | **`MediaFactSheet.resolutionW/H`** | 화면 픽셀 스펙. FactSheet 의 `widthMm/heightMm` 는 물리 크기(mm)로 별개 |
| `aspect_ratio` | **`MediaFactSheet.aspectRatio`** | 물리 스펙 |
| `file_formats` | **`MediaFactSheet.fileFormats`** | 크리에이티브 기술 요건 |
| `max_file_size_mb` | **`MediaFactSheet.maxFileSizeMB`** | 동상 |
| `has_audio` | **`MediaFactSheet.hasAudio`** | 동상 |
| `submission_deadline` | **`MediaFactSheet.submissionDeadlineDays`** | 운영 규칙 |
| `region_code` | **`MediaFactSheet.regionCode`** | 위치 파생. stationCode 와 개념 다름, 충돌 아님 |
| `coverage_population` | **`MediaComputedMetric.coveragePopulation`** | Signal 인구 데이터에서 계산되는 파생값 |
| `coverage_dongs` | **`MediaComputedMetric.coverageDongs`** | 동상 (Reach 계산의 그리드) |
| `contact_rate` | **`MediaComputedMetric.contactRate`** | ⚠ 수정 §A — visibilityScore 와 **별도** 필드 |
| `contact_rate_basis` | **삭제** | `reliabilityGrade` 로 대체 (Signal 근거 등급) |
| `unit_daily_traffic` | **삭제** | `dailyImpressions` 와 이중 저장 방지. 판매 단위 환산은 Fact 의 `sellingUnit` + Computed 의 `dailyImpressions` 조합으로 유도 |
| `traffic_source` | **삭제** | `MediaExternalSignal.sourceType` 로 대체 |
| `traffic_updated_at` | **삭제** | `MediaExternalSignal.collectedAt` 로 대체 |
| `demo_gender_split` | **`MediaComputedMetric.demoGenderSplit`** | ⚠ 수정 §B — Signal 원본 + Computed 스냅샷 |
| `demo_age_split` | **`MediaComputedMetric.demoAgeSplit`** | 동상 |
| `demo_source` | **삭제** | Signal `sourceType` 로 대체 |
| `demo_confidence` | **삭제** | `reliabilityGrade` 로 대체 |
| `CampaignPlan` 테이블 | **유지, 별도 PR** | 3계층과 무관. 플래너 저장·히스토리에 필요 |

## 수정 §A — contactRate 는 visibilityScore 와 별개

지적하신 대로 두 값은 **입력과 출력** 관계다:

- `visibilityScore` (0.0–1.0): 매체의 **물리적 시인성**.
  시야거리·설치각도·설치높이·방향 등 매체 사양에서 계산. 사람이 지나가는지
  와 무관.
- `contactRate` (0.0–1.0): **지나간 사람 중 시선이 닿는 비율**.
  시인성이 좋은 매체도 사람이 스마트폰만 보면 낮아진다.
  가시성 + 상황(대기·이동)·업종 관행이 반영된 값.

### `MediaComputedMetric` 확장

두 필드를 별도로 둔다:

```prisma
model MediaComputedMetric {
  // ── 기존 ──
  visibilityScore Float?  // 물리적 시인성 (0.0–1.0)

  // ── PR-3 재설계 신규 ──
  contactRate      Float?  // OTS → LTS 전환율 (0.0–1.0)
  contactRateBasis String? // "measured" | "derived" | "default"

  // 계산·감사용
  contactRateInputVisibility Float?  // 유도에 쓴 visibilityScore 스냅샷
  contactRateInputClass      String? // 유도에 쓴 media_class 스냅샷
}
```

### 유도 규칙 (visibility → contact)

`visibilityScore` 가 있으면 contactRate 를 산출하되, 매체 유형별 기준값에
곱해서 얻는다. 시인성이 좋아도 매체 성격이 contactRate 의 천장을 만든다.

```
DEFAULT_CONTACT_RATE = {
  dooh_large:    0.30,   // 신호 대기 중 시선 확보
  dooh_mid:      0.20,
  subway_psd:    0.45,   // 대기 시간 길어 최고
  subway_light:  0.30,
  bus_exterior:  0.15,   // 이동 중, 짧은 노출
  bus_shelter:   0.40,   // 대기 중
  elevator_tv:   0.55,   // 밀폐·강제 시선
  airport:       0.35,
  static_other:  0.25,
}

if (measured contactRate 실측치 존재):
    contactRate      = measured
    contactRateBasis = "measured"
elif (visibilityScore != null):
    contactRate      = DEFAULT_CONTACT_RATE[media_class] * (0.6 + 0.4 * visibilityScore)
    contactRateBasis = "derived"
    // visibilityScore=1.0 이면 기준값 그대로, 0.0 이면 60% 로 감쇠
    // 0.6 하한은 "시인성이 나빠도 완전히 안 보이는 건 아니다" 반영
else:
    contactRate      = DEFAULT_CONTACT_RATE[media_class]
    contactRateBasis = "default"
```

계수 0.6·0.4 는 초안이다. Signal 이 쌓이면 실측치로 회귀해 재조정한다.

## 수정 §B — demo_* 는 Signal 이력 + Computed 스냅샷

플래너 타깃 매칭이 매 요청마다 Signal 을 조인해서 성별·연령 분포를
계산하면 느리다. 원본은 Signal 에, 조회용 스냅샷은 Computed 에 둔다.

### 이력 (Signal)

```prisma
// MediaExternalSignal 사용, 새 테이블 없음.
sourceType: "population_demographics"
sourceKey:  "<dong_code>" | "<grid_id>" | "<station_code>"
rawValue:   {
  gender: { male: 0.48, female: 0.52 },
  age:    { "10s": 0.05, "20s": 0.28, "30s": 0.31, "40s": 0.22, "50s+": 0.14 },
  sampleSize: 12345,
  method:     "living_pop" | "subway_ridership" | ...
}
```

이력이라 `validFrom` / `validTo` / `collectedAt` 로 시점을 남긴다.
매체 하나당 여러 sourceType (dong 격자, 지하철역 등) 이 공존할 수 있다.

### 스냅샷 (Computed)

```prisma
model MediaComputedMetric {
  // ── PR-3 재설계 신규 ──
  demoGenderSplit Json?   // { male, female } — Signal 병합 결과
  demoAgeSplit    Json?   // { "10s"..."50s+" } — Signal 병합 결과
  demoSourceSignalIds String[] @default([]) @map("demo_source_signal_ids")
}
```

### 재계산·갱신 주기

| 트리거 | 주기 | 이유 |
|---|---|---|
| 어드민 recompute 버튼 | 즉시 | 데이터 이관·수기 검토 후 즉시 반영 |
| Signal 이 새로 들어옴 | 이벤트 트리거 | 새 원본이 도착하면 파생 스냅샷도 갱신 |
| 정기 배치 | **주 1회 (일요일 03:00 KST)** | 인구 데이터가 그 이상 자주 갱신되지 않는다 |
| 매체 Fact 변경 (좌표 등) | 이벤트 트리거 | 커버 지역이 바뀌면 인구 프로파일이 바뀐다 |

주기가 너무 짧으면 리소스 낭비, 너무 길면 광고주가 최신 인구 데이터를
못 본다. 인구 통계는 주 단위 이상 자주 갱신되지 않으므로 주 1회가
합리적 균형이다.

**스냅샷과 이력이 어긋난 상태 감지**는 감사 스크립트가 담당한다
(§감사 대응 참조).

## Fact / Computed / Signal 최종 스키마 초안

```prisma
model MediaFactSheet {
  // ── 기존 ──
  latitude       Float
  longitude      Float
  mediaSubtype   String
  widthMm        Int?          // 물리 크기(mm)
  heightMm       Int?
  dimensionSource DimensionSource?
  installHeightM Float?
  bearing        Int?
  viewDistanceM  Float?
  operatingStart String?
  operatingEnd   String?
  timezone       String        @default("Asia/Seoul")
  stationCode    String?
  stationLineCode String?

  // ── PR-3 재설계 신규 ──
  sellingUnit           String?   // "panel" | "vehicle" | "station" | "route" | "site"
  spotDurationSec       Int?      // DOOH loop 소재 초 (SOV 계산 입력)
  loopDurationSec       Int?      // DOOH loop 1회전 초
  playsPerHour          Int?      // 시간당 재생 보장 방식일 때
  resolutionW           Int?      // 화면 해상도(px)
  resolutionH           Int?
  aspectRatio           String?   // "16:9" 등
  fileFormats           String[]  @default([])
  maxFileSizeMB         Int?
  hasAudio              Boolean?
  submissionDeadlineDays Int?     // 집행 D-N일 소재 마감
  regionCode            String?   // 시도 2자리 (필터 폴백)
}

model MediaComputedMetric {
  // ── 기존 ──
  dailyImpressions   Int
  hourlyImpressions  Json?
  cpm                Int
  visibilityScore    Float?      // 물리적 시인성 (Fact 에서 계산)
  reliabilityGrade   ReliabilityGrade
  modelVersion       String
  computedAt         DateTime
  sourceSignalIds    String[]
  legacyDailyImpressions Int?
  legacyCpm          Int?

  // ── PR-3 재설계 신규 ──
  contactRate                Float?   // OTS → LTS 전환율 (visibilityScore + media_class 유도)
  contactRateBasis           String?  // "measured" | "derived" | "default"
  contactRateInputVisibility Float?
  contactRateInputClass      String?

  coveragePopulation Int?       // 커버 지역 생활인구 총합
  coverageDongs      Json?      // [{ code, weight }]

  demoGenderSplit    Json?      // { male, female } — Signal 병합 스냅샷
  demoAgeSplit       Json?      // { "10s"..."50s+" }
  demoSourceSignalIds String[]  @default([])
}

// MediaExternalSignal 은 기존 유지.
// sourceType 값에 "population_demographics", "commercial_grade" 등 추가.
```

## `CampaignPlan` — 별도 PR

3계층과 무관하며 플래너 저장·공유·히스토리에 필요한 독립 테이블이다.
원본 #390 에서 그대로 떼어 별도 PR (`claude/campaign-plan-storage`) 로
개설한다.

- `share_token` UNIQUE (로그인 없이 공유)
- `engine_version` 스냅샷 (계산식 변경 시 소급 방지)
- `expires_at` (30일 TTL cron 대비)
- `owner_id` FK `ON DELETE SET NULL`

## 감사 대응 (신규 규칙 초안)

3계층 도입 후 감사 스크립트가 새로 잡아야 할 케이스:

| 규칙 | 검사 | severity |
|---|---|---|
| **R-11** | `Media.impressions` vs `MediaComputedMetric.dailyImpressions × 30` 괴리 30%↑ | P1 |
| **R-12** | `MediaComputedMetric.demoGenderSplit` 이 Signal 최신값보다 오래됨 (스냅샷 stale) | P1 |
| **R-13** | `MediaFactSheet` 없는 매체 (Fact 미채움) | P0 |
| **R-14** | `MediaComputedMetric.reliabilityGrade === "C"` + `modelVersion === "v0-fallback"` 매체 비중 | 메트릭 |

R-11 은 표시 계층의 정본을 어느 쪽으로 볼지 확정되기 전까지는 정보성으로만 남긴다.
R-12·R-13 은 backfill 진척 추적용.

## 배포 순서

1. **이 문서** 리뷰 · 승인
2. `CampaignPlan` 만 별도 PR 로 개설 (지금 `#390` 대체)
3. Fact/Signal/Computed 확장 새 PR 로 개설 (본 문서 스키마 기준)
4. 원본 `#390` 은 close (D-1)
5. 데이터 이관 (별도 PR-4) — `contactRate` 유도, `demo_*` Signal 수집,
   스냅샷 생성. 감사 리포트 승인 후 진행.

## 미결 판단 요청

1. §A 의 계수 (0.6·0.4) 초안 승인 여부 — Signal 축적 전까지는 임시값
2. §B 의 정기 배치 주기 — 주 1회(일요일 03:00 KST) 초안
3. R-11 정본 방향 — Media 본체 legacy 유지 vs Computed 전환
   (전자는 지금 그대로, 후자는 PR9+ 예정)
