# Phase B 4단계 — E 결론 / D 샘플 (2026-08-20)

값 미변경 원칙. D는 이 단계에서 플래그하지 않음.

## E — 플래그 필요

재조회 72건. **음수 0건.** 71건 `impressions=null`, 1건 `dailyFootfall=null`(헤스티아 버스 LED). 전원 `isActive=true`, 기존 flagged 아님.

| 경로 | null/음수 처리 | 72건 실제 |
|---|---|---|
| 공개 카탈로그 `fetchPublicMediaCatalog` | `publicActiveMediaWhere()` = 활성 + not flagged. **impressions/daily 미필터**. `dailyFootfall ?? 0`, `impressions ?? undefined` | **72건 모두 노출됨** |
| 견적 `lineImpressions` | 에러 없음. impressions 없으면 daily×30, 둘 다 없으면 `resolveMonthlyImpressions` → **0** | 71건은 daily 폴백(견적 노출 과소/대체). 헤스티아는 stored 52M 사용 |
| AI 추천 | 후보 풀 = 공개 카탈로그. impressions 미필터. `minDailyFootTraffic` 기본 0 | **72건 포함** |

원인 메모: 제안서 없는 엔스퀘어·시부야 JP DOOH 등 **월노출 미입력**. 기존 로직이 배제하지 않음 → `reviewStatus=flagged`, `reviewReason=null_or_negative` (기존 컬럼 재사용, 마이그레이션 없음).

## D — 샘플만, 플래그 안 함

×31 재조회 **189건**. 샘플: 비율 낮은 10 + 높은 10 + `mulberry32(seed=20260820)` 무작위 10.

- 최저 ≈ **31.03** (해운대 임팩트웨이브) — 임계값 바로 위, DOOH
- 최고 ≈ **335** (골프장 미디어바) — 클래스 분류가 subway_psd로 잡힌 이동형
- 2호선 메트로라이브(×346)는 Phase A `impressions_class_cap` 선거부라 **D 경고에 안 들어감**

`phase-b-d-sample-30.csv` → 재한 임계값 판단 후 `phase-b-audit-report-d-final.csv` 재산출. 5단계 이관. 지금은 final CSV 없음.
