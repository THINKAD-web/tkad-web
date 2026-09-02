# PR3 Step 2 — Dry-run report

**Branch:** `feat/pr3-online-media-seed`  
**Date:** 2026-09-03  
**Scope:** Shared pricing gate (`lib/pricing-unavailable.ts`) + front gates + seed script (no prod execute)

---

## Executive summary

Step 2 implements **one SSOT helper module** instead of per-surface `catalog_channel` checks. All four money/selection surfaces delegate to `lib/pricing-unavailable.ts`. Seed migration script is ready for Preview `--execute`; prod untouched in this step.

**Core finding (from Step 1, preserved in Step 2 design):** PR2 export 422 only covers server `calculateQuote` paths. Wizard UI, `compare-quote`, planner client totals, and detail sticky **bypass** that engine — Step 2 gates those bypass routes through the shared helper.

---

## Shared helper wiring matrix

| Surface | Helper(s) | File(s) |
|---------|-----------|---------|
| **Quote wizard** — selection block | `isQuoteWizardSelectableMedia()` | `quote-page-client.tsx` (`toggleMedia`, URL `?media=` init filter) |
| **Quote wizard** — line/total inquiry | `isPricingUnavailable()` via `isQuoteWizardPriceOnInquiry()` | `lib/quote-wizard-pricing.ts` |
| **Compare** — line cost + totals | `isPricingUnavailable()`, `formatCompareQuoteLineCost()` | `lib/compare-quote.ts`, `compare-quote-calculator.tsx` |
| **Detail sticky** — est. cost | `isPricingUnavailable()` via `formatMediaCostEstimateShort(..., media)` | `media-detail-sticky-quote-panel.tsx`, `lib/media-display-currency.ts` |
| **Detail modal / sticky CTA** | `isOnlineCatalogMedia()` | `media-detail-quote-modal.tsx` (CTA **B**: primary 「문의하기」), sticky panel (quote/planner hidden) |
| **Planner (3-step brief)** — catalog + handoff | `isQuoteWizardSelectableMedia()`, `isOnlineCatalogMedia()` | `brief-step-two.tsx`, `brief-quick-rank.tsx`, `lib/planner/brief/handoff.ts`, `brief-flow-client.tsx` |
| **Plan cart** — add block | `canAddMediaToPlanCart()` | `lib/plan-cart.ts`, `plan-cart-add-button.tsx`, `plan-cart-toggle-button.tsx` |

**Intentional split (same module, two behaviors):**

- `isPricingUnavailable()` — money display (online **or** offline unpriceable → 「가격 문의」)
- `isOnlineCatalogMedia()` / `isQuoteWizardSelectableMedia()` / `canAddMediaToPlanCart()` — **online-only** selection block (offline unpriceable still wizard-selectable with inquiry label per PR1b-2)

No ad-hoc `catalog_channel === 'online'` checks were added outside `lib/pricing-unavailable.ts`.

---

## `planCartItemFromCatalog` reachability (1-4)

**Question:** After front gates, is browse → plan cart still reachable without `catalogChannel` snapshot?

**Answer: Yes — browse cards still expose 「담기」 for online rows (browse is intentionally visible).**  
Without `catalogChannel` on cart items, `addToPlanCart()` could not call `canAddMediaToPlanCart()`.

**Step 2 fix (after verification, not preemptive):**

1. `HomeCatalogMediaItem.catalogChannel` optional field
2. `mapMediaItemToHomeCatalog()` passes through `catalogChannel`
3. `planCartItemFromCatalog()` sets `catalogChannel` → `addToPlanCart()` returns `{ ok: false, reason: "online_blocked" }`

Detail page already used `planCartItemFromMediaItem()` (includes `catalogChannel`) — blocked before this browse-path fix.

---

## ISR TTL (1-5)

| Route / API | `revalidate` | Notes |
|-------------|--------------|-------|
| `app/[locale]/(site)/media/page.tsx` | **3600** | Catalog list shell |
| `app/api/public/media-catalog/route.ts` | **3600** | Public catalog API |
| `app/[locale]/(site)/page.tsx`, planner, pricing, … | **3600** | Home / planner ISR |
| `app/[locale]/(site)/quote/page.tsx` | **86400** | Quote wizard page shell |
| `app/[locale]/(site)/budget-tool/page.tsx` | **86400** | Budget tool |

**Conclusion:** Gate doc `pr1b2-pr3-online-quote-gate.md` incorrectly stated list TTL **86400**. **Code has been 3600** for catalog list/API — doc corrected in Step 2. This is **documentation drift**, not a recent deploy change; other cache assumptions (admin `revalidateMediaCachesBulk`, tag split) remain valid.

**Post-seed:** seed script calls `revalidateMediaCachesBulk(23 refs)` — required regardless of ISR TTL.

---

## Seed migration dry-run

**Script:** `scripts/migrations/pr3-online-media-seed.mts`  
**Data:** `prisma/seed-data/online-media-2026-09.json` (23 rows, deterministic ids)

```bash
npx tsx scripts/migrations/pr3-online-media-seed.mts          # dry-run JSON report
npx tsx scripts/migrations/pr3-online-media-seed.mts --execute # Preview only (Step 3)
npx tsx scripts/migrations/pr3-online-media-seed.mts --rollback --execute
```

Dry-run checks: slug conflicts, id presence, then single-transaction insert `media` + `media_online_spec` + cache bust.

---

## Tests run (Step 2)

- `lib/pricing-unavailable.test.ts`
- `lib/planner/brief/__tests__/handoff.test.ts` (+ online blocked case)
- `npm run build` (typecheck + Next build)

---

## Not in Step 2

- Prod seed execute (Step 3 Preview validation)
- PR5 integrated planner online pricing engine
- Neon backup (optional ops)
