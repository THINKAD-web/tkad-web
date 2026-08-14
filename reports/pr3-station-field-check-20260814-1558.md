# PR3 stationCode 소스 필드 확인

**생성**: 20260814-1558  
**DB**: vercel-preview (`ep-shiny-sun`, production clone — 71 cols / 821 rows)

## 1. media 테이블 station 관련 컬럼

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='media' AND column_name ILIKE '%station%';
```

| column_name | data_type |
|-------------|-----------|
| nearby_stations | text |

**결론**: `station_code` 컬럼 **없음**. 유일한 station 관련 필드는 `nearby_stations` (자유 텍스트).

→ **옵션 B RAW_COPY** (`nearby_stations` → `MediaFactSheet.stationCode`) 가 올바른 소스.

## 2. 지하철 매체 (`inferMediaSubtype` → `subway_*`) 샘플 10건

스크립트 `isSubwaySubtype()` 기준 inferred subtype ∈ {subway_platform, subway_concourse, subway_train_interior}.  
총 217건 중 `nearby_stations` 보유 216건.

| id | name | inferredSubtype | nearby_stations | stationCode (RAW_COPY) |
|----|------|-----------------|-----------------|------------------------|
| cmocwp83j000004jydnleh4qj | 인천 파라다이스시티 쓰리 윈도우 미디어 광고 | subway_platform | 영종도 파라다이스시티 셔틀·버스정류장 | 동일 텍스트 복사 |
| cmocx14zb000004l05j30gdrc | 스타필드 하남점 미디어타워 & 파노라마 스크린 광고 | subway_platform | 스타필드 하남 셔틀·버스정류장, 미사역 인근 | 동일 |
| cmoeiqs47000004k7n7mp111t | 지하철 2호선 강남역 미디어월 광고 | subway_platform | 강남역 2호선 (약 50m) | 동일 |
| cmoeiyvcf000004ky64k0c9ri | 강남역 자이언트월 미디어 광고 | subway_platform | 강남역 2호선 (약 28m) | 동일 |
| cmoforsto000004jrjawzqx3y | 지하철 2호선 강남역 PMP 광고 | subway_platform | 강남역 2호선·신분당선 (내부) | 동일 |
| cmofozazn000004jxwwapnyz9 | 2호선 건대입구역 디지털포스터 지하철 광고 | subway_platform | 건대입구역 2호선 (약 3m) | 동일 |
| cmofp8byj000004jrqctglqs7 | 2호선 잠실역 디지털포스터 지하철 광고 | subway_platform | 잠실역 8호선 (약 134m) | 동일 |
| cmofpcsf0000004le5ynd6i5a | 지하철 2호선 신촌역 디지털포스터 광고 | subway_platform | 신촌역 2호선 (약 80m) | 동일 |
| cmofpfkgk000004l5b0uvgv6t | 2호선 사당역 디지털포스터 지하철 광고 | subway_platform | 사당역 2호선 (약 13m) | 동일 |
| cmofprkck000204jr5ij37udz | 공항철도 서울역 랩핑 무빙워크 핸드레일 광고 | subway_platform | 서울역 4호선 (약 24m) | 동일 |

**관찰**:
- 값은 역명+호선+거리 형태의 **설명 텍스트** (표준 station code 아님).
- §16.2 미확정 + RAW_COPY 정책과 일치. PR6+ 표준 변환 전까지 acceptable.

## 3. PARSED_FROM_TEXT 1건 상세 (dry-run 기준)

| 항목 | 값 |
|------|-----|
| mediaId | `cmq3wwc63000j04lgcmp77yeg` |
| name | 성수동 자연도소금빵 외벽 광고 |
| width (text) | `A : 702 B : 493 C : 477` |
| height (text) | `850` |
| width_m | NULL |
| height_m | **850** |
| dry-run 파싱 결과 | widthMm=850, heightMm=850, source=**PARSED_FROM_TEXT** |

### 원인

`resolveDimensions()`가 `width`+`height`를 `"…477x850"`으로 이어 붙여 `477×850` 패턴을 잡음.  
실제로는 다구좌 라벨(A/B/C) + 별도 height 텍스트이며, `height_m=850`은 이미 mm 단위로 저장된 legacy 값.

### 조치

`backfill-mapping.ts` 수정:
1. combined 텍스트 파싱은 `width_m`·`height_m` **둘 다 NULL**일 때만 허용.
2. `legacyDimToMm()`: ≤50 → meters×1000, >50 → mm 그대로 (7건 outlier 보정).

수정 후 dry-run: PARSED_FROM_TEXT **0**, 해당 row → UNKNOWN (width null, height 850mm).
