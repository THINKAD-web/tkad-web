# PR1a Step 1 — 선행 조사 보고

**작성일**: 2026-09-01  
**DB**: Neon production (PR0 반영 후)  
**브랜치**: 미착수 (`feat/pr1a-catalog-channel` — Step 1 승인 후 생성)  
**성격**: SELECT + 정적 분석만. **코드·스키마 변경 없음.**

---

## Executive summary

| 조사 | 결과 | Step 2 진행 |
|------|------|-------------|
| 1-1 A2/A3/A3b 영향 | 저장 JSON **0건 참조**(prod). 필터 URL **이탈 없음**(현재 structured sub NULL). `vehicle_wrap` **기존 값**(prod 4건). | ✅ |
| 1-2 「디지털」 단독 라벨 | **15+ 사용자 노출 지점** 식별 (displayMode 축 위주). PDF/PPTX 포함. | ✅ |
| 1-3 `catalog_channel` 암묵 로직 | **6개 서브시스템** — 대부분 PR5/PR1b 범위. PR1a에서 browse `main=digital` 특수분기만 정리 후보. | ✅ |
| 1-4 백필 map 재확인 | **889건**, map 9종+NULL 4건 **일치**. map 외 main **0건**. `main=digital` **0건**. | ✅ |

**판정**: Step 1 기준 **이상 없음**. Step 2 코드 작성 **승인 대기**.

---

## 1-1. A2 / A3 / A3b 데이터 정정 영향 (4건)

### 원본 값 (prod, 2026-09-01 — 롤백 리터럴용)

| ID | name | slug | type | media_main_category | media_sub_category | sub_category (free) |
|----|------|------|------|---------------------|--------------------|---------------------|
| **A2** `cmr9xedzi000a04layhba2ulc` | 택배카보드 차량 광고 | *(empty)* | `mobile` | **NULL** | **NULL** | 택배카보드 광고 |
| **A3** `cmrap3eo4000004jv8b2tt90v` | 신사 BK빌딩 LED 전광판 | *(empty)* | `dooh` | **NULL** | **NULL** | 디지털 전광판 |
| **A3** `cmrn711g8000404ib3hct4qpy` | 성신여대입구역 강북미디어빌딩 전광판 | *(empty)* | `dooh` | **NULL** | **NULL** | 빌딩 전광판 |
| **A3b** `cmtd4wpic000004ic5oeqzdxq` | 서울 지하철 1~4호선 사각기둥 | *(empty)* | `static` | **NULL** | **NULL** | 지하철 사각기둥 |

**정정 후 (§3.2)**:

| ID | catalog_channel | main | sub | displayMode |
|----|-----------------|------|-----|-------------|
| A2 | offline | transit | **vehicle_wrap** | mobile |
| A3 ×2 | offline | ooh | digital_signage | dooh |
| A3b | offline | transit | subway_station | static |

### 저장된 사용자 데이터 참조

| 저장소 | 4건 중 참조 |
|--------|-------------|
| `user_saved_plans` | **0** |
| `saved_plan_carts` | **0** |
| `saved_planner_plans` | **0** |
| `campaign_plans.media_mix` | **0** |
| `saved_campaign_proposals` | **0** |

**Preview vs prod 차이**: PR0 preview 조사에서 `cmrap3eo…` → `mannote@naver.com` saved plan 1건이 있었으나, **prod 동일 user(`cmo6th4ef…`)에는 해당 mediaId 없음**. companion JSON migration **불필요**.

**mainCategory / subCategory / mediaMainCategory / mediaSubCategory 스냅샷**:

| 필드 | prod row count |
|------|----------------|
| `user_saved_plans.items` → `mainCategory` | **0** |
| `user_saved_plans.items` → `subCategory` | **0** |
| `user_saved_plans.items` → `mediaMainCategory` | **0** |
| `saved_plan_carts.items` → `mainCategory` / `subCategory` | **0** |

→ A2/A3/A3b 정정에 따른 **JSON companion SQL 불필요**. `mediaId` 참조만 있고 browse 축은 스냅샷하지 않음.

### 필터 URL 영향

필터는 **`media_sub_category`** (structured) 기준 — `lib/public-media-query.ts`, `lib/media-discovery-client-filter.ts`.  
4건 모두 **현재 `media_sub_category IS NULL`** → structured `?subCategory=` 필터 결과에 **원래 포함되지 않음**.

| 정정 후 필터 | 변화 |
|--------------|------|
| `?subCategory=digital_signage` | **+2건** (A3 ×2) — 필터에 **새로 등장** |
| `?subCategory=vehicle_wrap` | **+1건** (A2) |
| `?subCategory=subway_station` | **+1건** (A3b) |

