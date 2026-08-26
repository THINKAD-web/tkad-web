# /ko/media ISR shell — PART O item 3

**Branch**: `perf/media-page-isr-shell`  
**Date**: 2026-08-26 KST

## Problem

`app/[locale]/(site)/media/page.tsx` awaited `searchParams` and ran the full catalog pipeline on every request:

- `fetchFilteredMediaCatalogItems` + `countPublicMediaCatalog` (~812 active rows in memory, then slice 30)
- Despite `export const revalidate = 3600`, Next.js treats pages that use `searchParams` as **dynamic**
- Production: `cache-control: no-store`, Vercel edge **always MISS** ([perf-media-list-diagnosis-20260824.md](./perf-media-list-diagnosis-20260824.md))

Warm TTFB was **0.6–1.2s** per visit; cold Neon + pipeline could reach **10–60s**.

## Change

| Layer | Before | After |
|-------|--------|-------|
| `media/page.tsx` | SSR catalog from URL filters | Static ISR shell (`revalidate=3600`), no `searchParams` |
| `MediaSearchPage` | Skip mount fetch when SSR key matches URL | Skip only when SSR provided rows (`initialMedia.length > 0`); else fetch on mount |
| `media/layout.tsx` | ItemList JSON-LD (unchanged) | Unchanged — SEO preserved |
| Filters | URL `?q=&sort=&…` | Unchanged — client reads `useSearchParams`, fetches `/api/public/media` |

Default `/ko/media` (no query) now serves a **cached HTML shell**; first paint shows skeleton until the client API returns (~0.7–1.3s warm, same as prior API-only path).

## Expected improvement

| Metric | Before (dynamic SSR) | After (ISR shell + client fetch) |
|--------|----------------------|----------------------------------|
| Edge cache (`/ko/media`) | MISS every request | **HIT** within 1h revalidate window |
| Server TTFB (warm, cached shell) | 0.6–1.2s (full catalog pipeline) | **~50–200ms** (static shell only; layout JSON-LD still ISR-cached via `fetchPublicMediaCatalog`) |
| Server work per repeat visit | Full browse pipeline × every URL variant | **Shell once/hour**; filter changes = client `/api/public/media` only |
| HTML payload | ~934 KB (30 cards + RSC) | **Smaller shell** — cards load after hydration |
| Filter UX | Instant SSR cards on first paint | Brief skeleton → same cards via API (~same as changing filters today) |
| SEO | layout JSON-LD + metadata | **Unchanged** |

### Measurement commands

```bash
# Shell TTFB — expect lower after deploy + warm cache
curl -sI "https://tkad.co.kr/ko/media" | grep -iE 'cache-control|x-vercel-cache|age'

curl -s -o /dev/null -w "ttfb:%{time_starttransfer}s total:%{time_total}s\n" \
  "https://tkad.co.kr/ko/media"

# Client catalog path (unchanged)
curl -s -o /dev/null -w "api:%{time_total}s\n" \
  "https://tkad.co.kr/api/public/media?limit=30&sort=popular"
```

Local build verification:

```bash
pnpm build 2>&1 | rg '/media|Dynamic|Static'
# Expect /[locale]/media as static/ISR, not ƒ (dynamic)
```

## Trade-offs

- **First contentful paint**: default view no longer ships 30 SSR cards; users see skeleton until API responds (~1s warm). Filter changes behave as before.
- **Crawlers without JS**: still get metadata + JSON-LD from layout; item cards require JS (acceptable for interactive browse UI).

## Files touched

- `app/[locale]/(site)/media/page.tsx` — ISR shell, drop `searchParams` + server catalog fetch
- `components/media/media-search-page.tsx` — mount fetch when no SSR rows; initial `loading` when empty
