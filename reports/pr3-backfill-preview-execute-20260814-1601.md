
환경: PREVIEW

(node:94146) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
# 백필 리포트

- 환경: preview
- 모드: execute
- 시작: 2026-08-14T07:01:46.873Z
- 종료: 2026-08-14T07:07:30.109Z
- DB 호스트: ep-shiny-sun-ahrk7gkk
- 스크립트 SHA: 216de2de74ae970c1ecb101f5c049d002d528029
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
- PARSED_FROM_TEXT: 0
- ESTIMATED_MEDIAN: 0
- UNKNOWN: 145
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