**이탈(기존 URL에서 빠짐) 케이스 없음.** free text `sub_category`(「디지털 전광판」 등)는 URL 파라미터가 아님.

**매체 상세 URL**: 4건 모두 **`slug` empty** → `/ko/media/{id}` 경로. slug 변경 없음 → **영향 없음**.

**색인/북마크 규모**: structured sub 필터에서의 **가시성 개선**이지, 기존 북마크 URL 붕괴는 아님. SEO sitemap은 slug 기반 — 4건 slug 없어 영향 미미.

### `vehicle_wrap` 신규 값 여부

**기존 값.** prod `media_sub_category='vehicle_wrap'`: **4건** (A2 제외).  
`lib/media-browse-categories.ts` transit subs에 **`vehicle_wrap` / 「차량 래핑」** 이미 정의.  
추가 UI 매핑 **불필요** — A2만 NULL → vehicle_wrap 으로 들어감.

---

## 1-2. 「디지털」 단독 라벨 노출 인벤토리

PR1a 목표: **단독 「디지털」 제거** → 축별 수식어(디지털 표출 / 온라인 광고 / 디지털 사이니지 등).

### A. displayMode 축 (`Media.type` / `PlannerCategory` — PR1a 변경 대상)

| 지점 | 파일 | 현재 라벨 | 축 |
|------|------|-----------|-----|
| Legacy planner toggles | `messages/ko.json` → `planner.catDigital` | **「디지털」** | PlannerCategory |
| Legacy planner UI key | `planner-page-client.tsx:216` | key `"digital"` (label 위) | PlannerCategory |
| Planner TYPE_META | `lib/planner-logic.ts:858` | `labelKo: "디지털"` | displayMode |
| 시나리오 생성 | `lib/planner/generate-scenarios.ts:224,279` | `"디지털"` | displayMode |
| 플랜 카트 보고서 정렬 | `lib/plan-cart-report/sort-portfolio.ts:20` | `"디지털"` | displayMode |
| 플랜 카트 보고서 빌드 | `lib/plan-cart-report/build-report.ts:138` | `"디지털"` | displayMode |
| 네트워크 핀/칩 | `lib/media-network-types.ts:33,175` | `"디지털"` | displayMode (network catalog type) |
| 지도 핀 | `lib/map-pin-icon-data.ts:67` | `"디지털"` | displayMode |
| AI 추천 리포트 | `lib/recommend/recommend-report-adapter.ts:132`, `recommend-rationale.ts:198` | `"디지털"` | displayMode |
| UI 추천 섹션 | `components/recommend/recommend-report-section.tsx:168` | `digital: "디지털"` | displayMode |
| 캠페인 모니터링 지도 | `components/campaign-monitoring-map.tsx:27` | `digital: "디지털"` | displayMode (legacy key) |
| Admin 매체 type select | `admin-medias-client.tsx:2464` | `"디지털"` | displayMode |
| 매체 등록 폼 | `media-register-form.tsx:246` | `"디지털"` | displayMode |
| fixture enrich (데모) | `lib/media-data.ts:1012` | tag `"디지털"` | displayMode (fallback only) |

### B. 제안서·보고서 생성물 (PDF / PPTX — **고객-facing**)

| 지점 | 파일 | 현재 |
|------|------|------|
| OOH PDF categoriesText | `lib/planner-report-export/payload-ooh.ts`, `render-distribution-map.ts:165` | **「디지털」** |
| PPTX 매체 유형 행 | `build-pptx.ts:441` | `categoriesText` 경유 |
| PDF 매체 유형 행 | `build-pdf.ts:497` | 동일 |
| 통합 제안서 | `payload-integrated.ts:65,77` | **「디지털」**, 「디지털 CPM」 |
| 플래너 report UI | `components/planner/report-document.tsx` | 「디지털 예산 배분」 등 (**통합/온라인 혼합 문맥** — catalog_channel 축) |

### C. catalog_channel / browse main 축 (PR1a·PR1b)

| 지점 | 파일 | 현재 | PR |
|------|------|------|-----|
| Browse main chip | `lib/media-browse-categories.ts:161-162` | main `digital` → **「디지털/온라인」** | PR1b rename → `online` / 「온라인 광고」 |
| Client filter special case | `lib/media-discovery-client-filter.ts:133-136` | `mainCategory=digital` + network type | PR1a 후보 정리 |

### D. 이미 수식어 붙음 / 변경 불필요

| 지점 | 라벨 | 축 |
|------|------|-----|
| `lib/media-keyword-landing.ts` | 「디지털 **사이니지**」 | SEO type landing |
| `lib/media-categories.ts` | 「디지털 **사이니지 (DOOH)**」 | legacy SEO tree |
| `lib/recommend/recommend-rationale.ts:169` | 「디지털 **사이니지**」 | rationale |
| 카드 `typeLabels.dooh` | **「DOOH」** (단독 디지털 아님) | `lib/media-data.ts:1054` |

