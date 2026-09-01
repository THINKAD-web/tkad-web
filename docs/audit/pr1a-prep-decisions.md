# PR1a/PR1b 준비 — 확정 결정·A1–A7 판정·컬럼명

**작성일**: 2026-09-01  
**전제**: Step B **안 1** 확정 · PR0 prod 반영 **후** PR1a 착수  
**성격**: 설계 확정 + 판정 (코드·DB 변경 없음)

---

## 0. 확정된 로드맵

| # | PR | 내용 | 위험 |
|---|-----|------|------|
| 0 | PR0 | `Media.type` digital → dooh | 진행 중 (Preview migration 대기) |
| **1a** | PR1a | **`catalog_channel` 축** + 889건 백필 + **displayMode 라벨** + browse `main=digital` 정리 | **중~상** |
| **1b** | PR1b | `online` catalog + `media_online_spec` + RETAIL sub | **하** |
| 2 | PR2 | PricingStrategy — **`catalog_channel` 기준** (offline=FixedPeriod, online=Budget) | 상 |
| 3 | PR3 | 온라인 23건 시드 이관 | 하 |
| 4 | PR4 | 카탈로그·필터 facet 분기 | 중 |
| 5 | PR5 | 통합 플래너 로컬 전환 | 중 |
| 6 | PR6 | dmpilot 폐기·301·M2M 제거 | 중 |

**PR1a / PR1b 분리 이유**: 1a는 기존 641+건 **변경**, 1b는 **순수 추가** — 회귀 시 원인 분리 (PR0와 동일 원칙).

**PR2 확정**: PricingStrategy 분기 = **`catalog_channel`** (`offline` | `online`). mainCategory 분기 아님.

---

## 1. 컬럼명 확정 — `catalog_channel`

### 1.1 기존 `channel` 계열 식별자 (충돌 조사)

| 식별자 | 위치 | 의미 | 값 |
|--------|------|------|-----|
| **`channelType`** | `lib/recommend/channel-type.ts:2-8` | Recommend UI / mix meta | `ooh` \| `digital` \| `integrated` |
| **`BriefChannelMode`** | `lib/planner/brief/brief-integrated-adapters.ts:20-25` | Brief OOH-only vs mixed | `ooh_only` \| `ooh_digital` |
| **`DIGITAL_CHANNELS`** | `lib/planner/digital-channels.ts:57-208` | Platform bucket (7개) | `naver`, `meta`, … |
| **`channelType: "integrated"`** | `lib/integrated/schemas.ts:9` | BFF mix meta | literal |
| **`AdChannel` / `product.channel`** | dmpilot `prisma/schema.prisma` · RFP | 온라인 **집행 채널** enum | `INSTAGRAM`, `NAVER_SA`, … |
| **`channelInterest`** | dmpilot `lib/rfp/types.ts:19` | RFP SNS/SEARCH | `SNS` \| `SEARCH` \| `BOTH` |
| **`CampaignReport.channelRows`** | admin report view-model | 리포트 표 행 | — |
| **`utmMedium`** | `prisma/schema.prisma` (Marketing) | UTM — **`medium` 사용 불가** | — |

**prod `Media` 테이블**: `channel` 컬럼 **없음** (신규 greenfield).

### 1.2 결론

| 레이어 | 채택 이름 | 값 |
|--------|-----------|-----|
| **DB 컬럼** | **`catalog_channel`** | `offline` \| `online` |
| **TS / Prisma field** | **`catalogChannel`** | `CatalogChannel` type |
| **URL (PR4)** | `?catalogChannel=offline\|online` | browse top facet |

**`channel` 단독 사용은 권장하지 않음** — `channelType`(플래너 UX)·`DIGITAL_CHANNELS`(platform)·dmpilot `AdChannel`(product)과 **동음이의 3중 충돌**. 짧게 쓰려면 반드시 **`catalogChannel`** / **`CatalogChannel`** 네임스페이스 고정.

`channelGroup` / `medium` — 코드베이스 관례 없음 + `utm_medium`과 혼동 → **기각**.

---

## 2. A1–A7 판정 (PR1a 매핑 테이블 입력)

### A1 — 지하철 역사 × 디지털 표출 (166건)

**대표**: `cmoifvxb6000604jxmw7b3ov7` — 지하철 2호선 강남역 아트캔버스 · `type=digital` · `main=transit` · `sub=subway_station`

| 축 | 판정 |
|----|------|
| **`catalog_channel`** | **`offline`** |
| **`media_main_category`** | **`transit` 유지** (변경 없음) |
| **`media_sub_category`** | **`subway_station` 유지** |
| **displayMode** (구 PlannerCategory) | **`dooh`** (`type`/`resolvePlannerMediaKind` — PR0 후 `dooh`) |

