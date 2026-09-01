# PR0 게이트 — 저장 JSON 점검 + `type='digital'` 분해표

**작성일**: 2026-09-01  
**조회만 수행** (prod·preview write 없음)  
**스크립트**: `scripts/audit/pr0-db-gates.mjs`

---

## 1. 저장 JSON — `Media.type` / `mediaType` 직렬화 여부

### 판정 요약

| 저장소 | prod | preview | `Media.type`/`mediaType:"digital"` | migration JSON UPDATE |
|--------|------|---------|--------------------------------------|------------------------|
| `saved_planner_plans.plan_json` | 7 rows | 7 rows | **0** (`mediaType`/`type` 없음) | 불필요 (mediaId만) |
| `saved_plan_carts.items` | 6 rows | 6 rows | **0** | 불필요 |
| `saved_plan_carts.report_summary` | 6 rows | 6 rows | **0** | 불필요 |
| `campaign_plans.media_mix` | 1 row | 0 rows | **0** (`mediaId`만) | 불필요 |
| `saved_campaign_proposals.*` | 5 rows | 5 rows | **0** | 불필요 |
| **`user_saved_plans.items`** | **11 user rows** | **8 user rows** | **21 / 14 cart line items** | **필요** |

### `user_saved_plans` 상세

- prod: **21** line items with `"mediaType":"digital"` across **11** users  
- preview: **14** line items across **8** users  
- 샘플 구조: `{ mediaId, mediaName, mediaType: "digital", region, price, ... }` — **카탈로그 `Media.type` 스냅샷**  
- `mediaId` 참조만 있는 테이블(`campaign_plans`, `saved_planner_plans`)은 **type 미저장** 확인

### 별도 — PlannerCategory `"digital"` (Media.type 아님)

| 저장소 | prod | 내용 |
|--------|------|------|
| `saved_planner_plans.plan_json.categories` | **7 / 7 rows** | 필터 선호 `["static","mobile","digital"]` 등 |

→ PR0 `PlannerCategory` rename과 정합: preview migration 시 **같은 트랜잭션에서** `categories` 배열의 `"digital"` → `"dooh"` 치환 권장 (기능상 mediaId-only보다 낮은 리스크이나 UX 일관성).

---

## 2. `media.type = 'digital'` 분해표 (prod 641건)

| main_category | sub_category | cnt | 비고 |
|---------------|--------------|-----|------|
| ooh | digital_signage | **300** | 홈 “전광판/사이니지 ~293”과 근접 (+α 레거시 null main) |
| transit | subway_station | **166** | 지하철 역사 디지털 |
| shopping | mall | 58 | |
| transit | airport | 51 | |
| shelter | digital_shelter | 12 | |
| ooh | billboard | 7 | |
| shelter | bus_shelter | 6 | |
| shopping | convenience | 6 | |
| transit | ktx_terminal | 6 | |
| entertainment | concert | 5 | |
| … | (기타 18조합) | 24 | gym, cinema, park, null legacy 등 |
| **합계** | | **641** | |

**결론**: WHERE `type = 'digital'`은 OOH 전자 표출 매체 전체(사이니지+지하철+공항+몰 등)를 의도대로 커버. 641 > 293은 **sub_category=digital_signage만이 아니라 transit/shopping 디지털面**이 포함되기 때문.

Preview 동일 패턴: **577**건 `digital` (subway_station 112 vs prod 166 — preview DB lag).

---

## 3. Preview migration 전 필수 동반 스크립트

1. `prisma/migrations/.../migration.sql` — `media.type` UPDATE  
2. `scripts/migrations/rename-media-type-digital-to-dooh-json.sql` — `user_saved_plans` + `saved_planner_plans.categories`  
3. `scripts/migrations/rename-media-type-digital-to-dooh-rollback.sql` — 역방향 (media + JSON)

---

## 4. 다음 게이트 (아직 미실행)

- [ ] Preview migration 적용  
- [ ] 동일 매체 30건 가격 계산 전후 diff (PR2 golden 예행)
