# PR0 Prod Migration Report

**Date**: 2026-09-01 18:19 KST  
**Merge**: `51bc14a6` — [PR #514](https://github.com/THINKAD-web/tkad-web/pull/514) merged  
**DB**: Neon production (`ep-holy-cloud-ah6w4cml`)  
**Script**: `scripts/migrations/pr0-preview-migrate-combined.sql`  
**Status**: ✅ Complete

---

## Neon backup (rollback safety net)

| Field | Value |
|-------|-------|
| Branch name | `pr0-pre-migrate-20260901` |
| Branch ID | `br-hidden-resonance-auxt7n2v` |
| Parent | `production` (`br-steep-hill-au7i1n7m`) |
| Created | 2026-09-01T09:18:05Z |
| Project | `nameless-shadow-36255941` |

Point-in-time snapshot **before** any prod writes. Use Neon console restore if rollback script is insufficient.

---

## Pre / Post counts (same session)

**Log**: `reports/pr0-prod-migration-log.json`

| Metric | PRE | POST | Δ expected |
|--------|-----|------|------------|
| `media.type = digital` | **641** | **0** | −641 ✅ |
| `media.type = dooh` | 0 | **641** | +641 ✅ |
| `user_saved_plans` rows w/ `mediaType: digital` | **11** | **0** | −11 ✅ |
| `user_saved_plans` rows w/ `mediaType: dooh` | 0 | **11** | +11 ✅ |
| `saved_planner_plans` w/ categories `digital` | **7** | **0** | −7 ✅ |
| `saved_planner_plans` w/ categories `dooh` | 0 | **7** | +7 ✅ |

**SQL execution** (single transaction):

```
BEGIN
NOTICE  PR0 pre: media.digital=641, user_saved_plans.mediaType=11, saved_planner_plans.categories=7
UPDATE 641   (media)
UPDATE 11    (user_saved_plans)
UPDATE 7     (saved_planner_plans)
NOTICE  PR0 post: media.dooh=641, digital_left=0, json_cart=0, json_plan=0
COMMIT
```

Preview vs prod JSON scope: preview had **8** cart users / **7** planner rows — prod **11** / **7** (cart snapshots differ; planner count matched).

---

## Price diff (30 samples, prod)

**Artifacts**: `reports/pr0-prod-price-{pre,post,diff}.json`, `reports/pr0-prod-sample-ids.json`

| Item | Value |
|------|-------|
| Total calc rows | 90 (30 media × 3 scenarios) |
| Mismatches | **0** |
| `subway_station` in sample | **12** IDs (prod-only axis; preview had 112 vs prod 166) |
| Sample type mix (30 ids) | dooh 21 · static 5 · mobile 4 (post-migration types) |

641건 `UPDATE media` 경로는 이번 prod 실행으로 **최초 검증 완료**.

---

## Legacy alias hit count (post-deploy observation)

배포 후 prod 런타임에서 `normalizeCatalogMediaType("digital")` 호출 시:

```
[catalog-media-type] legacy alias digital→dooh { raw, hits }
```

**모니터링**:

1. Vercel → tkad-web → Logs → filter `legacy alias digital→dooh`
2. 또는 API route에서 `getLegacyCatalogMediaTypeAliasHitCount()` 노출 시 주기 확인
3. **2027-03-01** alias 제거 판단: 월별 hit ≈ 0 sustained

Merge 후 main 자동 배포 — alias 로그는 배포 반영 이후부터 누적.

---

## Rollback options

1. **Preferred for unknown failure**: Neon branch `pr0-pre-migrate-20260901` → restore / swap
2. **Script**: `scripts/migrations/rename-media-type-digital-to-dooh-rollback.sql` (641 media + 11 JSON cart + 7 planner)

---

## PR1a readiness

Prod PR0 complete. Inputs ready:

- `catalog_channel` / `CatalogChannel` / `offline | online`
- §3.1 explicit map (9 mains + 0-count 3, EXCEPTION on unknown)
- §3.2 NULL 4건 per-row
- A2·A3 data changes (3 rows, original values preserved + rollback)
- Label cleanup (no standalone 「디지털」)
- **New PR1a investigation**: A2/A3 `main_category`/`sub_category` changes affect filter URLs (`?subCategory=vehicle_wrap` etc.) — index + saved plan refs

---

## Next

- [ ] Manual UI spot-check on prod (optional, same 3-account checklist as preview)
- [ ] PR1a instruction doc from Jaehan
