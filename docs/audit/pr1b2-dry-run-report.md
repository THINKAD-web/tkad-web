# PR1b-2 Dry-Run Report — Nullable type/price + invariants

**Date**: 2026-09-02  
**Branch**: `feat/pr1b2-nullable-transition`  
**Scope**: 2-3 → 2-4 → 2-6 → 2-5 → 2-7 (after 2-2 + quote-calculator)

---

## Local verification (pre-Preview)

| Check | Result |
|-------|--------|
| `npm run build` | **Pass** (repeat until clean — caught `browseCategoryLabel`, broken imports, `quote-page-client` directive) |
| Unit tests | 19/19 pass (`quote-calculator`, `catalog-channel`, `media-catalog-invariants`, `media-display-labels`) |
| Prisma migration | `20260902103000_pr1b2_nullable_type_price` |

---

## Schema change

```sql
ALTER TABLE media ALTER COLUMN type DROP NOT NULL;
ALTER TABLE media ALTER COLUMN price DROP NOT NULL;
-- CHECK: online → type NULL, price NULL
-- CHECK: offline → type NOT NULL, price NOT NULL
```

Forward/rollback: `scripts/migrations/pr1b2-nullable-forward.sql`, `pr1b2-nullable-rollback.sql`

---

## Phase summary

| Phase | Deliverable |
|-------|-------------|
| **2-3** | `Media.type String?`, `MediaItem.type: string \| null`, Prisma migration |
| **2-4** | `Media.price Int?`, `MediaItem.price: number \| null` |
| **2-6** | `lib/media-catalog-invariants.ts` + DB CHECK constraints |
| **2-5** | `inferOfflineFromDisplayType()` + write-path `type` pass-through (6 admin create paths) |
| **2-7** | `PlanCartItem.catalogChannel` snapshot (A7) |

**Order note**: 2-6 before 2-5 so write paths trust invariant SSOT.

---

## High-risk fixes included

| Site | Fix |
|------|-----|
| `quote-calculator.ts:131` | **Step 4** — throw + unit test (separate commit) |
| `build-report.ts:71` | `catalog.type?.trim()` null-safe |
| `market-dashboard-data.ts:268` | skip null type (no `digital` bucket) |
| `competitive-dashboard-data.ts` | null type → `unknown` |
| `media-quick-add.ts:622` | `row.type?.trim()` |
| Admin POST | channel-aware `resolveMediaCatalogWriteShape()` |

---

## DB dry-run (run on Preview before prod)

```bash
DATABASE_URL=... node scripts/audit/pr1b2-nullable-dry-run.mjs
DATABASE_URL=... node scripts/audit/pr1b2-nullable-dry-run.mjs --test-exception
```

Expected prod pre-migration:
- `offline_null_type = 0`, `offline_null_price = 0`
- `online = 0` rows
- `wouldPassOfflineInvariants = true`

Post-migration forward SQL: `scripts/migrations/pr1b2-nullable-forward.sql`

---

## Preview checklist (next)

1. Vercel Preview deploy **Ready** + SHA match
2. `npm run build` on Preview (CI)
3. DB dry-run on Preview DB
4. Rollback SQL dry-run on Preview branch DB
5. Re-apply forward SQL
6. Manual: browse list, quote wizard, plan cart add (offline media)

---

## Not in this PR

- 23 online row seed (PR3)
- Planner `catalog_channel` branch (PR5)
- Label track (`mobile` raw token, DOOH casing)
