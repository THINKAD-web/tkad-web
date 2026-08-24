# A-6 Partial Rate Plumbing — Backlog

> 기록일: 2026-08-24 · `interpolatePartialRate` 플래너 이식 완료 후 운영 가이드용

## 요약

플래너 `plannerMediaPeriodLineWon` fallback 경로에 compare-quote와 동일한 `interpolatePartialRate` 배관을 연결했다.

**현재 운영 DB**: 대부분 매체가 요율 포인트 **1개**(예: `15days=60%`)만 등록 → 보간 조건(rate point ≥2) 미충족 → **견적 금액 변화 없음** (회귀 테스트로 고정).

**향후**: 어떤 매체든 요율 포인트가 **2개 이상** 채워지는 순간, 14/10/20일 등 비표준 기간 견적이 compare-quote와 동일하게 **약 5~18% 상향**될 수 있음 (전체 6-key 스케줄 가정 시뮬레이션 기준).

## 운영 가이드 TODO (급하지 않음)

- [ ] Admin 매체 편집 UI / 요율표 입력 가이드에 다음 문구 추가:
  - "요율 키를 2개 이상 등록하면, 7일·15일 사이 기간(예: 10일·14일)은 **선형 환산이 아니라 요율 곡선 보간**으로 자동 계산됩니다."
  - "비표준 기간 견적이 등록 상품가·기존 선형 환산보다 높아질 수 있습니다 — 키 추가 전후 샘플 견적 확인 권장."

## 관련 코드

- `lib/compare-quote.ts` — `interpolatePartialRate` (export)
- `lib/planner/planner-media-quantity.ts` — fallback 경로
- `lib/planner/__tests__/partial-rate-interpolate.test.ts` — 회귀 2종
