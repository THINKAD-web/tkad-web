# PR1b-2 Intermediate Gate — DTO + Label Centralization

**Date**: 2026-09-01  
**Branch**: `feat/pr1b2-nullable-transition`  
**Gate**: 2-2 complete — **awaiting approval before 2-1 (quote-calculator) and nullable schema**

---

## Vercel production status

| Deploy | SHA | Target | State |
|--------|-----|--------|-------|
| `dpl_mV2fN6Zz5gNB3mV2U6o2ZJhTmQSv` | `152489fe` (PR #518 hotfix) | production | **Ready** |
| Prior failed | `48d3b607` (PR #517) | production | ERROR (fixed by #518) |

Hotfix **#518** merged separately on main — not included in PR1b-2.

---

## PR1b-2+ completion gate (new — deploy before DB)

1. **Vercel production deploy Ready** (merge 후, DB 검증 **전**)
2. **Deployed SHA = merge commit SHA**
3. DB migration / data verification
4. Preview: `npm run build` (module-level import gaps are build-time, not typecheck)

---

## PR3 ↔ PR5 planner exposure (decision)

**Chosen**: PR3 seeds 23 online rows in catalog, but **planner exposure blocked until PR5** integrated `catalog_channel` branch. Avoids PR3–PR5 gap where online media appears in planner reports as 「기타」.

---

## 2-2 Deliverables

### DTO — `catalogChannel` on public surfaces

| Layer | Change |
|-------|--------|
| `MediaItem` | `catalogChannel?: CatalogChannel` |
| `prismaMediaToMediaItem()` | maps via `canonicalCatalogChannel()` |
| `MediaCatalogListItem` | `catalogChannel` + list DTO mappers |

### Label SSOT — `lib/media-display-labels.ts`

```typescript
resolveMediaDisplayLabels(item, locale) → { pill, subPill?, catalogChannel }
resolveMediaDisplayPill(item, locale)   → primary pill (never raw type slug)
mediaDisplayLabelHaystack(item)         → [ko, en] for search/index
formatMediaMetaLine(parts)              → `a · b` helper
```

**Rules**:

| Channel | Pill source |
|---------|-------------|
| `offline` | `displayModeLabel(type)` |
| `online` | `browseCategoryLabel(mediaMainCategory)` or 「온라인 광고」 |
| `network` | fixed 「네트워크/패키지」 |

**Explicitly not in scope** (label track): raw `mobile` token on cards, `typeLabels.dooh = "DOOH"`.

### Migrated call sites (22 public/UI paths)

Browse/list/detail/search/SEO/compare/quote/planner thumb/onboarding/proposal PDF meta.

**Intentionally unchanged** (not public display-label paths):

| File | Reason |
|------|--------|
| `admin/.../quick-add/page.tsx` | Admin form: display-mode code → label for `{dooh,static,mobile}` picker |
| `lib/pricing-guide-stats.ts` | Offline type-key aggregation (not per-item pill) |
| `lib/media-data.ts` `typeLabels` export | SSOT for admin + legacy refs; public surfaces no longer index by `type` |

---

## Site count — before vs after centralization

| Bucket | Step 1 (pre 2-2) | After 2-2 | Notes |
|--------|------------------|-----------|-------|
| Public `typeLabels[media.type]` pill sites | **~20** | **0** | All → `resolveMediaDisplayPill` |
| Search haystack `typeLabels` | 4 | **0** | → `mediaDisplayLabelHaystack` |
| High-risk nullable/type/price (Step 1 list) | **18** | **~8 file-groups** | Label subset closed; see below |
| Admin display-mode picker | 1 | 1 | Out of scope |

### Remaining high-risk work (phases 2-1 → 2-7)

| # | Site / area | Phase | `type=null` risk |
|---|-------------|-------|------------------|
| 1 | `lib/quote-calculator.ts:131` | **2-1** (isolated commit) | Silent `dooh` default |
| 2 | `lib/plan-cart-report/build-report.ts:71` | 2-6 | `.trim()` crash |
| 3 | `lib/insights/market-dashboard-data.ts:268` | 2-3/4 | `?? "digital"` bucket |
| 4 | `lib/media-quick-add.ts:622` | 2-5 | `.trim()` crash |
| 5 | Admin POST / CSV / bulk / duplicate gates | 2-5 | Cannot persist online |
| 6 | Prisma `Media.type String?` + `MediaItem.type` | 2-3 | Type system |
| 7 | `Media.price` nullable + display adapters | 2-4 | SQL NULL vs 0 |
| 8 | `inferOfflineFromDisplayType` write path | 2-5 | Channel inference |
| 9 | DB/API invariants | 2-6 | online→type NULL, etc. |
| 10 | A7 cart/plan `catalogChannel` snapshot | 2-7 | JSON backfill N/A |

**Already fixed (PR1b-1)**: `media-map-page-client.tsx:858` `?? "digital"`.

**Verdict**: Centralization reduced label scatter from ~24 sites to **0 public pill sites**. Nullable transition remains **~8–10 bounded work items** — proceed with planned order.

---

## Planner 「조용한 제외」— behavior spec for PR5

**Definition**: Online media (`catalog_channel='online'`, `type IS NULL`) is **silently excluded** from OOH category-scoped planner pools until the integrated planner reads `catalog_channel`.

| Mechanism | Behavior when `type=null`, `catalogChannel='online'` |
|-----------|------------------------------------------------------|
| `resolvePlannerMediaKind()` | Returns `null` (no dooh/static/mobile from type) |
| `matchesPlannerCategory(item, dooh\|static\|mobile)` | **false** — item skipped in category filter |
| Recommend / brief pools | No crash; item absent from OOH-scoped results |
| Report category key | **`기타`** bucket via `plannerReportCategoryKey()` |
| Engine calc | Continues with `MEDIA_TYPE_UNKNOWN` warning (existing) |

**Not a crash, not a mislabel** — intentional exclusion until PR5 adds:

```typescript
if (item.catalogChannel === 'online') { /* online browse branch */ }
```

This document's definition is the **acceptance spec** for PR5 integrated planner.

---

## Tests

```
node --import tsx --test lib/media-display-labels.test.ts lib/catalog-channel.test.ts
→ 6/6 pass
```

---

## Next steps (blocked on approval)

1. **Hotfix main**: `home-landing-media-grid.ts` import → restore prod Ready
2. **2-1** `quote-calculator.ts:131` — separate commit, explicit error not dooh fallback
3. **2-3** type nullable → **2-4** price → **2-5** write path → **2-6** invariants → **2-7** A7
4. Dry-run report → Preview → rollback → validation → merge → prod

**Do not seed 23 online rows** (PR3).
