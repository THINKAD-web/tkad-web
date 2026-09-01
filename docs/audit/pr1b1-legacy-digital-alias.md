# PR1b-1 — Legacy `mainCategory=digital` Alias Decision

**Date**: 2026-09-01  
**Status**: Decided for PR1b-1 — **no main-level alias**

---

## Background

Browse bucket `digital` (「디지털/온라인」) was retired in PR1b-1 and split into six online mains:

`search` · `display` · `video` · `sns` · `message` · `local`

Prod rows with `media_main_category='digital'`: **0**.

---

## Question

Should `?mainCategory=digital` (bookmarks, indexed URLs) map to one of the six mains?

Initial implementation mapped `digital` → `search`. **Rejected** after review.

---

## Why `digital → search` is wrong

| Factor | Detail |
|--------|--------|
| Original meaning | `digital` = **entire online bucket**, not search-only |
| User expectation | Clicking 「디지털/온라인」 showed all online types (SNS, display, …) |
| After 6-way split | `search` is **1/6** of that scope — user misses the other five |
| Prod data | 0 rows today — no urgent breakage, but wrong semantics for PR3+ |

---

## Decision (PR1b-1)

**No main-level alias.**

| Legacy input | Resolution |
|--------------|------------|
| `mainCategory=digital` | **No main filter** (`null`) — full OOH catalog (online 0 rows) |
| `mainCategory=online` | Same — retired generic token |
| `subCategory=search_ad` etc. | **Sub-level alias retained** → maps to specific online main (unambiguous) |

**Not chosen (deferred to PR4):**

- `digital` → `catalog_channel=online` browse mode (all six mains aggregated). Correct semantics, needs facet UI work.

---

## PR3 follow-up

When 23 online rows exist:

1. Consider PR4 facet: 「온라인 광고」 top-level chip → `catalog_channel=online` without picking one main.
2. Optionally 301 `?mainCategory=digital` → that aggregated view.
3. Do **not** silently narrow to `search`.

---

## References

- `lib/online-browse-mains.ts` — `normalizeBrowseMainId()` returns `null` for `digital`/`online`
- `lib/media-browse-categories.ts` — `LEGACY_DIGITAL_SUB_TO_MAIN` for old subs only
