# 업종 키워드 substring 오매칭 — 전수 점검 백로그

**상태:** 백로그 (급하지 않음)  
**등록:** 2026-08-24

## 배경

P1 업종 보너스에서 substring 정규식 오매칭이 두 번 확인됨:

| 업종 | 키워드 | 오매칭 예 |
|------|--------|-----------|
| F&B | `역`, `지하철`, `상권` | 일반 교통·상권 매체 과다 Strong |
| retail | `mall` | `target:small_business` 태그 |
| tech (잠재) | `앱` | `디앱스` 매체명 |

retail/tech는 `lib/planner/brief/industry-keyword-match.ts`로 **태그 exact + 안전 substring** 패턴 적용 (2026-08-24).

## 할 일

1. `lib/matching-engine.ts` `INDUSTRY_DEFS` 및 legacy `scoreIndustry` 경로의 **모든 업종** 키워드 정규식 목록 export
2. 프로덕션 카탈로그 `name` / `subCategory` / `tags`에 일괄 실행
3. Strong hit 건 중 **의도하지 않은 hit** 샘플링 (업종별 TOP20 false positive)
4. retail/tech와 동일하게 structured matcher로 이전 여부 판단

## 완료 기준

- 업종별 false positive 후보 리스트 + 수정/유지 판단
- F&B·finance·entertainment에 동일 패턴 적용 PR (별도)

## 참고

- 진단 스크립트: `scripts/.diagnose-brief-matching-regression/industry-keyword-diagnosis.mts`
- 설계: `reports/matching-p1-scoring-design.md` §2.3
