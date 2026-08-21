# Phase B 6단계 — 내부 모순 워크시트

- 출처: 5단계 `phase-b-d-final-priority.csv`와 동일 규칙 (카피월≠daily×30 / 카피일≠dailyFootfall / price=impressions / cpm≤10)
- 조회: 프로덕션 catalog DB read-only. **값·flagged·hasProposal 미변경**
- 조회일: 2026-08-21
- CSV: `reports/phase-b-contradiction-18.csv` (`verdict` / `verdictNote` 빈칸 — 사람 기록용)

## 실제 대상 건수

지시서 산술: 2그룹 14 + 1그룹 모순 4 = **18**. 그룹이 배타적이라 중복 없음.

| | 건수 |
|---|---|
| 실제 unique | **18** |
| 그중 1그룹 | 4 |
| 그중 2그룹 | 14 |
| 이미 Phase B 6건 flagged | 2 |

D-final 116 전체와 교차 확인: mismatch 신호가 있는 행만 이 표에 넣음.

## contradictionType (힌트, 판정 아님)

배수 = copyClaimedValue ÷ (dailyFootfall×30). 역수(1/배수)도 같은 허용오차 ±10%로 본다.
카피 숫자가 없으면 mismatchRatio 공란, 유형 OTHER.

| 유형 | 건수 | 기준 |
|---|---|---|
| UNIT_SUSPECT | 0 | 30 / 365 / 12 부근 — 일·월·연 혼동 |
| MAGNITUDE_SUSPECT | 0 | 10 / 100 / 1000 부근 — 자릿수 |
| OTHER | 18 | 위 아님 (price=impressions, CPM placeholder, 그 외 배수) |

## 1그룹 4건 (copyMismatchReasons 있음)

| 매체 | 비율 | 사유 | 카피값 | daily×30 | mismatchRatio | type | 갤러리제안서 | subCategory |
|---|---|---|---|---|---|---|---|---|
| 지하철 2호선 메트로라이브 광고 | ×346.15 | 카피월≠daily×30;price=impressions | 70,000,000 | 3,900,000 | 17.9487 | OTHER | 4 | subway_station |
| 인천공항 T1 Center Bridge | ×181.82 | cpm≤10(placeholder) | — | 3,300,000 | — | OTHER | 0 | subway_station |
| 분당선 압구정로데오역 헬로 로데오 DS 광고 | ×171.05 | 카피월≠daily×30 | 970,000 | 1,140,000 | 0.8509 | OTHER | 0 | subway_station |
| 신세계백화점 본점 신세계 스퀘어 전광판 광고 | ×134.67 | 카피일≠dailyFootfall | 120,000 | 1,002,420 | 0.1197 | OTHER | 0 | digital_signage |

## 2그룹 14건

| 매체 | 비율 | 사유 | 카피값 | mismatchRatio | type | 갤러리제안서 | subCategory |
|---|---|---|---|---|---|---|---|
| KTX 전주역 맞이방 영상광고 (4번) 광고 | ×120 | cpm≤10(placeholder) | — | — | OTHER | 0 | ktx_terminal |
| 스타필드 하남점 LED 전광판 광고 | ×92.86 | cpm≤10(placeholder) | — | — | OTHER | 0 | billboard |
| 디저트랩 이마트24 서울숲점 LED 사이니지 광고 | ×65.79 | price=impressions | — | — | OTHER | 0 | convenience |
| 인천지하철 1호선 원인재역 디지털사이니지 (디지털포스터) 광고 | ×57.14 | cpm≤10(placeholder) | — | — | OTHER | 0 | subway_station |
| 인천지하철 1호선 작전역 디지털사이니지 (디지털포스터) 광고 | ×57.14 | cpm≤10(placeholder) | — | — | OTHER | 0 | subway_station |
| 인천지하철 1호선 부평역 디지털사이니지 (디지털포스터) 광고 | ×56.92 | cpm≤10(placeholder) | — | — | OTHER | 0 | subway_station |
| 인천지하철 1호선 인천시청역 I-SCREEN 영상광고 | ×56.92 | cpm≤10(placeholder) | — | — | OTHER | 0 | subway_station |
| 인천지하철 1호선 예술회관역 디지털사이니지 (디지털포스터) 광고 | ×56.82 | cpm≤10(placeholder) | — | — | OTHER | 0 | subway_station |
| 인천지하철 2호선 검암역 I-SCREEN 영상광고 | ×56.82 | cpm≤10(placeholder) | — | — | OTHER | 0 | subway_station |
| 인천지하철 1호선 테크노파크역 I-SCREEN 영상광고 | ×56.8 | cpm≤10(placeholder) | — | — | OTHER | 0 | subway_station |
| 인천지하철 2호선 주안역 I-SCREEN 영상광고 | ×56.74 | cpm≤10(placeholder) | — | — | OTHER | 0 | subway_station |
| 인천지하철 1호선 디지털사이니지 전체 턴키 (7개 역사) 광고 | ×56.72 | cpm≤10(placeholder) | — | — | OTHER | 0 | subway_station |
| 인천지하철 1호선 인천터미널역 디지털사이니지 (디지털포스터) 광고 | ×56.67 | cpm≤10(placeholder) | — | — | OTHER | 0 | subway_station |
| 인천지하철 1호선 부평구청역 디지털사이니지 (디지털포스터) 광고 | ×56.25 | cpm≤10(placeholder) | — | — | OTHER | 0 | subway_station |

## 사람 판정 (이번 CSV에 아직 비움)

3단계 A/B/C 정의를 그대로 쓴다. `verdict` + `verdictNote`에 **어느 쪽이 틀렸는지**(카피 vs impressions vs dailyFootfall)를 한 줄로.

1. contradictionType 힌트
2. 갤러리 제안서 경로가 있으면 그 파일부터 (매체사 재요청 전)
3. 아니면 세일즈/계약 원본
4. flagged는 **별도 지시** 전까지 적용하지 않음

## 하지 않은 것

- impressions / dailyFootfall / 카피 / hasProposal / reviewStatus 변경 0건
- 1그룹 나머지(모순 신호 없는 16건) 미착수

## 별도 티켓 (이번 단계 범위 밖, 이슈만 생성)

- 4-1 hasProposal 미구현: https://github.com/THINKAD-web/tkad-web/issues/430
- 4-2 NFC/NFD 정규화: https://github.com/THINKAD-web/tkad-web/issues/431
- 4-3 광역전철 PKG 갤러리 혼재: https://github.com/THINKAD-web/tkad-web/issues/432
