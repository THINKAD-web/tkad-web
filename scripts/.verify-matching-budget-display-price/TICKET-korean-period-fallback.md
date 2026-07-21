# 별도 티켓 초안 — 표시 가격에서 일부 한글 기간 표기가 month로 잘못 폴백됨

**상태**: 백로그 ( #4-2 범위 밖 )  
**발견 경로**: Matching quantity vs display SSOT 진단 (#4-2)

## 문제

`normalizeMediaPricePeriod`가 영문 키(`day` | `week` | `biweekly` | `month`)만 인식한다.  
옵션/필드에 `"1일"`, `"7일"`, `"15일"`, `"2주"` 등이 오면 **전부 `month`로 폴백**된다.

그 결과 `resolveMediaDisplayPrice` → `resolveMonthlyListPriceWon`이  
단기 패키지 **raw 원가**를 월가로 취급할 수 있다.

예: 명동 미디어폴 — 1일 패키지 ₩70만이 목록에 `₩70만/월`처럼 보일 수 있음  
(실제 월 환산은 훨씬 큼). #4-2는 matching을 이 display SSOT에 맞췄으므로,  
표시 period 정규화가 틀리면 **추천 예산 점수도 같은 방향으로 틀어진다.**

## 제안 범위

1. `normalizeMediaPricePeriod`에 한글/숫자 기간 표기 매핑 (`1일`→day, `7일`/`1주`→week, `15일`/`2주`→biweekly, `1개월`→month 등)
2. 카탈로그 옵션 period 값 스캔 + 매핑 누락 리포트
3. 목록/상세/정렬/matching(display SSOT) 회귀 — 특히 단기 패키지 매체
4. (선택) `getCheapestMediaPriceOption`이 raw 최소가 아니라 **월환산 최소**를 고르는지 재검토 — 별 서브태스크 가능

## 비범위

- 견적 라인 `resolveMonthlyPriceForUnits` / quantity 대수 로직
- matching 예산 점수 구조 자체 (#4-2에서 display SSOT로 이미 분리)

## 수락 기준

- 한글 period가 올바르게 day/week/biweekly/month로 정규화됨
- 명동 미디어폴류 단기 옵션이 월환산으로 표시·정렬됨
- 기존 영문 period 매체 diff-0
