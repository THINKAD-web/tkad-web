# PR1b-2 ↔ PR3 — Online quote safety net & front gate

## Pairing

| Track | Role | When |
|-------|------|------|
| **PR1b-2** | **Safety net** — if an online / unpriceable row enters the quote wizard, never show ₩0 | Merge with nullable schema |
| **PR3** | **Front gate** — online media must not be selectable on any surface that computes quote totals until PR2 `BudgetPricing` ships | Seed 23 online rows + block wizard/planner exposure |

PR1b-2 alone is not enough: PR3 seeds make online media choosable in the wizard while PR5 is still far away. PR3 must extend the existing **“planner exposure blocked until PR5”** rule to **all price-computing surfaces**, including the **quote wizard**.

## PR1b-2 wizard behavior (implemented)

- `isQuoteWizardPriceOnInquiry()` — `type` missing, `price` null, or resolved unit ≤0
- Line: **「가격 문의」** (same rule family as `formatCatalogPriceFieldWon`)
- **Excluded from unit/total sums**; mixed carts show `quote.partialTotalNotice`
- Server paths (`calculateQuote` / `calculateQuoteFromMediaIds`) still **throw** — invalid API callers only

## PR3 checklist (for PR3 instruction doc)

1. **Quote wizard catalog filter** — exclude `catalog_channel = online` (and any row without billable display type) from selectable catalog until BudgetPricing.
2. **Planner** — keep blocked until PR5 (already decided).
3. **Media compare & media detail quote panels** — `lib/compare-quote.ts` (`calculateMediaQuoteByDays`, `calculateMediaQuoteFromOption`) and `lib/media-detail-quantity.ts` **do not call** `calculateQuote` / `BudgetPricing`. PR3 must verify behavior when an online row appears on:
   - `/compare` (`components/compare/compare-quote-calculator.tsx`)
   - 매체 상세 스티키 견적 (`components/media-detail/media-detail-sticky-quote-panel.tsx`, `media-quote-calculator.tsx`)
   - Expected until PR5: **no numeric ₩0** — either block selection, show 「가격 문의」 / inquiry label, or exclude from compare set (same failure class as pre-PR1b-2 wizard ₩0).
4. **ISR / cache after seed** — catalog list ISR is **`revalidate = 3600`** on `app/[locale]/(site)/media/page.tsx` and `app/api/public/media-catalog/route.ts` (not 86400). Quote/budget-tool pages use **86400**. After seeding 23 online rows:
   - Call `revalidateMediaCachesBulk()` (or equivalent) **immediately after seed**
   - Verification order: seed → **cache invalidate** → hit `/api/public/media-catalog` → confirm count → UI — do not conclude “seed failed” when the row is only cache-stale (Preview smoke missed catalog for this reason).

## Preview lesson (2026-09-02)

Smoke online row inserted post-deploy did not appear in `/api/public/media-catalog` (820 offline-only cached response) until a fresh deployment path + DB insert order was understood. PR3 validation must include explicit cache busting.
