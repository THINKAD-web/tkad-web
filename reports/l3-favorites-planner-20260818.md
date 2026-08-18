# L-3 조사 — 찜(관심 매체) ↔ 플래너 연동 (2026-08-18)

## 1. 저장 위치 비교

| 기능 | 저장소 | 키/테이블 | 비고 |
|------|--------|-----------|------|
| **찜(하트)** | DB (로그인) / localStorage (게스트) | `/api/my/favorite`, `lib/favorites-client.ts` | 매체 ID 목록만 |
| **플래너 mix (6c)** | localStorage | `tkad-planner-brief-v1` → `mixUnits` | 브리프와 함께 persist |
| **담은 매체 (plan cart)** | localStorage | `tkad_plan_cart` (`lib/plan-cart.ts`) | 구 플래너·견적·마이페이지 cart |

→ **세 시스템 모두 별도.** 찜 ≠ 플래너 mix ≠ plan cart.

---

## 2. 마이페이지 / 찜 → 플래너 동선

| 진입점 | 동선 | 단계 |
|--------|------|------|
| `/my` 찜 탭 | CTA `favorites.plannerCta` → `buildPlannerHrefWithMediaIds(ids)` → `/planner?mediaIds=...` | **1클릭** |
| `/media/favorites` | 동일 `plannerHref` 버튼 | **1클릭** |

**문제**: 6c 새 플래너는 **`?mediaIds=` 쿼리를 읽지 않음** (구 6단계 `planner-page-client.tsx`만 처리).  
→ 링크는 있으나 **6c에서 prefill 미동작** — 사용자 입장에선 “플래너 갔는데 찜 매체 안 담김”.

compare 페이지·마이 hub도 동일 href 패턴.

---

## 3. 개선 방향 (별도 PR 권장)

L-1 규모로 #403에 mixSession만 우선. L-3는 **후속 PR**:

1. **P0**: `/planner?mediaIds=` → Step 2 진입 시 mix에 자동 추가 (구 플래너 parity)
2. **P1**: Step 2 「찜한 매체 N개 원클릭 추가」 (로그인/게스트 favorites fetch)
3. **P2**: plan cart (`tkad_plan_cart`)와 mix 통합 여부 — 제품 결정 필요

---

## 4. 이번 PR (#403) 범위

**L-3 미포함** — L-1·L-2만 #403에 반영.
