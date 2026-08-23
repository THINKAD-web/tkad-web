# 백로그 — 루트 `Media.price` vs `priceOptions` 데이터 정합

**등록**: 2026-08-23 (이슈3 SSOT 통일 후)  
**상태**: 백로그 (계산 경로 통일은 완료, DB 필드 정합은 미착수)  
**관련 감사**: `scripts/audit-price-root-vs-options.mts`

## 배경

프로덕션 카탈로그(2026-08-23) 기준 **국내 158/785건(20.1%)** 에서
`catalogPriceFieldToWon(m.price)` ≠ `resolveCatalogLineMonthlyPriceWon()` (priceOptions 우선).

상권 세분화(`region-subdivision.ts`)는 2026-08-23에 플래너 SSOT로 통일됨.
**루트 `m.price` 필드 자체**는 아직 정리하지 않음.

## 반복 패턴 — 루트 = 옵션 × 2

| 매체 예시 | `m.price` | priceOptions[0] | 비율 |
|-----------|-----------|-----------------|------|
| 도산대로 SEDEC 외벽 | ₩2억 | ₩1억 | 2× |
| 강남 미진프라자 (week) | ₩2.4억 | ₩1.2억 | 2× |
| 동대문 콘하스 | ₩1,200만 | ₩1,000만 | 1.2× |

우연한 오입력보다 **양면 합산·좌우 세트·패키지 총액 vs 면당** 등
판매 구조상 의도일 가능성이 있음.

## 후속 작업 (A-6 또는 별도 데이터 감사)

1. 2배 패턴 샘플링 — 운영·매체사 확인 (Jaehan 판단 필요)
2. 의도적이면 `m.price` 의미를 어드민/CSV 가이드에 문서화
3. 오류면 어드민 백필 (`audit-price-root-vs-options.mts` 로 진행률 측정)
4. `recommendation-claude`, `proposal-narrative` 등 **보고서 외** `m.price` 직접 참조도 별도 검토

## 참고

- 매크로 지역표 `regional-breakdown.ts` 는 이미 `plannerMonthlyPriceWonForMedia` 사용 중이었음
- 보고서 경로에서 `m.price` 직접 합산은 상권 세분화만 해당했음 (이슈3)