**해석**: 정상 3축 교차. **버그 아님.** 안 1이 존재 이유를 증명하는 **대표 패턴**.

---

### A2 — 택배카보드 (1건)

**레코드**: `cmr9xedzi000a04layhba2ulc` — `type=mobile` · main/sub **null** · `sub_category=택배카보드 광고`

| 축 | 판정 |
|----|------|
| **`catalog_channel`** | **`offline`** |
| **`media_main_category` 백필** | **`transit`** — 차량/물류 이동 매체 (`bus_exterior`/`vehicle_wrap` 계열과 동급) |
| **`media_sub_category` 백필** | **`vehicle_wrap`** (택배차 래핑) |
| **displayMode** | **`mobile`** |

**PR1a 데이터 수정**: main/sub null → **명시 백필** (channel migration과 동일 트랜잭션). 사용자 노출 **변화 없음** (이미 「이동형」).

---

### A3 — browse taxonomy 미기입 DOOH (2건)

| id | name | type | sub_category (free) |
|----|------|------|---------------------|
| `cmrap3eo4000004jv8b2tt90v` | 신사 BK빌딩 LED 전광판 | digital→dooh | 디지털 전광판 |
| `cmrn711g8000404ib3hct4qpy` | 성신여대입구역 강북미디어빌딩 전광판 | digital→dooh | 빌딩 전광판 |

| 축 | 판정 |
|----|------|
| **`catalog_channel`** | **`offline`** |
| **`media_main_category` 백필** | **`ooh`** |
| **`media_sub_category` 백필** | **`digital_signage`** |
| **displayMode** | **`dooh`** |

---

### A3b — NULL main 추가 1건 (A3 목록 확장)

**레코드**: `cmtd4wpic000004ic5oeqzdxq` — 서울 지하철 1~4호선 사각기둥 · `type=static` · main null

| 축 | 판정 |
|----|------|
| **`catalog_channel`** | **`offline`** |
| **`media_main_category` 백필** | **`transit`** |
| **`media_sub_category` 백필** | **`subway_station`** (지하철 사각기둥 = 역사 매체) |
| **displayMode** | **`static`** |

---

### A4 — `entertainment/streaming` sub (0건)

| 판정 |
|------|
| **PR1a 액션 없음** — prod 0건. PR1b에서 online **`streaming`** sub 예약 시 browse `entertainment/streaming`(OOH)과 **slug 분리** (`online_streaming` 등) 문서화만. |

---

### A5 — RETAIL 2건 (당근·배민) — **PR1b**

| slug | platform | mediaType |
|------|----------|-----------|
| `karrot-local-traffic` | Karrot (당근) | RETAIL |
| `baemin-ad-visit` | Baemin | RETAIL |

**판정 (PR1b)**:

| 축 | 값 |
|----|-----|
| **`catalog_channel`** | **`online`** |
| **`media_main_category`** | **`online`** (PR1b 신규 main — browse `digital` rename) |
| **`media_sub_category`** | **`local_retail`** (**신규 sub**) — search/display/social 어디에도 안 맞음 |
| **노출 라벨** | **「로컬·리테일」** (「디지털」 단독 금지) |

**근거**: 하이퍼로컬/푸드딜리버리는 SA/DA/SNS 축과 직교. 2/23이므로 **억지 매핑보다 sub 신설이 정직**.

---

### A6 — Legacy planner UI `key:"digital"` (코드)

**위치**: ```212:218:app/[locale]/(site)/planner/planner-page-client.tsx```

| 판정 |
|------|
| **PR1a**: UI key → **`dooh`**, 라벨 → **「디지털 표출」**. `toggleCategory` 저장값 **`dooh`/`static`/`mobile`** only. |
| **saved JSON**: companion migration `categories digital→dooh` **유지** (PR0 SQL). |

---

### A7 — `user_saved_plans.items[].mediaType` (21 line items)

| 판정 |
|------|
| **PR1a**: `mediaType: digital` → **`dooh`** (PR0 companion SQL). |
| **PR1b 이후**: 신규 cart line에 **`catalogChannel`** 필드 추가 **검토** (PR1b scope — snapshot 2D). PR1a에서는 OOH-only이므로 **`catalogChannel=offline` implicit**. |

---

## 3. PR1a 백필 매핑 테이블 (명시적 — 부정 조건 금지)

### 3.1 `catalog_channel` ← `media_main_category`

