# 백필 리포트

- 환경: preview
- 모드: dry-run
- 시작: 2026-08-14T06:49:22.419Z
- 종료: 2026-08-14T06:49:25.377Z
- DB 호스트: ep-shiny-sun-ahrk7gkk
- 스크립트 SHA: ab31a0405b7bfc868991f80231ee8754594a2afe
- 대상 media row 수: 821
- FactSheet 예정: 817 (좌표 NULL 스kip: 4)
- ComputedMetric 예정: 821

## 배치별 결과

### seoul-with-dims
- 대상: 430
- 성공: 430
- 실패: 0
- 스킵: 2

### seoul-missing-dims
- 대상: 92
- 성공: 92
- 실패: 0
- 스킵: 0

### other-regions
- 대상: 299
- 성공: 299
- 실패: 0
- 스킵: 2

## dimensionSource 분포

- MEASURED: 672
- PARSED_FROM_TEXT: 1
- ESTIMATED_MEDIAN: 0
- UNKNOWN: 144
- null: 0

## reliabilityGrade 분포

- A: 0
- B: 0
- C: 821

## NULL 요약 (필수 Fact)

- latitude NULL: 4
- longitude NULL: 4

## Skip된 rule / 메모

- Production 71-col SELECT whitelist (Preview orphan 23 cols excluded)
- installHeightM/bearing/viewDistanceM: media 원본 없음 → skip
- stationCode: RAW_COPY → nearby_stations 텍스트 (§16.2 미확정)
