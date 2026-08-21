# 공항철도 서울역 디지털사이니지 — 위치 성격 취합

- **mediaId:** `cmrm47dry00010ahtq1bssgdg`
- **조회:** 프로덕션 catalog DB (holy-cloud) read-only, `SET default_transaction_read_only = on`
- **조회 시각:** 2026-08-21
- **이번 조회에서 변경한 값:** 없음 (impressions / dailyFootfall / reviewStatus / 분류 코드 미변경)

---

## 1. 위치·주소

| 필드 | 값 |
|---|---|
| `location` | 서울 용산구 한강대로 405 서울역 공항철도 역사 |
| `locationEn` | (없음) |
| `city` / `district` | 서울 / 용산구 |
| `region` / `regionZone` / `regionSub` | seoul / downtown / seoul_itaewon |
| `latitude` / `longitude` | 37.5548375992165 / 126.971732581232 |
| `nearbyStations` | 서울역 (1호선, 4호선, 경의중앙선, 공항철도) |
| `nearbyFacilities` | 서울역, 서울역 버스터미널, 용산구청 |
| `nearbyLandmarks` | 서울역 광장, 용산전자상가 |
| `installLocations` | 1건 — label `서울역`, 동일 주소·동일 좌표 |
| `operatingHours` | 05:00 ~ 01:00 (20시간) |

**위치 단서 해석 (텍스트만):**

- 주소·`installLocations` 모두 **서울역 공항철도 역사** (한강대로 405). 인천공항 터미널 주소가 아님.
- 좌표는 서울역(용산) 일대. 인천공항 T1/T2(대략 37.45, 126.45)와는 다름.
- “승강장 / 대합실 / 출입국장 인접”을 구분하는 **더 세분 필드는 없음.** 역사 내부인지(승강장 vs 통로)까지는 주소 문자열만으로는 확정 불가.
- 출입국·세관·터미널 게이트를 가리키는 문구는 주소 필드에 없음.

---

## 2. 카탈로그 문구 전문

**name:** 공항철도 서울역 디지털사이니지 광고  
**nameEn:** (없음)

**description:**

> 서울역 공항철도 역사에 설치된 대형 디지털사이니지 매체입니다. 인천공항과 서울 도심을 연결하는 공항철도의 주요 거점 역사로, 하루 평균 수십만 명의 이용객이 지나가는 고효율 실내 DOOH 매체입니다. 공항 이용객과 비즈니스·관광객 타겟에게 효과적인 노출이 가능합니다.

**effectMemo:**

> 서울역 공항철도 디지털사이니지는 인천공항과 서울 도심을 연결하는 공항철도의 핵심 거점 역사에 위치한 대형 디지털사이니지입니다. 공항 이용객과 비즈니스·관광객에게 높은 노출 효과를 제공하며, 실내 환경에서 안정적인 광고 송출이 가능한 프리미엄 DOOH 매체입니다.

**priceNote:** 월 600만원~1,000만원 (VAT 별도) / 기기별 상이

**taxonomy**

- `mediaMainCategory` = `transit`
- `mediaSubCategory` = `subway_station` → 메트릭 분류 `subway_psd` (월 impressions cap 15M)
- `subCategory` = 공항철도 디지털사이니지
- `mediaCategory` = `transit`, `subway_station`, `airport_rail`, `subway`
- `type` = digital
- 규격: width/height 문자열 `9`/`5`, `widthM`/`heightM` = 9m × 5m

**tags** (등록 배열 그대로):

서울역 공항철도, 공항철도 디지털사이니지, 서울역 DS, 인천공항 철도 광고, 공항 이용객 타겟, 서울역 실내 DOOH, 인천, 공항, 버스, 디지털, 사이니지, 대형, 광장, 서울역, 서울역 (1호선, 4호선, 경의중앙선, 공항철도), 서울역 광장, 용산전자상가, 서울역 버스터미널, 용산구청, 서울, 용산구

태그 중 `인천`/`공항`/`버스`/`광장`은 nearby 문자열에서 따라온 잡음으로 보이며, **설치 장소가 인천공항 터미널이라는 근거는 아님.** 타겟 카피(“공항 이용객”)와 설치 장소(“서울역 공항철도 역사”)는 구분해야 함.

---

## 3. 이미지 자산 경로 (파일만 나열, 열어보지 않음)

대표 `image` + `extractedImages` 3건. 파일명은 디코딩 시 `(2026.ver)_공항철도 디지털사이니지(DS) 매체제안서.014|.015|.016.jpeg` — **현장 사진이 아니라 제안서 슬라이드 추출본**일 가능성이 큼. `hasProposal` = false, `proposalUrl`/`proposalFileName` = null.

