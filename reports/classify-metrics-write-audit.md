# classifyForMetricsWrite 점검 (2026-08-20)

값·flagged 미변경. 분류 로직 수정은 이 티켓에서 하지 않음.

## 원인 (두 사례 공통)

`classifyForMetricsWrite` → `classifyMedia`:

1. **`mediaSubCategory`가 `SUB_CATEGORY_CLASS`에 있으면 즉시 return.** 이름 휴리스틱은 실행되지 않음.
2. `subway_station` → 무조건 `subway_psd` (월노출 cap **15M**).
3. 이름만 보면 인천공항 T1 Center Bridge는 `airport`(cap 10M), 골프장 미디어바는 `static_other`(cap 15M).

재현:

| 입력 | 결과 |
|---|---|
| name=인천공항 T1 Center Bridge, sub=subway_station | **subway_psd** |
| name만 | airport |
| name=골프장 미디어바 광고, sub=subway_station, type=mobile | **subway_psd** |
| name만 | static_other |

골프장·택시는 DB `mediaSubCategory=subway_station` (browse 교통>지하철 역사). 분류 함수가 taxonomy를 절대 신뢰해서 이름과 충돌해도 덮어쓰지 않음.

Browse 자동추정 `inferBrowseCategoryFromMedia`도 `/지하철|subway|역사/i` → `subway_station`. **「역사」** 가 KTX창원역·반월당역·공항철도 역사명에 걸려 taxonomy가 오염될 수 있음.

## 반대 방향 (subway인데 다른 클래스)

이름에 지하철이 있는데 `subway_*`가 아닌 건 **4건**(김포공항 연결 ES는 airport taxonomy라 타당).

진짜 반대 방향 3건 — 전부 `digital_signage` → **dooh_mid (cap 8M)**:

- 부산 지하철 1·3호선 연산역 디지털 사이니지
- 부산 지하철 2호선 디지털사이니지 패키지
- 지하철 강남역 신분당선 출구 디지털 사이니지

이건 **더 느슨한 cap이 아니라 더 엄격(8M < 15M)** 이라 위반이 숨는 방향은 아님.

공항 본체가 `digital_signage`/`media_pole`이라 `dooh_mid`(8M)인 경우(제주공항 LED, T2 미디어폴 등): airport cap 10M보다 **약간 엄격**. 리무진버스는 `bus_*`가 맞음.

## 882건 클래스 분포 (스팟체크용)

| mediaClass | 건수 | 월 cap |
|---|---:|---:|
| dooh_large | 250 | 20M |
| subway_psd | 245 | 15M |
| dooh_mid | 143 | 8M |
| airport | 82 | 10M |
| static_other | 79 | 15M |
| bus_exterior | 41 | 2M |
| bus_shelter | 28 | 5M |
| subway_light | 14 | 15M |

`subway_station` taxonomy **245건 = subway_psd 전량**. 그중 이름에 지하철·호선·스크린도어가 없는 행 **50건** — 오염 후보(공항철도 다수, 골프장/택시 미디어바, 달고T, MOAD, 스타필드 하남, 파라다이스시티, T1 Center Bridge, 도산대로 MZ 캔버스 등).

전수 목록: `reports/classify-spotcheck-by-class.csv`  
휴리스틱 불일치: `reports/classify-mismatch-suspects.csv`

## 수정 여부 (아직 안 함)

선택지: (a) taxonomy 우선 유지 + 오염된 `mediaSubCategory` 정정, (b) 이름이 공항/골프/택시인데 subway taxonomy면 override, (c) browse 정규식에서 단독 `역사` 제거. Phase B 값 검증과 분리해서 별도 판단.
