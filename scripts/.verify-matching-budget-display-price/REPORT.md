# #4-2 검증 — Matching 예산 = Display SSOT

생성: 2026-07-21T11:07:03.438Z

## 견적 라인 무영향
- `lib/media-quantity.ts` git unchanged: **true**
- `lib/quote-calculator.ts` git unchanged: **true**
- spot resolveMonthlyPriceForUnits finite: **true** (50 samples)

## 가격 경로
- 카탈로그: 760 (network 8)
- non-network legacy≠display (both>0): **220**
- 밴드 변경(아무 예산이라도): **178**

## 예산별 밴드 변경 (기존 mismatch 집합 기준)
- 1천만: changed 95, qty-only-over 28, display-only-over 1
- 3천만: changed 71, qty-only-over 16, display-only-over 1
- 5천만: changed 58, qty-only-over 8, display-only-over 1
- 1억: changed 32, qty-only-over 8, display-only-over 1

## 정상 매체(가격 일치) 회귀
- checked (non-network, legacy≈display): 523
- **scoreMediaForRanking failures: 0** (기대 0)
- portfolio top200 presence shift (참고, 의도된 풀 재편): 21

## 극단 사례
- **여의도 환승센터 쉘터 광고**: legacy=40000000, display=3000000, expect~3000000, ok=true
  - 1천만: over → sweet
  - 3천만: over → sweet
- **명동 미디어폴 디지털 광고**: legacy=10000000, display=700000, expect~700000, ok=true
  - 1천만: tight → cheap
  - 3천만: sweet → cheap

## top20 전/후 overlap
- 1천만: overlap 2/20, identical=false
- 3천만: overlap 2/20, identical=false
- 5천만: overlap 2/20, identical=false
- 1억: overlap 3/20, identical=false

전체 변화 케이스: `report.json` → `changedCases` (178건)