1. `https://tkad-cdn.b-cdn.net/(2026.ver)_%E1%84%80%E1%85%A9%E1%86%BC%E1%84%92%E1%85%A1%E1%86%BC%E1%84%8E%E1%85%A5%E1%86%AF%E1%84%83%E1%85%A9%20%E1%84%83%E1%85%B5%E1%84%8C%E1%85%B5%E1%84%90%E1%85%A5%E1%86%AF%E1%84%89%E1%85%A1%E1%84%8B%E1%85%B5%E1%84%82%E1%85%B5%E1%84%8C%E1%85%B5(DS)%20%E1%84%86%E1%85%A2%E1%84%8E%E1%85%A6%E1%84%8C%E1%85%A6%E1%84%8B%E1%85%A1%E1%86%AB%E1%84%89%E1%85%A5.016.jpeg`
2. `https://tkad-cdn.b-cdn.net/(2026.ver)_%E1%84%80%E1%85%A9%E1%86%BC%E1%84%92%E1%85%A1%E1%86%BC%E1%84%8E%E1%85%A5%E1%86%AF%E1%84%83%E1%85%A9%20%E1%84%83%E1%85%B5%E1%84%8C%E1%85%B5%E1%84%90%E1%85%A5%E1%86%AF%E1%84%89%E1%85%A1%E1%84%8B%E1%85%A5%E1%86%AB%E1%84%89%E1%85%A5.015.jpeg`
3. `https://tkad-cdn.b-cdn.net/(2026.ver)_%E1%84%80%E1%85%A9%E1%86%BC%E1%84%92%E1%85%A1%E1%86%BC%E1%84%8E%E1%85%A5%E1%86%AF%E1%84%83%E1%85%A9%20%E1%84%83%E1%85%B5%E1%84%8C%E1%85%B5%E1%84%90%E1%85%A5%E1%86%AF%E1%84%89%E1%85%A1%E1%84%8B%E1%85%A5%E1%86%AB%E1%84%89%E1%85%A5.014.jpeg`

(1번은 `image`와 `extractedImages[0]`가 동일 URL)

---

## 4. 등록·수정·담당자

| 필드 | 값 |
|---|---|
| `createdAt` | 2026-07-15T13:27:31.966Z |
| `updatedAt` | 2026-08-20T16:44:10.693Z |
| `ownerUserId` | **null** (등록 담당자 계정 없음) |
| `ownerUser` | 없음 |

어드민 경로: `/admin/media/cmrm47dry00010ahtq1bssgdg`  
공개 검색명: `공항철도 서울역 디지털사이니지 광고`

---

## 5. 메트릭·검토 상태 (참고, 미변경)

| 필드 | 값 |
|---|---|
| impressions | 10,500,000 |
| dailyFootfall | 350,000 |
| cpm / price | 571 / 6,000,000 |
| isActive | true |
| reviewStatus | clean |
| reviewReason | null |
| flaggedAt | null |

airport cap(10M) 초과, subway_psd cap(15M) 이하 — **분류가 subway이면 위반 아님, airport이면 위반.**

---

## 6. 결론 (A / B / C)

**A. 철도역 내부(서울역 AREX 역사) 매체 — 현재 `subway_station` / `subway_psd` 유지, 조치 없음.**

근거:

1. 주소가 **서울 용산구 한강대로 405 서울역 공항철도 역사**로 명시. 인천공항 터미널·출입국장이 아님.
2. GPS가 서울역. 공항 터미널 좌표가 아님.
3. description / effectMemo가 “서울역 공항철도 **역사**에 설치”, “인천공항과 서울을 **연결하는** 공항철도의 거점 역사”. 공항 **이용객 타겟**은 카피이지, 설치 장소가 공항 터미널이라는 뜻이 아님.
4. 세부분류 `airport_rail` + `subway_station` — AREX(공항철도) 역사 매체로 등록된 상태와 일치.

**하지 않은 것**

- `reviewStatus` flagged 미적용 (B/C가 아님)
- Phase B A/B/C·E 트랙에 이 ID를 추가하지 않음
- `classifyForMetricsWrite` / `classifyMedia` 미수정
- impressions / dailyFootfall 미변경
- 이미지 파일을 열어 현장 확인하지 않음 (제안서 JPEG 경로만 기록)

**사람이 추가로 볼 필요가 있는 경우 (이번 결론을 뒤집는 조건만):**

제안서 슬라이드(.014–.016)에 **인천공항 터미널 내부 설치**가 찍혀 있고, 주소 필드가 잘못 들어간 것이 확인되면 B로 재분류. 카탈로그 텍스트·좌표만으로는 그 가능성은 낮음.

승강장 vs 대합실 세분은 이 건의 cap 판단에 불필요 — 둘 다 철도역 내부(A)다.
