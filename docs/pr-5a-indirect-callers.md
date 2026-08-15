# priceToMonthlyEquivalentWon 간접 호출 8곳 — 사용자 화면 매핑 (R-8)

**작성:** 2026-08-10 · PR-5a follow-up · **본 문서는 코드 검색 결과이며 실DB 계측 아님**

R-1 은 amount 를 charge 하는 직접 호출을 다뤘다. 간접 호출은 정렬 함수
(`compareMediaByMonthlyEquivalentPrice`, `resolveMonthlyListPriceWon`,
`mediaMonthlyEquivalentSortWon`)에 몰려 있으나 "정렬만" 이 아니라 광고주
가 처음 보는 매체가 **어떤 순서로** 나오는지, 추천 스코어링이 무엇을
탈락시키는지를 결정한다. 아래는 grep 결과와 코드 리딩 기준 매핑이다.

## 8곳 사용자 도달 표 [코드 검색]

| # | 호출 파일 | 사용자 도달 화면 | 추천 스코어링 |
|---|---|---|---|
| 1 | `lib/matching-engine.ts:263` `resolveMonthlyListPriceWon` | `/recommend`, `/planner`, `/api/studio/rfp/export`, 홈 AI 카드 | **★ 예** — `scoreBudget()` 축의 유일한 입력 |
| 2 | `lib/media-package-db.ts:176` `compareMediaByMonthlyEquivalentPrice` | `/media/packages`, `/media/packages/[slug]` (SSR + OG 이미지), `/api/public/packages/[slug]/media` | 아니오 — 정렬만 |
| 3 | `lib/media-packages.ts:37` `resolveMonthlyListPriceWon` | `PackageCard` (홈·목록·상세 위젯) 가격 표기 | 아니오 — 카드 라벨 |
| 4 | `lib/merged-media-browse.ts:116,120` `compareMediaByMonthlyEquivalentPrice` | `/api/public/media` → `/media` 카탈로그 목록 | 아니오 — 정렬만 |
| 5 | `lib/public-media-map-filter.ts:89,93` `compareMediaByMonthlyEquivalentPrice` | `/api/media/map` → `/media/map` 지도 목록 | 아니오 — 정렬만 |
| 6 | `lib/public-media-query.ts:165` (docs·SSOT 참조) | 실제 실행은 (4)(5) 를 통해 도달 | 간접 |
| 7 | `components/media/media-search-page.tsx:560,563` | `/media`, `/planner`, `/planner/integrated` 검색 결과 | 아니오 — 정렬만 |
| 8 | `app/[locale]/(site)/quote/quote-page-client.tsx:609,613` | `/quote` 매체 목록 정렬 | 아니오 — 정렬만 |

## 지적하신 대로 backfill 로는 해결되지 않는다

PR-3 신규 컬럼은 `spot_duration`·`coverage_dongs` 등을 채운다. 그러나
문제의 뿌리인 **기존 `pricePeriod` 라벨(예: M-CITY 의 "day")** 은 그
어떤 신규 컬럼도 건드리지 않는다. `resolveMonthlyListPriceWon` 은
`priceToMonthlyEquivalentWon(price, pricePeriod)` 를 그대로 호출하므로
라벨이 "day" 인 한 30× 부풀림이 지속된다.

## PR-4 데이터 정정 큐 항목

R-05 감사가 뽑아낸 목록을 소스로 삼는다:

- **R-05b** — priceOptions 라벨 vs period 불일치 매체
- **R-05c** — 매체명에 "1개월" 표기 vs `pricePeriod` 불일치 매체
- **R-05d (R-7)** — priceOptions 비어 있고 base row 만 있는 매체
  (`mediaPriceOptions` 안전망이 동작하지 않는 매체들)

각 매체에 대해 아래 중 하나를 수행한다 (**모든 정정은 감사 리포트가
승인된 후 PR-4 안에서만 진행**):

1. **라벨이 진짜다** — `price` 는 그대로 두고 `pricePeriod` 를 "day" 로
   유지하되 `priceOptions` 에 실제 판매 상품(예: 7일 25M, 30일 70M)을
   등록.
2. **가격이 월 상품가다** — `pricePeriod` 를 "month" 로 정정.
   `resolveMonthlyListPriceWon` 이 즉시 올바른 월가를 낸다.
3. **모호** — 매체 소유자에 확인 요청 (R-05 목록 CSV → 운영팀).

## 우선순위

`matching-engine` (#1) 이 유일한 스코어링 소비자이므로 **여기에 노출되는
매체를 먼저 정정**한다. 정렬만 하는 나머지 7곳은 정확도가 낮아도
광고주가 재정렬 UI 로 우회할 수 있으나, 추천 탈락은 우회 경로가 없다.