### E. Admin mock / 비고 (우선순위 낮음)

`app/.../analytics/page.tsx`, `media-hub/page.tsx` — 하드코oded demo rows `"type": "디지털"`. 실카탈로그 아님.

---

## 1-3. `catalog_channel` 암묵적 온라인 판단 (산재 조사)

| 위치 | 현재 판단 방식 | PR1a 통일 여부 |
|------|----------------|----------------|
| `lib/planner/digital-catalog-bridge.ts` | dmpilot BFF → `DIGITAL_CHANNELS` bucket | **PR5** (통합 플래너) |
| `lib/planner/recommend-digital.ts` | static/live channel benchmarks | **PR5** |
| `lib/planner/brief/brief-integrated-adapters.ts` | `BriefChannelMode: ooh_only \| ooh_digital` | **PR5** |
| `lib/home-landing-media-grid.ts` | `fetchDigitalCatalogInternal()` | **PR1b** (online grid) |
| `lib/media-discovery-client-filter.ts:133` | `mainCategory===digital` → network rows | **PR1a 후보** — `catalog_channel=online` 로 대체 예정 (PR1b 시) |
| `lib/recommend/recommend-rationale.ts:168` | `mediaMainCategory === "digital"` | **PR1a** — dead branch (prod 0건) 제거/주석 |
| `lib/integrated/run-integrated-mix.ts` | digital channel count ≥3 | **PR5** |

**결론**: tkad-web 카탈로그 DB row에 대한 `catalog_channel` **암묵 판단은 현재 없음** (전부 offline). 온라인은 **외부 catalog bridge / brief mode / static channels** 로만 존재. PR1a는 **`media.catalog_channel` 컬럼 백필 + NOT NULL** 이 SSOT 시작점.

---

## 1-4. 백필 대상 prod 재확인 (PR0 이후)

### media.type (PR0 반영 확인)

| type | cnt |
|------|-----|
| dooh | 641 |
| static | 200 |
| mobile | 48 |
| **합계** | **889** |

### media_main_category 분포

| main | cnt |
|------|-----|
| transit | 382 |
| ooh | 382 |
| shopping | 73 |
| shelter | 29 |
| entertainment | 12 |
| **NULL** | **4** |
| lifestyle | 3 |
| culture | 3 |
| etc | 1 |

**map 외 값**: **0건**  
**building / education / network / digital / online**: 각 **0건** (map include 유지)

### §3.1 explicit map 검증

- 889 = 382+382+73+29+12+3+3+1+4 ✅
- NULL 4건 = A2+A3×2+A3b ✅
- **미매칭 EXCEPTION 설계 그대로 적용 가능**

### PR1a 종료 시 기대 counts

```
catalog_channel='offline'  → 889
catalog_channel='online'   → 0
catalog_channel IS NULL    → 0
```

---

## 1-5. `PlannerCategory.dooh` vs `Media.type='dooh'` (Step 2-5 선행 확인)

`resolvePlannerMediaKind()` (`lib/planner-logic.ts:142-166`):

1. **1순위**: `Media.type` → `normalizeMediaTypeForPlanner()` (`digital` alias → `dooh`)
2. **2순위**: `mediaSubCategory` / free `subCategory` heuristic
3. **`mediaMainCategory`는 planner kind에 미사용** (주석 L140)

저장된 `categories[]` = **사용자 필터 선택 스냅샷**. hydrate 시 `normalizePlannerCategories()` (PR0 후 `dooh`).  
런타임 필터는 catalog item에서 **매번 `resolvePlannerMediaKind(item)`** — categories JSON은 legacy planner 경로 전용.

→ Step 2-5 문서화 초안은 지시서 §2.5 그대로 적용.

---

## Step 2 착수 전 체크리스트 (승인용)

- [ ] A2/A3/A3b 롤백 리터럴 — 본 문서 §1-1 표 사용
- [ ] JSON companion — **불필요** (prod 0 참조, 스냅샷 필드 0)
- [ ] 필ter URL — **이탈 없음**, structured 필터 **+4건 가시성**
- [ ] `vehicle_wrap` — 기존 taxonomy, UI 추가 불필요
- [ ] 백필 map — prod **변화 없음**, EXCEPTION 조건 충족
- [ ] 라벨 — §1-2 인벤토리 **~20 지점** PR1a에서 일괄 변경
- [ ] 브랜치 `feat/pr1a-catalog-channel` 생성 후 Step 2

---

## 대기

**Step 1 완료. Step 2 코드 작성은 승인 후 진행.**
