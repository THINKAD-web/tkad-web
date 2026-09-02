# PR3 Step 3 — Preview validation report

**Date:** 2026-09-03  
**PR:** [#522](https://github.com/THINKAD-web/tkad-web/pull/522)  
**Preview deployment:** `https://tkad-1orbb9dik-mannote-6701s-projects.vercel.app` (SHA `5680ed35`+)  
**Artifact:** `reports/pr3-preview/step3-validation-report.json`

---

## Seed execute (Preview)

| Step | Result |
|------|--------|
| Dry-run (slug conflicts) | **0 conflicts** |
| `--execute` insert 23 media + spec | **pass** |
| Rollback `--rollback --execute` | **23 removed** |
| Reapply `--execute` | **23 restored** |
| DB `catalog_channel=online` | **23** |
| DB `media_online_spec` | **23** |

Script fix in `b2ae5b30`: Preview env (`.env.preview.local`), split inserts, 120s transaction timeout.

---

## Cache → API → UI order

1. **Seed** on Preview Neon (shared with Preview deployments)
2. **Deploy** PR3 branch (gates + ISR paths live)
3. **API** `GET /api/public/media-catalog` → **843 total, 23 online** (all seed slugs present)
4. **UI** spot-check 5 inquiry slugs — sticky **「문의하기」**, no sticky 「견적 받기」

Note: `revalidateMediaCachesBulk()` from the CLI seed script is a no-op outside Next runtime; **fresh Preview deploy** picked up DB changes. Post-deploy API count confirmed all 23 refs visible.

---

## Gate verification

| Check | Result |
|-------|--------|
| **Wizard** — online excluded from catalog list | **pass** |
| **Detail CTA B** | **pass** — 5 sample slugs |
| **compare-quote** inquiry | **pass** |
| **Planner handoff** `?addMedia=` | **pass** — `blockedOnline` |
| **Plan cart handoff** | **pass** |
| **Browse plan cart** `catalogChannel` | **pass** |

---

## 3-account saved data regression

| Account | Result |
|---------|--------|
| thinkad2021 | pre-existing 1 missing media — not PR3 |
| k2-hero | pass |
| wkdworud23 | pass (empty plan) |

PR3 regression: **no online in legacy snapshots** — pass.
