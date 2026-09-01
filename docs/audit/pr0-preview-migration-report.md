# PR0 Preview Migration Report

**Date**: 2026-09-01 (KST)  
**Branch**: `feat/pr0-media-type-dooh` · [PR #514](https://github.com/THINKAD-web/tkad-web/pull/514)  
**Target DB**: Neon preview (`.env.preview.local`)  
**Script**: `scripts/migrations/pr0-preview-migrate-combined.sql`  
**Status**: ✅ Preview migration complete — **prod not touched**

---

## Executive summary

| Gate | Result |
|------|--------|
| Single transaction (media + JSON) | ✅ COMMIT after first SQL fix |
| Post-check `RAISE EXCEPTION` | ✅ 0 `digital` rows remain |
| 30-sample price diff (3 scenarios × 30) | ✅ **90/90 identical** |
| Control group (static/mobile) | ✅ 5 static + 5 mobile in sample |
| `user_saved_plans` JSON | ✅ 8 rows → `mediaType: dooh` |
| `saved_planner_plans.categories` | ✅ 7 rows → `dooh` |
| A2/A3 media refs in saved data | ✅ 1 ref only; no filter-URL risk from PR0 |
| Saved-plan render path (4 users) | ✅ 3 clean; 1 pre-existing missing media (not PR0) |

**Recommendation**: Approve **PR merge**. Request **separate approval** before prod migration.

---

## Migration run log

### Pre-state (notable)

Preview `media.type` was **already `dooh`** (577 rows, 0 `digital`) from an earlier partial run. Remaining work was JSON companions only.

| Metric | Pre | Post |
|--------|-----|------|
| `media.type = digital` | 0 | 0 |
| `media.type = dooh` | 577 | 577 |
| `user_saved_plans` with `mediaType: digital` | 8 | 0 |
| `user_saved_plans` with `mediaType: dooh` | 0 | 8 |
| `saved_planner_plans.categories` contains `digital` | 7 | 0 |
| `saved_planner_plans.categories` contains `dooh` | 0 | 7 |

### First attempt — rolled back (expected)

```
UPDATE 8  (user_saved_plans)
ERROR: operator does not exist: text #>> unknown  (saved_planner_plans)
ROLLBACK
```

JSON cart update was rolled back with the transaction — pre-counts unchanged.

### Fix applied

`jsonb_array_elements_text` returns plain text (`digital`), not JSON strings. Corrected in:

- `scripts/migrations/pr0-preview-migrate-combined.sql`
- `scripts/migrations/rename-media-type-digital-to-dooh-json.sql`
- `scripts/migrations/rename-media-type-digital-to-dooh-rollback.sql`

```sql
CASE WHEN val = 'digital' THEN '"dooh"'::jsonb ELSE to_jsonb(val) END
```

### Second attempt — success

```
BEGIN
NOTICE  PR0 pre: media.digital=0, user_saved_plans.mediaType=8, saved_planner_plans.categories=7
UPDATE 0   (media — already dooh)
UPDATE 8   (user_saved_plans)
UPDATE 7   (saved_planner_plans)
NOTICE  PR0 post: media.dooh=577, digital_left=0, json_cart=0, json_plan=0
COMMIT
```

---

## Price diff (30 samples + controls)

**Artifacts**: `reports/pr0-preview-price-pre.json`, `reports/pr0-preview-price-post.json`, `reports/pr0-preview-price-diff.json`

| Item | Value |
|------|-------|
| Sample size | 30 media IDs (fixed between pre/post) |
| Composition (calendar_14d) | 20 dooh · 5 static · 5 mobile |
| Scenarios per media | `calendar_14d`, `wizard_14days`, `wizard_1month` |
| Total calc rows | 90 |
| Mismatches | **0** |

Partial-period / multi-option dooh media were included in the stratified draw (12 with `partial_period_rates` or `price_options` + 8 plain dooh).

---

## A2/A3 reference check (PR1a scope — informational)

These IDs are **not modified by PR0**. Checked whether preview saved data references them.

| Media ID | Name | In saved JSON? |
|----------|------|----------------|
| `cmrap3eo4000004jv8b2tt90v` | 신사 BK빌딩 LED | ✅ `user_saved_plans` — user `cmo6th4ef…` (mannote@naver.com) |
| `cmrn711g8000404ib3hct4qpy` | 성신여대입구역 전광판 | ❌ |
| `cmr9xedzi000a04layhba2ulc` | 택배카보드 | ❌ |
| `cmtd4wpic000004ic5oeqzdxq` | 지하철 사각기둥 | ❌ (not in preview DB) |

`sub_category` filter URLs are unaffected by PR0 (`media.type` only). PR1a category backfill will need the backup/rollback notes already captured in `docs/audit/pr1a-prep-decisions.md`.

---

## Saved plans QA

### Automated render-path (4 users)

Script: `scripts/audit/pr0-preview-saved-plans-qa.mjs`  
Report: `reports/pr0-preview-saved-plans-qa.json`

| User | Email | Items | PR0 issues |
|------|-------|-------|------------|
| `cmo9gp3p8…` | thinkad2021@naver.com | 10 | ⚠️ 1 item references deleted media `cmoxsc423…` (pre-existing) |
| `cmq23luq9…` | k2-hero@hanmail.net | 5 | ✅ |
| `cms5sp0mx…` | wkdworud23@gmail.com | 2 | ✅ |
| `cmrlui98i…` | halynnsong@gmail.com | 1 | ✅ |

All migrated `digital` → `dooh` snapshots parse via `normalizeCatalogMediaType`. Quote lines compute for resolvable media.

### Manual UI (required before prod)

Preview deployment:  
https://tkad-web-git-feat-pr0-media-type-dooh-mannote-6701s-projects.vercel.app

Sign in and open **내 플랜** (`/ko/my/plan`) for at least:

1. thinkad2021@naver.com  
2. k2-hero@hanmail.net  
3. wkdworud23@gmail.com  

Confirm cart items render (expect one stale row for thinkad2021 — 서면역 기둥 — unrelated to PR0).

> Agent could not complete browser login in this session (no QA credentials in env). DB + quote path validated above.

---

## Rollback (preview)

If needed, run in one transaction:

`scripts/migrations/rename-media-type-digital-to-dooh-rollback.sql`

On preview, `media` UPDATE would affect 577 rows; JSON companions 8 + 7 rows.

---

## Next steps

| Step | Owner | Status |
|------|-------|--------|
| PR #514 merge approval | Jaehan | ⏳ |
| Prod migration (combined SQL) | After separate approval | ⏳ blocked |
| Post-prod verification | Same gates as preview | ⏳ |
| PR1a kickoff | After prod PR0 complete | ⏳ |

---

## SQL fix commit note

The `jsonb_array_elements_text` fix is **local** in the working tree on `feat/pr0-media-type-dooh`. Should be committed to PR #514 before merge so prod migration uses corrected SQL.
