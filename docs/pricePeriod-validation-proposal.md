# pricePeriod 오라벨 방지 — 입력 검증 제안 (D-4)

**작성:** 2026-08-15 · **제안 문서, 구현 아님**
**결정 반영:** 2026-08-15 — E-4 승인: **세 규칙 전부 "경고"로만 구현한다. "거부"는 넣지 않는다.** PR-4 데이터 이관 완료 후 거부 승격을 재판단.

## 문제

30배 견적 버그(V-5, R-1)의 근본 원인은 `pricePeriod = "day"` 로 잘못
기재된 매체의 price 필드가 실제로는 월 단가라는 데이터 오라벨이었다.

`pricePeriod` 는 Computed 필드가 아니므로 PR4 lockdown 대상이 아니고,
현재 JSON 으로 자유롭게 입력된다. `stripLockedFields` 는 이 필드를 통과
시킨다. 다시 같은 실수가 들어올 자리가 열려 있다.

## 접근 원칙

- **잠금은 안 된다.** 실제 일 단가 매체(예: 신세계 본점 22M/일)가 존재하므로
  "day" 자체가 부정될 수는 없다.
- **거부보다 경고 우선.** 어드민이 급하게 실제 존재하는 이례적 상품을
  등록하는 경우를 막으면 안 된다.
- **감사 리포트가 이미 사후 탐지한다** (R-05b/c/d). 이 제안은
  **저장 시점의 사전 방어**를 추가하는 것이다.

## 제안 규칙

`price` × `pricePeriod` 조합의 물리적 타당성을 검사한다. 유효한 조합의
가격 범위가 매체 유형별로 존재한다.

### 규칙 1 — day 라벨 상한

```
if price_period === "day":
  if price >= 10_000_000 KRW/day and 매체 유형이 대형 DOOH 가 아님:
    → 경고: "일 단가 1천만원 이상은 대형 DOOH 만 성립합니다.
             혹시 월 단가가 아닌지 확인해 주세요."
  if price >= 50_000_000 KRW/day (어떤 유형이든):
    → 경고 (강): "일 단가 5천만원은 국내 OOH 최고가를 초과합니다.
             price_period 를 month 로 저장하려던 것이 아닌가요?"
             + 자동 제안: month 로 저장하면 CPM 이 얼마가 되는지 미리 보여줌
```

> **E-4 결정:** 이 케이스는 원래 "거부" 초안이었으나 **경고(강)로 하향**한다.
> 실제 존재하는 이례적 상품(초프리미엄 일 단가)을 저장하려는 관리자를 막지
> 않기 위해서다. 거부 승격은 PR-4 이관으로 기존 오라벨이 정리된 후 재판단.

임계값 근거:

- 대형 DOOH 최고가: M-CITY 25M/7일 = **3.5M/일**, 신세계 본점 22M/일.
  10M/day 는 신세계 급 초 프리미엄만 넘는 선.
- 50M/day 는 실질적 상한. 넘으면 십중팔구 라벨 오류.

### 규칙 2 — priceOptions 와 base 의 일할 단가 비교

```
if priceOptions 에 exact 상품이 있으면:
  base_daily_rate  = price / periodToDays(pricePeriod)
  option_daily_rate = priceOption.price / periodToDays(priceOption.period)

  if base_daily_rate > 5 × min(option_daily_rate):
    → 경고: "base 일할 단가가 등록 상품 대비 5배 이상 비쌉니다.
            pricePeriod 라벨을 확인해 주세요."
```

이건 M-CITY 정확 케이스: `price=70M, pricePeriod=day` 이면 base 일할이
70M/일인데 등록 상품 (`7일 25M` = 3.57M/일) 대비 20배. 사후 감사 R-05d
가 이미 잡고 있지만 저장 시점에서도 잡는다.

### 규칙 3 — 라벨과 이름의 일치

```
if 매체명·price_note 에 "1개월"/"1 month" 표기가 있는데 pricePeriod !== "month":
  → 경고: "매체명은 월 상품인데 저장 기간이 다릅니다."
```

R-05c 와 동일한 패턴, 저장 시점 버전.

## 구현 위치 후보

```
lib/media-quick-add.ts       — validateQuickAddItems() 안
lib/admin-media-dto.ts       — API PATCH/POST 검증
scripts/media-json-lint.ts   — 로컬 CI 훅
```

기존 `stripLockedFields` 옆에 `warnPricePeriodMismatch(cleaned)` 를 붙이는
형태가 자연스럽다. 반환 형태:

```ts
type PricePeriodWarning = {
  code: "day_price_too_high" | "base_vs_options_gap" | "name_vs_period";
  message: string;
  hardBlock: boolean;   // true 면 저장 거부, false 면 admin 확인 프롬프트
  suggestion?: {
    field: "price_period" | "price";
    suggestedValue: unknown;
  };
};
```

## 감사 리포트와의 관계

이 검증은 **신규 저장을 막는 사전 방어**이다. 기존 레코드는 여전히 감사
스크립트 (R-05b/c/d) 가 담당한다. 둘의 조합:

- **감사**: 이미 DB 에 들어간 오라벨을 찾아 정정 큐로 넘긴다
- **입력 검증**: 정정 후 재발을 막는다

이 둘이 나뉘어 있어야 롤아웃이 안전하다. 검증부터 먼저 넣으면 오히려
기존 오라벨 매체를 관리자가 편집하려 할 때 저장이 막혀 정정을 못 하게
된다. 따라서 순서는:

1. 감사 리포트로 오라벨 매체 파악 (R-05d 기반)
2. PR-4 데이터 이관에서 정정
3. 입력 검증을 도입 (본 제안)

## 결정 요청

- (가) 규칙 1·2·3 모두 채택
- (나) 규칙 1 만 채택 (가장 명확한 케이스)
- (다) 규칙 3 만 채택 (매체명 기반, 오탐 최소)
- (라) 감사 강화로 충분, 입력 검증은 미채택

권고: **(가)**. 셋 다 다른 실패 모드를 잡고 규칙 2 는 특히 M-CITY
정확 케이스이다. 다만 배포 순서는 위의 3단계를 지킨다.

**E-4 결정 (2026-08-15): (가) 채택 — 단 세 규칙 전부 "경고"로만 구현.**
규칙 1 의 5천만원/일 케이스도 거부가 아니라 경고(강)이다. 저장은 항상
통과시키고, 관리자에게 경고만 노출한다. 거부 승격은 PR-4 완료 후 별도 판단.

## 구현 금지

지시대로 이 제안은 문서로만 남긴다. 실제 코드 수정은 재한 승인 후
별도 PR 로 진행한다.