Migration SQL은 **아래 테이블만** 허용. **매칭 실패 시 RAISE EXCEPTION**.

| `media_main_category` | `catalog_channel` | prod cnt |
|------------------------|-------------------|----------|
| `ooh` | `offline` | 382 |
| `transit` | `offline` | 382 |
| `shopping` | `offline` | 73 |
| `shelter` | `offline` | 29 |
| `entertainment` | `offline` | 12 |
| `lifestyle` | `offline` | 3 |
| `culture` | `offline` | 3 |
| `etc` | `offline` | 1 |
| `building` | `offline` | 0 (코드 정의만 — migration include) |
| `education` | `offline` | 0 |
| `network` | `offline` | 0 |
| **`digital`** | **`online`** | **0** (PR1b 전까지 unreachable — row 0이면 no-op) |
| **`online`** | **`online`** | 0 (PR1b) |
| **`__NULL__`** | — | **4** → §3.2 per-row |

**금지**: `WHERE main != 'online'` 같은 부정 규칙.

### 3.2 NULL `media_main_category` (4건) — per-row

| media id | catalog_channel | main 백필 | sub 백필 |
|----------|-----------------|-----------|----------|
| `cmtd4wpic000004ic5oeqzdxq` | offline | transit | subway_station |
| `cmrap3eo4000004jv8b2tt90v` | offline | ooh | digital_signage |
| `cmrn711g8000404ib3hct4qpy` | offline | ooh | digital_signage |
| `cmr9xedzi000a04layhba2ulc` | offline | transit | vehicle_wrap |

### 3.3 `displayMode` (애플리케이션层 — PR1a)

DB 컬럼 **신규 여부는 PR1a 지시서에서 결정**. 초기 구현은 **`Media.type` (`dooh`/`static`/`mobile`) = displayMode** 1:1 mapping + planner `resolvePlannerMediaKind` 정렬.

| `Media.type` (canonical) | displayMode | 노출 라벨 |
|--------------------------|-------------|-----------|
| `dooh` | dooh | **디지털 표출** |
| `static` | static | **인쇄물** |
| `mobile` | mobile | **이동형** |

Online (PR1b): displayMode **NULL** — adFormat axis 별도.

---

## 4. PR1a 라벨 정리 (「디지털」 단독 제거)

| 축 | 내부 토큰 | 노출 라벨 (KO) |
|----|-----------|----------------|
| Catalog channel | `offline` | **옥외광고** |
| Catalog channel | `online` | **온라인 광고** |
| Display mode | `dooh` | **디지털 표출** |
| Display mode | `static` | **인쇄물** |
| Display mode | `mobile` | **이동형** |
| Online format (PR1b) | `search_ad` | **검색** |
| Online format | `display_ad` | **디스플레이** |
| Online format | `social_media` | **SNS** |
| Online format | `local_retail` | **로컬·리테일** |

**제거 대상 예**: `TYPE_META.dooh.labelKo = "디지털"` ```858:858:lib/planner-logic.ts``` · browse main `label: "디지털/온라인"` ```161:163:lib/media-browse-categories.ts``` → PR1a/1b에서 분리.

---

## 5. PR1b preview — online sub 확장

| dmpilot mediaType | cnt | PR1b `media_sub_category` | 라벨 |
|-------------------|-----|---------------------------|------|
| SNS | 8 | `social_media` | SNS |
| SA | 5 | `search_ad` | 검색 |
| DA | 3 | `display_ad` | 디스플레이 |
| VIDEO | 2 | `video` (**신규**) | 영상 |
| MESSAGE | 1 | `message` (**신규**) | 메시지 |
| VERTICAL | 1 | `social_media` (TikTok) | SNS |
| NATIVE | 1 | `display_ad` | 디스플레이 |
| RETAIL | 2 | **`local_retail`** (**신규**) | 로컬·리테일 |

Browse main: code `digital` → **`online`**, label **「온라인 광고」**. `?mainCategory=digital` → 301 `online` (PR1b).

---

## 6. PR0 선행 (다음 작업)

PR1a 착수 **전** 필수:

1. PR0 Preview migration (`media.type` + JSON companion)
2. 30건 가격 전후 diff
3. Preview 경로 QA → merge → **prod migration**
4. **그 다음** PR1a 브랜치

---

## 7. PR1a 지시서 작성 가능 여부

| 선행 조건 | 상태 |
|-----------|------|
| A1–A7 판정 | **완료** (본 문서 §2–3) |
| 컬럼명 | **완료** → **`catalog_channel`** |
| PR0 prod 반영 | **대기** |

PR0 prod 반영 확인 후 PR1a 구현 지시 가능.
